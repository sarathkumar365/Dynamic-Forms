import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveOwner } from "@/lib/owner";

// GET publication by id
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const owner = await resolveOwner();
  // Find publication and ensure its form belongs to owner
  const pub = await prisma.publication.findFirst({
    where: { id: params.id },
    include: {
      form: true,
      shareLinks: true,
    },
  });
  if (!pub || !pub.form || pub.form.ownerId !== owner.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(pub);
}

// DELETE publication by id
export async function DELETE(
  _: Request,
  { params }: { params: { id: string } }
) {
  const owner = await resolveOwner();
  // Ensure publication belongs to owner before deleting
  const pub = await prisma.publication.findFirst({
    where: { id: params.id },
    include: { form: true },
  });
  if (!pub || !pub.form || pub.form.ownerId !== owner.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.publication.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
