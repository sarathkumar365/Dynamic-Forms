import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveOwner } from "@/lib/owner";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const owner = await resolveOwner();
  const pub = await prisma.publication.findFirst({ where: { id: params.id }, include: { form: true } });
  if (!pub || !pub.form || pub.form.ownerId !== owner.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const rows = await prisma.analyticsQuery.findMany({ where: { publicationId: pub.id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ rows });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const owner = await resolveOwner();
  const pub = await prisma.publication.findFirst({ where: { id: params.id }, include: { form: true } });
  if (!pub || !pub.form || pub.form.ownerId !== owner.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json();
  const name = String(body?.name || "").trim();
  const definition = body?.definition;
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!definition) return NextResponse.json({ error: "Definition is required" }, { status: 400 });
  const row = await prisma.analyticsQuery.create({ data: { publicationId: pub.id, name, definition } });
  return NextResponse.json({ row });
}

