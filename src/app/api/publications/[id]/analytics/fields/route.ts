import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveOwner } from "@/lib/owner";
import { getFieldRegistry } from "@/lib/analytics/fields";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const owner = await resolveOwner();
    const pub = await prisma.publication.findFirst({ where: { id: params.id }, include: { form: true } });
    if (!pub || !pub.form || pub.form.ownerId !== owner.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const fields = await getFieldRegistry(pub.formId);
    return NextResponse.json({ fields });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}

