import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveOwner } from "@/lib/owner";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const owner = await resolveOwner();
  const pub = await prisma.publication.findFirst({ where: { id: params.id }, include: { form: true } });
  if (!pub || !pub.form || pub.form.ownerId !== owner.id) return new NextResponse("Not found", { status: 404 });

  const rows = await prisma.submission.findMany({
    where: { formId: pub.formId },
    include: { shareLink: true },
    orderBy: { createdAt: "desc" },
  });

  // Create CSV: createdAt, token, payload (JSON string)
  const headers = ["createdAt", "token", "payload"];
  const lines = [headers.join(",")];
  for (const r of rows) {
    const createdAt = r.createdAt.toISOString();
    const token = r.shareLink?.token || "";
    const payload = safeCsv(JSON.stringify(r.payload));
    lines.push([createdAt, token, payload].join(","));
  }
  const csv = lines.join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="submissions-${pub.id}.csv"`,
    },
  });
}

function safeCsv(v: string) {
  if (v == null) return "";
  if (/[",\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
  return v;
}

