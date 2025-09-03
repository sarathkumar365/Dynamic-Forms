import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveOwner } from "@/lib/owner";

// GET all forms for the owner
export async function GET() {
  const owner = await resolveOwner();
  const forms = await prisma.form.findMany({
    where: { ownerId: owner.id },
    orderBy: { updatedAt: "desc" },
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
  // Assemble FormSpec objects for FE
  const items = forms.map((form) => {
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
    return {
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
  });
  return NextResponse.json(items);
}

// POST: create a new form
export async function POST(req: Request) {
  const owner = await resolveOwner();
  const body = await req.json();
  const { title, description, pages, rules } = body;
  if (!title || !pages) {
    return NextResponse.json(
      { error: "title and pages are required" },
      { status: 400 }
    );
  }
  // Create form
  const form = await prisma.form.create({
    data: {
      ownerId: owner.id,
      title,
      description,
      pages: {
        create: pages.map((page: any, pageOrder: number) => ({
          title: page.title,
          order: pageOrder,
          sections: {
            create: page.sections.map((section: any, sectionOrder: number) => ({
              title: section.title,
              order: sectionOrder,
              questions: {
                create: section.questions.map(
                  (q: any, questionOrder: number) => ({
                    key: q.key,
                    label: q.label,
                    type: q.type,
                    required: q.required ?? false,
                    help: q.help,
                    placeholder: q.placeholder,
                    options: q.options,
                    visibleWhen: q.visibleWhen,
                    order: questionOrder,
                  })
                ),
              },
            })),
          },
        })),
      },
      rules: {
        create:
          rules?.map((rule: any) => ({
            description: rule.description,
            when: rule.when,
            then: rule.then,
          })) ?? [],
      },
    },
  });
  return NextResponse.json({ id: form.id });
}
