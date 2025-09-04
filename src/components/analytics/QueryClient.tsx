"use client";
import React, { useEffect, useMemo, useState } from "react";

type FilterOp = "eq" | "ne" | "in" | "nin" | "gt" | "gte" | "lt" | "lte";

export default function QueryClient({ publicationId, suggestedKeys }: { publicationId: string; suggestedKeys: string[] }) {
  const [metric, setMetric] = useState<"count" | "sum" | "avg" | "min" | "max">("count");
  const [metricField, setMetricField] = useState<string>("");
  const [groupBy, setGroupBy] = useState<string>(suggestedKeys?.[0] || "");
  const [filters, setFilters] = useState<Array<{ field: string; op: FilterOp; value: string }>>([]);
  const [result, setResult] = useState<any | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [savingName, setSavingName] = useState<string>("");
  const [saved, setSaved] = useState<Array<{ id: string; name: string; definition: any }>>([]);

  async function run() {
    setErr(null); setResult(null);
    try {
      const res = await fetch(`/api/publications/${publicationId}/analytics/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metric, metricField: metric !== "count" ? metricField : undefined, filters, groupBy: groupBy || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setResult(data);
    } catch (e: any) {
      setErr(e?.message || "Failed to run query");
    }
  }

  useEffect(() => {
    // starter query: count by suggested key if available
    run();
    // load saved queries
    loadSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSaved() {
    try {
      const res = await fetch(`/api/publications/${publicationId}/analytics/queries`);
      const data = await res.json();
      if (res.ok) setSaved((data?.rows || []).map((r: any) => ({ id: r.id, name: r.name, definition: r.definition })));
    } catch {}
  }

  async function save() {
    if (!savingName.trim()) return setErr("Enter a name to save");
    const definition = { metric, metricField: metric !== "count" ? metricField : undefined, filters, groupBy: groupBy || undefined };
    try {
      const res = await fetch(`/api/publications/${publicationId}/analytics/queries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: savingName.trim(), definition }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setSavingName("");
      await loadSaved();
    } catch (e: any) {
      setErr(e?.message || "Failed to save");
    }
  }

  function applyDefinition(def: any) {
    if (!def) return;
    setMetric(def.metric || "count");
    setMetricField(def.metricField || "");
    setGroupBy(def.groupBy || "");
    setFilters(Array.isArray(def.filters) ? def.filters : []);
    // run after state settles
    setTimeout(() => { run(); }, 0);
  }

  function exportCSV() {
    const table = result?.table;
    if (!Array.isArray(table) || table.length === 0) return;
    const headers = Object.keys(table[0]);
    const rows = table.map((row: any) => headers.map((h) => toCsvCell(row[h])));
    const csv = [headers.join(","), ...rows.map((r: string[]) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${publicationId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function toCsvCell(v: any) {
    if (v == null) return "";
    const s = String(v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function addFilter() {
    setFilters((f) => [...f, { field: "", op: "eq", value: "" }]);
  }
  function setF(i: number, patch: Partial<{ field: string; op: FilterOp; value: string }>) {
    setFilters((fs) => fs.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }
  function delF(i: number) { setFilters((fs) => fs.filter((_, idx) => idx !== i)); }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs mb-1">Metric</label>
          <select className="input" value={metric} onChange={(e)=>setMetric(e.target.value as any)}>
            <option value="count">count</option>
            <option value="sum">sum</option>
            <option value="avg">avg</option>
            <option value="min">min</option>
            <option value="max">max</option>
          </select>
        </div>
        {metric !== "count" && (
          <div>
            <label className="block text-xs mb-1">Field (numeric)</label>
            <input className="input" value={metricField} onChange={(e)=>setMetricField(e.target.value)} placeholder="salary, age" />
          </div>
        )}
        <div className="flex-1" />
        <div>
          <label className="block text-xs mb-1">Group by (categorical)</label>
          <div className="flex gap-2">
            <input className="input" value={groupBy} onChange={(e)=>setGroupBy(e.target.value)} placeholder={suggestedKeys?.[0] || "country"} />
            {suggestedKeys?.slice(0,3).map((k)=>(
              <button key={k} className="btn-base btn-ghost btn-md" onClick={()=>setGroupBy(k)}>{k}</button>
            ))}
          </div>
        </div>
        <button className="btn-base btn-primary btn-md" onClick={run}>Run</button>
      </div>

      <div>
        <div className="text-sm font-medium mb-2">Filters</div>
        {filters.map((f, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input className="input" placeholder="field" value={f.field} onChange={(e)=>setF(i,{field:e.target.value})} />
            <select className="input" value={f.op} onChange={(e)=>setF(i,{op:e.target.value as any})}>
              <option value="eq">=</option>
              <option value="ne">≠</option>
              <option value="in">in</option>
              <option value="nin">not in</option>
              <option value="gt">&gt;</option>
              <option value="gte">≥</option>
              <option value="lt">&lt;</option>
              <option value="lte">≤</option>
            </select>
            <input className="input" placeholder={f.op === 'in' || f.op === 'nin' ? 'comma,separated' : 'value'} value={f.value} onChange={(e)=>setF(i,{value:e.target.value})} />
            <button className="btn-base btn-ghost btn-md" onClick={()=>delF(i)}>Remove</button>
          </div>
        ))}
        <button className="btn-base btn-ghost btn-md" onClick={addFilter}>+ Add filter</button>
      </div>

      {/* Save + Export */}
      <div className="flex items-end gap-2">
        <div>
          <label className="block text-xs mb-1">Save as</label>
          <div className="flex gap-2">
            <input className="input" placeholder="Query name" value={savingName} onChange={(e)=>setSavingName(e.target.value)} />
            <button className="btn-base btn-md" onClick={save}>Save</button>
          </div>
        </div>
        <div className="flex-1" />
        <div>
          <label className="block text-xs mb-1">Export</label>
          <button className="btn-base btn-md" onClick={exportCSV} disabled={!result?.table?.length}>CSV</button>
        </div>
      </div>

      {/* Saved queries */}
      {saved.length > 0 && (
        <div className="border rounded-lg p-3">
          <div className="text-sm font-medium mb-2">Saved Queries</div>
          <div className="flex flex-wrap gap-2">
            {saved.map((q) => (
              <button key={q.id} className="btn-base btn-ghost btn-sm" onClick={()=>applyDefinition(q.definition)} title={q.name}>{q.name}</button>
            ))}
          </div>
        </div>
      )}

      {err && <div className="text-sm text-red-600">{err}</div>}

      {result && (
        <div className="space-y-3">
          {result.series && result.series.labels?.length ? (
            <Bar labels={result.series.labels} data={result.series.data} />
          ) : result.value !== undefined ? (
            <div className="rounded-lg border p-3 text-sm">Value: <span className="font-mono">{String(result.value)}</span></div>
          ) : null}

          {result.table && result.table.length ? (
            <div className="overflow-auto rounded-lg border">
              <table className="table">
                <thead><tr>{Object.keys(result.table[0]).map((h)=>(<th key={h}>{h}</th>))}</tr></thead>
                <tbody>
                  {result.table.map((row: any, idx: number)=>(
                    <tr key={idx}>{Object.values(row).map((v:any,i:number)=>(<td key={i} className="text-sm">{String(v)}</td>))}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Bar({ labels, data }: { labels: string[]; data: number[] }) {
  const max = Math.max(1, ...data);
  return (
    <div className="space-y-1">
      {labels.map((l, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-40 truncate text-xs" title={l}>{l}</div>
          <div className="flex-1 h-3 bg-gray-100 rounded">
            <div className="h-3 bg-black rounded" style={{ width: `${(data[i] / max) * 100}%` }} />
          </div>
          <div className="w-12 text-right text-xs">{data[i]}</div>
        </div>
      ))}
    </div>
  );
}
