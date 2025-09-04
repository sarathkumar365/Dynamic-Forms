import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveOwner } from "@/lib/owner";
import { runQuery } from "@/lib/analytics/sql";
import type { DSL, FilterOp } from "@/lib/analytics/types";
import { getFieldRegistry, bestFieldMatch } from "@/lib/analytics/fields";

type Msg = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const owner = await resolveOwner();
    const pub = await prisma.publication.findFirst({ where: { id: params.id }, include: { form: true } });
    if (!pub || !pub.form || pub.form.ownerId !== owner.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const message: string = String(body?.message || "");
    const history: Msg[] = Array.isArray(body?.history) ? body.history : [];
    if (!message.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });

    // Parse basic NL into a query DSL (very lightweight heuristics)
    const original = parseText(message);
    let dsl = { ...original } as DSL;
    const reg = await getFieldRegistry(pub.formId);
    const notes: string[] = [];
    // Fuzzy resolve metricField/groupBy
    if (dsl.metric !== 'count' && dsl.metricField && !reg.find(r=>r.key===dsl.metricField)) {
      const m = bestFieldMatch(dsl.metricField, reg);
      if (m) { notes.push(`using ${m.key} for ${dsl.metricField}`); dsl.metricField = m.key; }
      else { notes.push(`metric field '${dsl.metricField}' unknown → using count`); dsl.metric = 'count'; dsl.metricField = undefined; }
    }
    if (dsl.groupBy && !reg.find(r=>r.key===dsl.groupBy)) {
      const m = bestFieldMatch(dsl.groupBy, reg);
      if (m) { notes.push(`using ${m.key} for ${dsl.groupBy}`); dsl.groupBy = m.key; }
      else { notes.push(`group-by '${dsl.groupBy}' unknown → omitted`); dsl.groupBy = undefined; }
    }
    // Fix filters unknown fields
    const newFilters: DSL['filters'] = [];
    for (const f of dsl.filters || []) {
      if (reg.find(r=>r.key === f.field)) { newFilters.push(f); continue; }
      const m = bestFieldMatch(f.field, reg);
      if (m) { notes.push(`filter '${f.field}' → '${m.key}'`); newFilters.push({ ...f, field: m.key }); }
      else { notes.push(`dropped filter on unknown '${f.field}'`); }
    }
    dsl.filters = newFilters;

    // Run using unified SQL builder
    const runRes = await runQuery(pub.formId, dsl);

    const explain = [describeDsl(dsl), notes.length ? `(${notes.join('; ')})` : ''].filter(Boolean).join(' ');
    return NextResponse.json({ text: explain, result: runRes });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}

type FilterOp = "eq" | "ne" | "in" | "nin" | "gt" | "gte" | "lt" | "lte";
type LocalDSL = {
  metric: "count" | "sum" | "avg" | "min" | "max";
  metricField?: string;
  groupBy?: string;
  filters: Array<{ field: string; op: FilterOp; value: string }>;
};

function parseText(text: string): LocalDSL {
  const raw = text.trim();
  const t = raw.toLowerCase();
  // default
  let metric: LocalDSL["metric"] = "count";
  let metricField: string | undefined;
  let groupBy: string | undefined;
  const filters: LocalDSL["filters"] = [];

  // metric detection
  for (const key of ["count", "sum", "avg", "average", "min", "max"]) {
    if (t.includes(key)) {
      if (key === "average") metric = "avg"; else metric = key as LocalDSL["metric"];
      break;
    }
  }
  if (metric !== "count") {
    // try to find field after metric word with optional stopwords like 'of', 'the'
    let m = raw.match(/\b(sum|avg|average|min|max)\s+(?:of\s+|the\s+)?([a-z0-9_\-.]+)/i);
    if (m) metricField = m[2];
    // fallback: look for '<metric> ... <field> in' pattern
    if (!metricField) {
      m = raw.match(/\b(sum|avg|average|min|max)\s+(?:of\s+|the\s+)?([a-z0-9_\-.]+)\s+in\b/i);
      if (m) metricField = m[2];
    }
  }

  // group by detection: "by <field>" or "group by <field>"
  const g1 = raw.match(/\bgroup\s+by\s+([a-z0-9_\-.]+)/i);
  const g2 = raw.match(/\bby\s+([a-z0-9_\-.]+)/i);
  if (g1) groupBy = g1[1]; else if (g2) groupBy = g2[1];

  // where filters: where ... and ...
  const where = raw.split(/\bwhere\b/i)[1];
  if (where) {
    const parts = where.split(/\band\b|,/i).map((s) => s.trim()).filter(Boolean);
    for (const p of parts) {
      // operators: =, !=, in, not in, >, >=, <, <=
      let m: RegExpMatchArray | null;
      // equals, eq, is
      if ((m = p.match(/^([a-z0-9_\-.]+)\s*(=|!=|>=|<=|>|<|eq|neq|ne|is\s+not|is)\s*([a-z0-9_\-.]+)$/i))) {
        const [, field, opRaw, val] = m;
        const opMap: Record<string, FilterOp> = { "=": "eq", "is": "eq", "eq": "eq", "!=": "ne", "ne": "ne", "neq": "ne", "is not": "ne", ">": "gt", ">=": "gte", "<": "lt", "<=": "lte" };
        const opKey = opRaw.toLowerCase().replace(/\s+/g, " ");
        const op = opMap[opKey];
        if (op) filters.push({ field, op, value: val });
        continue;
      }
      if ((m = p.match(/^([a-z0-9_\-.]+)\s+in\s*\(([^\)]+)\)$/i))) {
        const [, field, list] = m;
        filters.push({ field, op: "in", value: list.split(/\s*,\s*/).join(",") });
        continue;
      }
      if ((m = p.match(/^([a-z0-9_\-.]+)\s+in\s+([a-z0-9_\-.,\s]+)$/i))) {
        const [, field, list] = m;
        filters.push({ field, op: "in", value: list.split(/\s*,\s*/).join(",") });
        continue;
      }
      if ((m = p.match(/^([a-z0-9_\-.]+)\s+not\s+in\s*\(([^\)]+)\)$/i))) {
        const [, field, list] = m;
        filters.push({ field, op: "nin", value: list.split(/\s*,\s*/).join(",") });
        continue;
      }
      if ((m = p.match(/^([a-z0-9_\-.]+)\s+not\s+in\s+([a-z0-9_\-.,\s]+)$/i))) {
        const [, field, list] = m;
        filters.push({ field, op: "nin", value: list.split(/\s*,\s*/).join(",") });
        continue;
      }
      // fallback equality: field value -> field = value
      if ((m = p.match(/^([a-z0-9_\-.]+)\s+([a-z0-9_\-.]+)$/i))) {
        const [, field, val] = m;
        filters.push({ field, op: "eq", value: val });
      }
    }
  }

  return { metric, metricField, groupBy, filters };
}

function describeDsl(dsl: DSL) {
  const parts = [] as string[];
  parts.push(dsl.metric === 'count' ? 'Count' : `${dsl.metric.toUpperCase()}(${dsl.metricField})`);
  if (dsl.groupBy) parts.push(`by ${dsl.groupBy}`);
  if (dsl.filters?.length) parts.push(`where ${dsl.filters.map(f=>`${f.field} ${f.op} ${f.value}`).join(' and ')}`);
  return parts.join(' ');
}

// removed legacy runDsl; using shared sql.runQuery
