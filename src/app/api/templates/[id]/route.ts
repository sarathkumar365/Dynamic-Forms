import { prisma } from "@/lib/prisma";
import { resolveOwner } from "@/lib/owner";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const owner = await resolveOwner();
  const item = await prisma.form.findFirst({
    where: { id: params.id, ownerId: owner.id },
    include: { pages: true, rules: true },
  });
  if (!item) return new Response("Not found", { status: 404 });
  return Response.json(item);
}

// export async function PUT(req: Request, { params }: { params: { id: string }}) {
//   const owner = await resolveOwner()
//   const body = await req.json()
//   const updated = await prisma.template.update({
//     where: { id: params.id },
//     data: {
//       name: body.name,
//       description: body.description ?? null,
//       schema: typeof body.schema === 'string' ? body.schema : JSON.stringify(body.schema ?? {}),
//       uiSchema: body.uiSchema ? (typeof body.uiSchema === 'string' ? body.uiSchema : JSON.stringify(body.uiSchema)) : null,
//       version: { increment: 1 }
//     }
//   })
//   return Response.json(updated)
// }

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const owner = await resolveOwner();
  const body = await req.json();
  // Transactional update: delete child entities, then update form and recreate children
  const updated = await prisma.$transaction(async (tx) => {
    await tx.page.deleteMany({ where: { formId: params.id } });
    await tx.rule.deleteMany({ where: { formId: params.id } });
    const form = await tx.form.update({
      where: { id: params.id },
      data: {
        title: body.title,
        description: body.description ?? null,
        pages: { create: body.pages },
        rules: body.rules ? { create: body.rules } : undefined,
      },
    });
    return form;
  });
  return Response.json(updated);
}
