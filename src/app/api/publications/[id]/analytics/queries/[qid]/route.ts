import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveOwner } from "@/lib/owner";

export async function PUT(req: NextRequest, { params }: { params: { id: string; qid: string } }) {
  const owner = await resolveOwner();
  const pub = await prisma.publication.findFirst({ where: { id: params.id }, include: { form: true } });
  if (!pub || !pub.form || pub.form.ownerId !== owner.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json();
  const name = body?.name ? String(body.name).trim() : undefined;
  const definition = body?.definition;
  const row = await prisma.analyticsQuery.update({
    where: { id: params.qid },
    data: { ...(name ? { name } : {}), ...(definition ? { definition } : {}) },
  });
  if (!row || row.publicationId !== pub.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ row });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; qid: string } }) {
  const owner = await resolveOwner();
  const pub = await prisma.publication.findFirst({ where: { id: params.id }, include: { form: true } });
  if (!pub || !pub.form || pub.form.ownerId !== owner.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const row = await prisma.analyticsQuery.delete({ where: { id: params.qid } });
  if (!row || row.publicationId !== pub.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

