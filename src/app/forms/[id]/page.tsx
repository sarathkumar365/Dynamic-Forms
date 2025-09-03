import { prisma } from "@/lib/prisma";
import { resolveOwner } from "@/lib/owner";
import { notFound } from "next/navigation";
import Link from "next/link";
import FormDetailClient from "@/components/forms/FormDetailClient";
import { compileFormSpec } from "@/lib/formspec/compile";
import FormPreviewClient from "@/components/forms/FormPreviewClient";

export default async function FormPage({ params }: { params: { id: string } }) {
  const owner = await resolveOwner();
  const form = await prisma.form.findFirst({
    where: { id: params.id, ownerId: owner.id },
    include: {
      publications: true,
      pages: { include: { sections: { include: { questions: true } } } },
      rules: true,
    },
  });
  if (!form) return notFound();
  // Build FormSpec for preview
  const idToKey: Record<string, string> = {};
  form.pages.forEach((p) => p.sections.forEach((s) => s.questions.forEach((q) => { if (q.key) idToKey[q.id] = q.key; })));
  const remapVisibleWhen = (vw: any) => {
    if (!vw) return vw;
    return vw.map((clause: any) => {
      const remapGroup = (group: any[]) => group.map((cond: any) => ({ ...cond, field: idToKey[cond.field] || cond.field }));
      if (clause.all) return { ...clause, all: remapGroup(clause.all) };
      if (clause.any) return { ...clause, any: remapGroup(clause.any) };
      return clause;
    });
  };
  const spec = {
    version: "1.0" as const,
    id: form.id,
    title: form.title,
    description: form.description ?? undefined,
    pages: form.pages.map((p) => ({
      id: p.id,
      title: p.title,
      sections: p.sections.map((s) => ({
        id: s.id,
        title: s.title,
        questions: s.questions.map((q) => ({
          id: q.id,
          key: q.key ?? undefined,
          label: q.label,
          type: q.type as any,
          required: q.required,
          help: q.help ?? undefined,
          placeholder: q.placeholder ?? undefined,
          options: q.options as any,
          visibleWhen: remapVisibleWhen(q.visibleWhen),
        })),
      })),
    })),
    rules: form.rules.map((r) => ({ id: r.id, description: r.description ?? undefined, when: r.when as any, then: r.then as any })),
  };
  const compiled = compileFormSpec(spec as any);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{form.title}</h1>
        <div className="flex items-center gap-2">
          <Link className="btn" href={`/templates/${form.id}/builder`}>Edit in Builder</Link>
        </div>
      </div>

      <FormDetailClient form={form} />

      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">Live Preview</div>
        </div>
        <FormPreviewClient compiled={compiled as any} />
      </div>
    </div>
  );
}
