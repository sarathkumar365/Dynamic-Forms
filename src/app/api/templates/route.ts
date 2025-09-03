import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveOwner } from "@/lib/owner";

export async function GET() {
  const owner = await resolveOwner();
  const items = await prisma.form.findMany({
    where: { ownerId: owner.id },
    orderBy: { updatedAt: "desc" },
  });
  return Response.json(items);
}

// export async function POST(req: Request) {
//   const owner = await resolveOwner()
//   const body = await req.json()
//   const created = await prisma.template.create({
//     data: {
//       ownerId: owner.id,
//       name: body.name,
//       description: body.description ?? null,
//       schema: typeof body.schema === 'string' ? body.schema : JSON.stringify(body.schema ?? {}),
//       uiSchema: body.uiSchema ? (typeof body.uiSchema === 'string' ? body.uiSchema : JSON.stringify(body.uiSchema)) : null,
//     }
//   })
//   return Response.json({ id: created.id })
// }

export async function POST(req: Request) {
  const body = await req.json();
  const { title, description, pages, rules } = body;
  if (!title || !pages) {
    return NextResponse.json(
      { error: "title and pages are required" },
      { status: 400 }
    );
  }
  const owner = await resolveOwner();
  const form = await prisma.form.create({
    data: {
      ownerId: owner.id,
      title,
      description,
      pages: {
        create: pages,
      },
      rules: rules ? { create: rules } : undefined,
    },
    include: { pages: true, rules: true },
  });
  return NextResponse.json({ id: form.id });
}
