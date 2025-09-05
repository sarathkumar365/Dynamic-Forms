import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveOwner } from "@/lib/owner";
import type { DSL, FilterOp } from "@/lib/analytics/types";
import { getFieldRegistry, bestFieldMatch } from "@/lib/analytics/fields";
import { runQuery } from "@/lib/analytics/sql";


const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const META_LAMA = "meta-llama/llama-4-scout-17b-16e-instruct"
const MODEL = META_LAMA || process.env.GROQ_MODEL || 'llama3-8b-8192'


function extractFirstJsonObject(text: string): any {
  try { return JSON.parse(text) } catch {}
  const fenced = text.match(/```json([\s\S]*?)```/i) || text.match(/```([\s\S]*?)```/)
  if (fenced?.[1]) { const inner = fenced[1].trim(); try { return JSON.parse(inner) } catch {} }
  const start = text.indexOf('{')
  if (start >= 0) {
    let d = 0
    for (let i = start; i < text.length; i++) {
      const ch = text[i]
      if (ch === '{') d++
      else if (ch === '}') { d--; if (d === 0) {
        const cand = text.slice(start, i+1)
        try { return JSON.parse(cand) } catch {}
      }}
    }
  }
  throw new Error('No JSON object found in AI output')
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const owner = await resolveOwner();
    const pub = await prisma.publication.findFirst({ where: { id: params.id }, include: { form: true } });
    if (!pub || !pub.form || pub.form.ownerId !== owner.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const apiKey = process.env.GROQ_API_KEY;
    const body = await req.json().catch(() => ({}));
    const message: string = String(body?.message || "");
    if (!message.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });

    const fields = await getFieldRegistry(pub.formId);
    const fieldList = fields.map(f => `${f.key}:${f.type}`).join(', ');
    const numField = (fields.find(f=>f.type==='number')?.key) || (fields.find(f=>f.type==='boolean')?.key) || fields[0]?.key || 'amount';
    const catField = (fields.find(f=>f.type==='text' || f.type==='boolean')?.key) || fields[0]?.key || 'country';

    const system = [
      'You translate a natural-language analytics question into a strict JSON DSL. Output JSON ONLY.',
      'DSL shape: { "metric": "count|sum|avg|min|max", "metricField": string?, "groupBy": string?, "filters": [{"field": string, "op": "eq|ne|in|nin|gt|gte|lt|lte", "value": string}] }',
      `Valid field keys (with types): ${fieldList}. Use only these keys when possible.`,
      'For non-count metrics, metricField is required and should be numeric/boolean.',
      'GroupBy should be a categorical field.',
      'For filters, value is a string; for IN/NIN, return comma-separated strings like "US,CA".',
      'If a requested field is unknown, pick the closest from the provided keys; if none, fall back to count without metricField.',
      'Do not include any explanation; output just the JSON object.'
    ].join('\n');

    let dsl: DSL | null = null;
    let warning: string | undefined;
    console.log(apiKey ? 'Using Groq AI' : 'No GROQ_API_KEY, using heuristic parser');
    
    if (!apiKey) {
      warning = 'AI disabled (no GROQ_API_KEY). Falling back to heuristic parser.';
      dsl = parseText(message);
    } else {
      // Few-shot examples to improve accuracy (tailored to this form)
      const examples: Array<{ u: any; a: any }> = [
        { u: `count by ${catField}`, a: { metric: 'count', groupBy: catField, filters: [] } },
        { u: `avg ${numField} by ${catField}`, a: { metric: 'avg', metricField: numField, groupBy: catField, filters: [] } },
        { u: `sum ${numField} where ${catField} in (US, CA)`, a: { metric: 'sum', metricField: numField, filters: [{ field: catField, op: 'in', value: 'US,CA' }] } },
        { u: `max ${numField}`, a: { metric: 'max', metricField: numField, filters: [] } },
      ];

      const messages = [
        { role: 'system', content: system },
        ...examples.flatMap(ex => ([
          { role: 'user' as const, content: ex.u },
          { role: 'assistant' as const, content: JSON.stringify(ex.a) },
        ])),
        { role: 'user', content: message },
      ];

      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0,
          max_tokens: 400,
          messages
        })
      });
      const text = await res.text();
      if (!res.ok) {
        console.error('Groq error', res.status, text);
        warning = `Groq ${res.status}`;
        dsl = parseText(message);
      } else {
        try {
          let content = '';
          try {
            const data = JSON.parse(text);
            content = data?.choices?.[0]?.message?.content ?? '';
            if (!content) content = typeof data === 'string' ? data : JSON.stringify(data);
          } catch { content = text; }
          const parsed = extractFirstJsonObject((content || '').trim());
          if (parsed && typeof parsed === 'object') dsl = parsed as DSL;
          else dsl = parseText(message);
        } catch (e: any) {
          warning = 'AI returned non-JSON';
          dsl = parseText(message);
        }
      }
    }

    // Ensure DSL sanity and fixups
    dsl = (dsl || { metric: 'count', filters: [] }) as DSL;
    const notes: string[] = [];
    // Normalize metric
    const mOk = ['count','sum','avg','min','max'];
    if (!mOk.includes(dsl.metric)) { dsl.metric = 'count'; notes.push('invalid metric → count'); }
    // Fix fields via best match
    if (dsl.metric !== 'count' && dsl.metricField) {
      if (!fields.find(r=>r.key===dsl!.metricField)) {
        const m = bestFieldMatch(dsl.metricField, fields);
        if (m) { notes.push(`using ${m.key} for metricField ${dsl.metricField}`); dsl.metricField = m.key; } else { notes.push('unknown metricField → count'); dsl.metric = 'count'; dsl.metricField = undefined; }
      }
    }
    if (dsl.groupBy) {
      if (!fields.find(r=>r.key===dsl.groupBy)) {
        const m = bestFieldMatch(dsl.groupBy, fields);
        if (m) { notes.push(`using ${m.key} for groupBy ${dsl.groupBy}`); dsl.groupBy = m.key; } else { notes.push('unknown groupBy omitted'); dsl.groupBy = undefined; }
      }
    }
    const validOps = new Set<FilterOp>(["eq","ne","in","nin","gt","gte","lt","lte"]);
    const fixedFilters: DSL['filters'] = [] as any;
    for (const f of dsl.filters || []) {
      if (!f?.field || !f?.op) continue;
      const op = f.op as FilterOp;
      if (!validOps.has(op)) continue;
      let field = f.field;
      if (!fields.find(r=>r.key===field)) {
        const m = bestFieldMatch(field, fields);
        if (m) { notes.push(`filter ${field} → ${m.key}`); field = m.key; }
        else { notes.push(`dropped unknown filter ${field}`); continue; }
      }
      fixedFilters.push({ field, op, value: f.value } as any);
    }
    dsl.filters = fixedFilters;

    const result = await runQuery(pub.formId, dsl);
    const parts: string[] = [];
    parts.push(dsl.metric === 'count' ? 'Count' : `${dsl.metric.toUpperCase()}(${dsl.metricField})`);
    if (dsl.groupBy) parts.push(`by ${dsl.groupBy}`);
    if (dsl.filters?.length) parts.push(`where ${dsl.filters.map(f=>`${f.field} ${f.op} ${f.value}`).join(' and ')}`);
    const text = [parts.join(' '), (notes.length ? `(${notes.join('; ')})` : '')].filter(Boolean).join(' ');

    return NextResponse.json({ text, result, dsl, warning });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}

