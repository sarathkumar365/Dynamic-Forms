import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveOwner } from "@/lib/owner";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const owner = await resolveOwner();
    const pub = await prisma.publication.findFirst({ where: { id: params.id }, include: { form: true } });
    if (!pub || !pub.form || pub.form.ownerId !== owner.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const field = (searchParams.get('field') || '').trim();
    if (!field) return NextResponse.json({ error: 'field is required' }, { status: 400 });
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || 10)));
    const q = (searchParams.get('q') || '').trim();

    const k = field.replace(/"/g, '"');
    const extractor = Prisma.raw(`("Submission"."payload"->>'${k}')`);
    const whereParts: Prisma.Sql[] = [
      Prisma.sql`"Submission"."formId" = ${pub.formId}`,
      Prisma.sql`"Submission"."payload" ? ${field}`,
    ];

    const filterSql = q ? Prisma.sql`AND LOWER(val) LIKE ${'%' + q.toLowerCase() + '%'}` : Prisma.sql``;

    const rows = await prisma.$queryRaw<{ value: string | null; count: bigint }[]>`
      SELECT val AS value, COUNT(*)::bigint AS count
      FROM (
        SELECT ${extractor} AS val
        FROM "Submission"
        WHERE ${Prisma.join(whereParts, ' AND ')}
      ) t
      WHERE val IS NOT NULL
      ${filterSql}
      GROUP BY 1
      ORDER BY count DESC NULLS LAST
      LIMIT ${Prisma.raw(String(limit))}
    `;

    const values = rows.map(r => ({ value: r.value ?? '', count: Number(r.count || 0) }));
    return NextResponse.json({ values });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}
