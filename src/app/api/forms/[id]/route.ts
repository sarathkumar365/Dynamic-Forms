import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveOwner } from "@/lib/owner";

// GET single form by id
export async function GET(_: Request, { params }: { params: { id: string } }) {
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
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Assemble FormSpec object for FE
  // Build a lookup of question IDs to keys
  const idToKey: Record<string, string> = {};
  form.pages.forEach((page) =>
    page.sections.forEach((section) =>
      section.questions.forEach((q) => {
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
    id: form.id,
    title: form.title,
    description: form.description,
    pages: form.pages.map((page) => ({
      id: page.id,
      title: page.title,
      sections: page.sections.map((section) => ({
        id: section.id,
        title: section.title,
        questions: section.questions.map((q) => ({
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
    rules: form.rules.map((rule) => ({
      id: rule.id,
      description: rule.description,
      when: rule.when,
      then: rule.then,
    })),
  };
  return NextResponse.json(spec);
}

// PUT: update form by id
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const owner = await resolveOwner();
  const body = await req.json();
  const { title, description, pages, rules } = body;
  if (!title || !pages) {
    return NextResponse.json(
      { error: "title and pages are required" },
      { status: 400 }
    );
  }
  // Transaction: delete child entities, then update form and recreate children
  const updated = await prisma.$transaction(async (tx) => {
    // Delete child entities
    await tx.rule.deleteMany({ where: { formId: params.id } });
    const pageIds = (
      await tx.page.findMany({
        where: { formId: params.id },
        select: { id: true },
      })
    ).map((p) => p.id);
    if (pageIds.length) {
      const sectionIds = (
        await tx.section.findMany({
          where: { pageId: { in: pageIds } },
          select: { id: true },
        })
      ).map((s) => s.id);
      if (sectionIds.length) {
        await tx.question.deleteMany({
          where: { sectionId: { in: sectionIds } },
        });
        await tx.section.deleteMany({ where: { id: { in: sectionIds } } });
      }
      await tx.page.deleteMany({ where: { id: { in: pageIds } } });
    }
    // Update form
    const form = await tx.form.update({
      where: { id: params.id, ownerId: owner.id },
      data: { title, description },
    });
    // Recreate child entities
    for (const [pageOrder, page] of pages.entries()) {
      const dbPage = await tx.page.create({
        data: {
          title: page.title,
          formId: form.id,
          order: pageOrder,
        },
      });
      for (const [sectionOrder, section] of (page.sections ?? []).entries()) {
        const dbSection = await tx.section.create({
          data: {
            title: section.title,
            pageId: dbPage.id,
            order: sectionOrder,
          },
        });
        for (const [questionOrder, q] of (section.questions ?? []).entries()) {
          await tx.question.create({
            data: {
              key: q.key,
              label: q.label,
              type: q.type,
              required: q.required ?? false,
              help: q.help,
              placeholder: q.placeholder,
              options: q.options,
              visibleWhen: q.visibleWhen,
              sectionId: dbSection.id,
              order: questionOrder,
            },
          });
        }
      }
    }
    for (const rule of rules ?? []) {
      await tx.rule.create({
        data: {
          description: rule.description,
          when: rule.when,
          then: rule.then,
          formId: form.id,
        },
      });
    }
    return form;
  });
  return NextResponse.json({ id: updated.id });
}

// DELETE: remove form by id
export async function DELETE(
  _: Request,
  { params }: { params: { id: string } }
) {
  const owner = await resolveOwner();
  await prisma.form.delete({ where: { id: params.id, ownerId: owner.id } });
  return NextResponse.json({ ok: true });
}