function parseText(text: string): DSL {
  const raw = text.trim();
  const t = raw.toLowerCase();
  let metric: DSL["metric"] = "count";
  let metricField: string | undefined;
  let groupBy: string | undefined;
  const filters: DSL["filters"] = [] as any;
  for (const key of ["count", "sum", "avg", "average", "min", "max"]) {
    if (t.includes(key)) {
      if (key === "average") metric = "avg"; else metric = key as DSL["metric"];
      break;
    }
  }
  if (metric !== "count") {
    let m = raw.match(/\b(sum|avg|average|min|max)\s+(?:of\s+|the\s+)?([a-z0-9_\-.]+)/i);
    if (m) metricField = m[2];
    if (!metricField) {
      m = raw.match(/\b(sum|avg|average|min|max)\s+(?:of\s+|the\s+)?([a-z0-9_\-.]+)\s+in\b/i);
      if (m) metricField = m[2];
    }
  }
  const g1 = raw.match(/\bgroup\s+by\s+([a-z0-9_\-.]+)/i);
  const g2 = raw.match(/\bby\s+([a-z0-9_\-.]+)/i);
  if (g1) groupBy = g1[1]; else if (g2) groupBy = g2[1];
  const where = raw.split(/\bwhere\b/i)[1];
  if (where) {
    const parts = where.split(/\band\b|,/i).map((s) => s.trim()).filter(Boolean);
    for (const p of parts) {
      let m: RegExpMatchArray | null;
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
      if ((m = p.match(/^([a-z0-9_\-.]+)\s+([a-z0-9_\-.]+)$/i))) {
        const [, field, val] = m;
        filters.push({ field, op: "eq", value: val });
      }
    }
  }
  return { metric, metricField, groupBy, filters } as DSL;
}
