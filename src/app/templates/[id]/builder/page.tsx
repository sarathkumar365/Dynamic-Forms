import { prisma } from "@/lib/prisma";
import BuilderShell from "@/components/builder/BuilderShell";
import { resolveOwner } from "@/lib/owner";

export const dynamic = 'force-dynamic'

export default async function FormBuilder({
  params,
}: {
  params: { id: string };
}) {
  // Ensure ownership and fetch full tree
  const owner = await resolveOwner();
  const form = await prisma.form.findFirst({
    where: { id: params.id, ownerId: owner.id },
    include: {
      pages: { include: { sections: { include: { questions: true } } } },
      rules: true,
    },
  });
  if (!form) return <div>Not found</div>;

  // Build FormSpec shape for the builder
  const idToKey: Record<string, string> = {};
  form.pages.forEach((p) =>
    p.sections.forEach((s) =>
      s.questions.forEach((q) => {
        if (q.key) idToKey[q.id] = q.key;
      })
    )
  );
  const remapVisibleWhen = (vw: any) => {
    if (!vw) return vw;
    return vw.map((clause: any) => {
      const remapGroup = (group: any[]) =>
        group.map((cond: any) => ({ ...cond, field: idToKey[cond.field] || cond.field }));
      if (clause.all) return { ...clause, all: remapGroup(clause.all) };
      if (clause.any) return { ...clause, any: remapGroup(clause.any) };
      return clause;
    });
  };
  const initialSpec = {
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

  return (
    <div className="p-6">
      <BuilderShell initialSpec={initialSpec as any} initialPreviewOpen={true} />
    </div>
  );
}
