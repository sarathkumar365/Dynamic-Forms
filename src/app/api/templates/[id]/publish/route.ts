import { prisma } from "@/lib/prisma";
import { resolveOwner } from "@/lib/owner";
import { compileFormSpec } from "@/lib/formspec/compile";
import { validateFormSpec } from "@/lib/formspec/validators";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const owner = await resolveOwner();
  const form = await prisma.form.findFirst({
    where: { id: params.id, ownerId: owner.id },
    include: {
      pages: {
        include: {
          sections: {
            include: {
              questions: true,
            },
          },
        },
      },
      rules: true,
    },
  });
  if (!form) return new Response("Not found", { status: 404 });

  // Defensive mapping: ensure all arrays are defined
  // Build a lookup of question IDs to keys
  const idToKey: Record<string, string> = {};
  (form.pages ?? []).forEach((page: any) =>
    (page.sections ?? []).forEach((section: any) =>
      (section.questions ?? []).forEach((q: any) => {
        if (q.key) idToKey[q.id] = q.key;
      })
    )
  );
  const remapVisibleWhen = (vw: any) => {
    if (!vw) return vw;
    return vw.map((clause: any) => {
      const remapGroup = (group: any[]) =>
        group.map((cond: any) => ({
          ...cond,
          field: idToKey[cond.field] || cond.field,
        }));
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
    pages: (form.pages ?? []).map((page: any) => ({
      id: page.id,
      title: page.title,
      sections: (page.sections ?? []).map((section: any) => ({
        id: section.id,
        title: section.title,
        questions: (section.questions ?? []).map((q: any) => ({
          id: q.id,
          key: q.key,
          label: q.label,
          type: q.type,
          required: q.required,
          help: q.help,
          placeholder: q.placeholder,
          options: q.options,
          visibleWhen: remapVisibleWhen(q.visibleWhen),
        })),
      })),
    })),
    rules: (form.rules ?? []).map((rule: any) => ({
      id: rule.id,
      description: rule.description,
      when: rule.when,
      then: rule.then,
    })),
  };

  const v = validateFormSpec(spec);
  if (!v.ok) {
    return new Response(
      JSON.stringify({ error: "Invalid FormSpec", details: v.errors }),
      { status: 400 }
    );
  }

  const { schema, uiSchema } = compileFormSpec(spec);

  if (!schema?.properties || Object.keys(schema.properties).length === 0) {
    return new Response(
      JSON.stringify({ error: "Form has no questions to publish." }),
      { status: 400 }
    );
  }

  const pub = await prisma.publication.create({
    data: {
      formId: form.id,
      title: `${form.title}`,
      schema,
      uiSchema,
    },
  });

  // Optionally update form metadata or timestamp if needed

  return Response.json(pub);
}
