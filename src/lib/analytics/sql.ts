import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { DSL, FilterOp, RunResult } from "./types";

function isNumericString(s: string) {
  return /^-?\d+(?:\.\d+)?$/.test(s);
}

function jsonNumExpr(field: string) {
  const k = field.replace(/"/g, '"');
  return Prisma.raw(`
    CASE
      WHEN jsonb_typeof("Submission"."payload"->'${k}') = 'number' THEN ("Submission"."payload"->>'${k}')::numeric
      WHEN jsonb_typeof("Submission"."payload"->'${k}') = 'boolean' THEN CASE WHEN ("Submission"."payload"->>'${k}')::boolean THEN 1 ELSE 0 END::numeric
      WHEN ("Submission"."payload"->>'${k}') ~ '^-?\\d+(\\.\\d+)?$' THEN ("Submission"."payload"->>'${k}')::numeric
      WHEN lower("Submission"."payload"->>'${k}') IN ('true','false','1','0') THEN CASE WHEN lower("Submission"."payload"->>'${k}') IN ('true','1') THEN 1 ELSE 0 END::numeric
    END`);
}

function jsonTextExpr(field: string) {
  const k = field.replace(/"/g, '"');
  return Prisma.raw(`("Submission"."payload"->>'${k}')`);
}

export function buildWhereParts(formId: string, filters: DSL["filters"]) {
  const whereParts: Prisma.Sql[] = [Prisma.sql`"Submission"."formId" = ${formId}`];
  for (const f of filters || []) {
    const field = (f.field || "").trim();
    const op = f.op as FilterOp;
    if (!field || !op) continue;
    const vStr = String(f.value ?? "");
    const isNum = isNumericString(vStr);
    if (op === "eq") {
      if (isNum) whereParts.push(Prisma.sql`${jsonNumExpr(field)} = ${Number(vStr)}`);
      else whereParts.push(Prisma.sql`LOWER(${jsonTextExpr(field)}) = ${vStr.toLowerCase()}`);
    } else if (op === "ne") {
      if (isNum) whereParts.push(Prisma.sql`${jsonNumExpr(field)} <> ${Number(vStr)}`);
      else whereParts.push(Prisma.sql`LOWER(${jsonTextExpr(field)}) <> ${vStr.toLowerCase()}`);
    } else if (op === "in" || op === "nin") {
      const vals = (Array.isArray(f.value) ? f.value.map(String) : vStr.split(",")).map((s) => s.trim()).filter(Boolean);
      if (!vals.length) continue;
      if (vals.every(isNumericString)) {
        const list = Prisma.join(vals.map((v) => Prisma.sql`${Number(v)}`));
        whereParts.push(op === "in" ? Prisma.sql`${jsonNumExpr(field)} IN (${list})` : Prisma.sql`${jsonNumExpr(field)} NOT IN (${list})`);
      } else {
        const list = Prisma.join(vals.map((v) => Prisma.sql`${v.toLowerCase()}`));
        whereParts.push(op === "in" ? Prisma.sql`LOWER(${jsonTextExpr(field)}) IN (${list})` : Prisma.sql`LOWER(${jsonTextExpr(field)}) NOT IN (${list})`);
      }
    } else if (["gt", "gte", "lt", "lte"].includes(op)) {
      const v = Number(vStr);
      if (!Number.isFinite(v)) continue;
      const cmp = op === "gt" ? ">" : op === "gte" ? ">=" : op === "lt" ? "<" : "<=";
      whereParts.push(Prisma.sql`${jsonNumExpr(field)} ${Prisma.raw(cmp)} ${v}`);
    }
  }
  return whereParts;
}

export async function runQuery(formId: string, dsl: DSL): Promise<RunResult> {
  const whereParts = buildWhereParts(formId, dsl.filters || []);
  const whereSql = whereParts.length ? Prisma.sql`WHERE ${Prisma.join(whereParts, " AND ")}` : Prisma.sql``;

  const metric = dsl.metric;
  const gb = dsl.groupBy?.trim();
  const mf = dsl.metricField?.trim();

  if (!gb) {
    if (metric === "count") {
      const rows = await prisma.$queryRaw<{ value: bigint }[]>`SELECT COUNT(*)::bigint as value FROM "Submission" ${whereSql}`;
      return { value: Number(rows?.[0]?.value ?? 0n), table: [] };
    }
    if (!mf) return { value: 0, table: [] };
    const agg = metric.toUpperCase();
    const rows = await prisma.$queryRaw<{ value: number }[]>`
      SELECT ${Prisma.raw(agg)}(num) as value
      FROM (
        SELECT ${jsonNumExpr(mf)} AS num
        FROM "Submission" ${whereSql}
      ) t
      WHERE num IS NOT NULL
    `;
    return { value: rows?.[0]?.value ?? null, table: [] };
  }

  if (metric === "count") {
    const rows = await prisma.$queryRaw<{ label: string | null; value: bigint }[]>`
      SELECT ${jsonTextExpr(gb)} AS label, COUNT(*)::bigint AS value
      FROM "Submission"
      ${whereSql}
      GROUP BY 1
      ORDER BY value DESC NULLS LAST
      LIMIT 50
    `;
    const table = rows.map((r) => ({ [gb]: r.label ?? "", count: Number(r.value || 0n) }));
    return { series: { labels: rows.map((r) => String(r.label ?? "")), data: rows.map((r) => Number(r.value || 0n)) }, table };
  }
  if (!mf) return { value: 0, table: [] };
  const agg = metric.toUpperCase();
  const rows = await prisma.$queryRaw<{ label: string | null; value: number }[]>`
    SELECT
      label,
      ${Prisma.raw(agg)}(num) AS value
    FROM (
      SELECT ${jsonTextExpr(gb)} as label,
             ${jsonNumExpr(mf)} AS num
      FROM "Submission"
      ${whereSql}
    ) t
    WHERE num IS NOT NULL
    GROUP BY 1
    ORDER BY value DESC NULLS LAST
    LIMIT 50
  `;
  const table = rows.map((r) => ({ [gb]: r.label ?? "", [metric]: r.value }));
  return { series: { labels: rows.map((r) => String(r.label ?? "")), data: rows.map((r) => Number(r.value || 0)) }, table };
}
