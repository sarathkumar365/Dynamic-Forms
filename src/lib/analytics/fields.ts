import { prisma } from "@/lib/prisma";

export type FieldInfo = {
  key: string;
  type: 'number' | 'text' | 'boolean' | 'unknown';
  distinct?: number;
  samples?: string[];
};

export async function getFieldRegistry(formId: string, sampleLimit = 100): Promise<FieldInfo[]> {
  // Pull last N payloads
  const rows = await prisma.$queryRaw<{ payload: any }[]>`
    SELECT "payload" FROM "Submission"
    WHERE "formId" = ${formId}
    ORDER BY "createdAt" DESC
    LIMIT ${sampleLimit}
  `;
  const keys = new Map<string, { nums: number; bools: number; texts: number; total: number; sampleSet: Set<string> }>();
  for (const r of rows) {
    const p = r.payload || {};
    if (!p || typeof p !== 'object') continue;
    for (const [k, vRaw] of Object.entries<any>(p)) {
      if (!keys.has(k)) keys.set(k, { nums: 0, bools: 0, texts: 0, total: 0, sampleSet: new Set() });
      const st = keys.get(k)!;
      st.total++;
      const v = typeof vRaw === 'string' ? vRaw : JSON.stringify(vRaw);
      st.sampleSet.add(v.length > 50 ? v.slice(0, 50) : v);
      // simple type inference
      if (vRaw === true || vRaw === false || v === 'true' || v === 'false' || v === '1' || v === '0') st.bools++;
      else if (/^-?\d+(?:\.\d+)?$/.test(v)) st.nums++;
      else st.texts++;
    }
  }
  const out: FieldInfo[] = [];
  for (const [k, st] of keys) {
    let type: FieldInfo['type'] = 'unknown';
    const { nums, bools, texts, total } = st;
    if (nums / Math.max(1, total) >= 0.7) type = 'number';
    else if (bools / Math.max(1, total) >= 0.7) type = 'boolean';
    else if (texts > 0) type = 'text';
    out.push({ key: k, type, samples: Array.from(st.sampleSet).slice(0, 10) });
  }
  // sort by key for determinism
  out.sort((a, b) => a.key.localeCompare(b.key));
  return out;
}

export function bestFieldMatch(name: string, regs: FieldInfo[]): { key: string; score: number } | null {
  if (!name) return null;
  const target = name.toLowerCase();
  let best: { key: string; score: number } | null = null;
  for (const r of regs) {
    const s = similarity(target, r.key.toLowerCase());
    if (!best || s > best.score) best = { key: r.key, score: s };
  }
  if (best && best.score >= 0.6) return best;
  return null;
}

function similarity(a: string, b: string): number {
  // normalized Levenshtein-based similarity (0..1)
  const dist = levenshtein(a, b);
  const max = Math.max(a.length, b.length) || 1;
  return 1 - dist / max;
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

