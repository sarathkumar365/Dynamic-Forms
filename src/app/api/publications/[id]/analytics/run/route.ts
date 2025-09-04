import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveOwner } from "@/lib/owner";
import { Prisma } from "@prisma/client";

type FilterOp = "eq" | "ne" | "in" | "nin" | "gt" | "gte" | "lt" | "lte";

type RunBody = {
  metric: "count" | "sum" | "avg" | "min" | "max";
  metricField?: string;
  filters?: Array<{ field: string; op: FilterOp; value: string | number | boolean | string[] }>;
  groupBy?: { field: string } | string; // MVP: basic text group by
  shareLink?: string; // token (MVP)
  assigned?: string;  // name/email contains (MVP)
};

function isNonEmpty(s?: string | null) {
  return !!s && s.trim().length > 0;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const owner = await resolveOwner();
    // Ensure publication ownership
    const pub = await prisma.publication.findFirst({
      where: { id: params.id },
      include: { form: true },
    });
    if (!pub || !pub.form || pub.form.ownerId !== owner.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await req.json()) as RunBody;
    const metric = body.metric || "count";
    const metricField = metric === "count" ? undefined : (body.metricField || "").trim();
    const groupBy = typeof body.groupBy === "string" ? (body.groupBy || "").trim() : (body.groupBy?.field || "").trim();
    const filters = Array.isArray(body.filters) ? body.filters : [];
    const shareToken = body.shareLink && String(body.shareLink);
    const assigned = body.assigned && String(body.assigned);

    if (metric !== "count" && !isNonEmpty(metricField)) {
      return NextResponse.json({ error: "metricField is required for this metric" }, { status: 400 });
    }

    // Build WHERE conditions and params safely using Prisma.sql
    const whereParts: Prisma.Sql[] = [Prisma.sql`"Submission"."formId" = ${pub.formId}`];

    // Optional share-link filter (by token)
    if (isNonEmpty(shareToken)) {
      // join via shareLinkId; we will filter where share link token matches
      // We'll keep WHERE on subquery by checking existence
      whereParts.push(Prisma.sql`EXISTS (
        SELECT 1 FROM "ShareLink" sl WHERE sl.id = "Submission"."shareLinkId" AND sl.token = ${shareToken}
      )`);
    }
    if (isNonEmpty(assigned)) {
      const like = `%${assigned}%`;
      whereParts.push(Prisma.sql`EXISTS (
        SELECT 1 FROM "ShareLink" sl WHERE sl.id = "Submission"."shareLinkId" AND (
          (sl."assignedName" IS NOT NULL AND sl."assignedName" ILIKE ${like}) OR
          (sl."assignedEmail" IS NOT NULL AND sl."assignedEmail" ILIKE ${like})
        )
      )`);
    }

    // Coerce and add simple filters
    for (const f of filters) {
      const field = (f.field || "").trim();
      const op = f.op as FilterOp;
      if (!field || !op) continue;
      const path = Prisma.sql`"payload"->>${Prisma.join([field]) as unknown as Prisma.Sql}`; // literal key
      // Note: Prisma.sql doesn't support dynamic keys well; use raw snippet safely
      // Use text ops by default
      if (op === "eq") whereParts.push(Prisma.sql`${Prisma.raw(`(payload->>'${field.replace(/"/g, '"')}')`)} = ${String(f.value ?? "")}`);
      else if (op === "ne") whereParts.push(Prisma.sql`${Prisma.raw(`(payload->>'${field.replace(/"/g, '"')}')`)} <> ${String(f.value ?? "")}`);
      else if (op === "in" || op === "nin") {
        const vals = Array.isArray(f.value)
          ? f.value.map(String)
          : String(f.value ?? "").split(",").map((s) => s.trim()).filter(Boolean);
        if (vals.length) {
          const list = Prisma.join(vals.map((v) => Prisma.sql`${v}`));
          whereParts.push(
            op === "in"
              ? Prisma.sql`${Prisma.raw(`(payload->>'${field.replace(/"/g, '"')}')`)} IN (${list})`
              : Prisma.sql`${Prisma.raw(`(payload->>'${field.replace(/"/g, '"')}')`)} NOT IN (${list})`
          );
        }
      } else if (["gt", "gte", "lt", "lte"].includes(op)) {
        const v = Number(f.value);
        if (!Number.isFinite(v)) continue;
        const numExpr = Prisma.raw(`CASE WHEN (payload->>'${field.replace(/"/g, '"')}') ~ '^-?\\d+(\\.\\d+)?$' THEN (payload->>'${field.replace(/"/g, '"')}')::numeric END`);
        const cmp = op === "gt" ? ">" : op === "gte" ? ">=" : op === "lt" ? "<" : "<=";
        whereParts.push(Prisma.sql`${numExpr} ${Prisma.raw(cmp)} ${v}`);
      }
    }

    const whereSql = whereParts.length ? Prisma.sql`WHERE ${Prisma.join(whereParts, " AND ")}` : Prisma.sql``;

    // Helper expressions for metric
    let selectSql: Prisma.Sql;
    let tableRows: any[] = [];

    if (!isNonEmpty(groupBy)) {
      // No group by: single value result
      if (metric === "count") {
        const rows = await prisma.$queryRaw<{ value: bigint }[]>`SELECT COUNT(*)::bigint as value FROM "Submission" ${whereSql}`;
        const value = rows?.[0]?.value ?? 0n;
        return NextResponse.json({ value: Number(value), table: [] });
      } else {
        const mf = metricField!;
        const agg = metric.toUpperCase();
        const rows = await prisma.$queryRaw<{ value: number }[]>`
          SELECT ${Prisma.raw(agg)}(num) as value
          FROM (
            SELECT CASE WHEN (payload->>'${mf.replace(/"/g, '"')}') ~ '^-?\\d+(\\.\\d+)?$' THEN (payload->>'${mf.replace(/"/g, '"')}')::numeric END AS num
            FROM "Submission" ${whereSql}
          ) t
          WHERE num IS NOT NULL
        `;
        const value = rows?.[0]?.value ?? null;
        return NextResponse.json({ value, table: [] });
      }
    }

    // With group by: build series and table
    const gb = groupBy!;
    if (metric === "count") {
      const rows = await prisma.$queryRaw<{ label: string | null; value: bigint }[]>`
        SELECT (payload->>'${gb.replace(/"/g, '"')}') AS label, COUNT(*)::bigint AS value
        FROM "Submission"
        ${whereSql}
        GROUP BY 1
        ORDER BY value DESC NULLS LAST
        LIMIT 50
      `;
      tableRows = rows.map((r) => ({ [gb]: r.label ?? "", count: Number(r.value || 0n) }));
      return NextResponse.json({
        series: { labels: rows.map((r) => String(r.label ?? "")), data: rows.map((r) => Number(r.value || 0n)) },
        table: tableRows,
      });
    } else {
      const mf = metricField!;
      const agg = metric.toUpperCase();
      const rows = await prisma.$queryRaw<{ label: string | null; value: number }[]>`
        SELECT
          (payload->>'${gb.replace(/"/g, '"')}') AS label,
          ${Prisma.raw(agg)}(num) AS value
        FROM (
          SELECT (payload->>'${gb.replace(/"/g, '"')}') as label,
                 CASE WHEN (payload->>'${mf.replace(/"/g, '"')}') ~ '^-?\\d+(\\.\\d+)?$' THEN (payload->>'${mf.replace(/"/g, '"')}')::numeric END AS num
          FROM "Submission"
          ${whereSql}
        ) t
        WHERE num IS NOT NULL
        GROUP BY 1
        ORDER BY value DESC NULLS LAST
        LIMIT 50
      `;
      tableRows = rows.map((r) => ({ [gb]: r.label ?? "", [metric]: r.value }));
      return NextResponse.json({
        series: { labels: rows.map((r) => String(r.label ?? "")), data: rows.map((r) => Number(r.value || 0)) },
        table: tableRows,
      });
    }
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
