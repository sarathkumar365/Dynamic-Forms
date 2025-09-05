"use client";
import React, { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import ResultsView from "./ResultsView";

type FilterOp = "eq" | "ne" | "in" | "nin" | "gt" | "gte" | "lt" | "lte";

export default function QueryClient({ publicationId, suggestedKeys }: { publicationId: string; suggestedKeys: string[] }) {
  const [metric, setMetric] = useState<"count" | "sum" | "avg" | "min" | "max" | "">("");
  const [metricField, setMetricField] = useState<string>("");
  const [groupBy, setGroupBy] = useState<string>("");
  const [filters, setFilters] = useState<Array<{ field: string; op: FilterOp; value: string }>>([]);
  const [result, setResult] = useState<any | null>(null);
  const [resultVersion, setResultVersion] = useState(0);
  const [display, setDisplay] = useState<'table'|'barV'|'barH'|'pie'|'line'>('table');
  const [err, setErr] = useState<string | null>(null);
  const [lastRunDef, setLastRunDef] = useState<any | null>(null);
  const [showQueryModal, setShowQueryModal] = useState(false);
  const [savingName, setSavingName] = useState<string>("");
  const [saved, setSaved] = useState<Array<{ id: string; name: string; definition: any }>>([]);
  const [fields, setFields] = useState<Array<{ key: string; type: 'number'|'text'|'boolean'|'unknown'; samples?: string[] }>>([]);
  const [topVals, setTopVals] = useState<Record<string, Array<{ value: string; count: number }>>>({});
  const [loadingTop, setLoadingTop] = useState<Record<string, boolean>>({});
  const [showSidebar, setShowSidebar] = useState<boolean>(false);
  const [activeFilterIdx, setActiveFilterIdx] = useState<number | null>(null);
  const usageKey = `analyticsFieldUsage:${publicationId}`;
  const [queryToShow, setQueryToShow] = useState<any | null>(null);
  const [queryView, setQueryView] = useState<"pretty" | "json">("pretty");

  async function run() {
    setErr(null); setResult(null);
    try {
      const def = { metric, metricField: metric !== "count" ? metricField : undefined, filters, groupBy: groupBy || undefined };
      setLastRunDef(def);
      const res = await fetch(`/api/publications/${publicationId}/analytics/run?debug=1`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(def),
      });
      const data = await readJsonSafe(res);
      if (!res.ok) throw new Error((data as any)?.error || `HTTP ${res.status}`);
      setResult(data as any);
      // surface SQL if present
      if ((data as any)?.sql) {
        (def as any).sql = (data as any).sql;
        setLastRunDef(def);
      }
      setResultVersion((v) => v + 1);
      // record usage for simple ranking
      try {
        const used: string[] = [];
        if (groupBy) used.push(groupBy);
        if (metric !== 'count' && metricField) used.push(metricField);
        for (const f of filters) if (f.field) used.push(f.field);
        if (used.length) recordUsage(used);
      } catch {}
    } catch (e: any) {
      setErr(e?.message || "Failed to run query");
    }
  }

  useEffect(() => {
    // minimal start — do not auto-run
    loadSaved();
    loadFields();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSaved() {
    try {
      const res = await fetch(`/api/publications/${publicationId}/analytics/queries`);
      const data = await readJsonSafe(res);
      if (res.ok) setSaved(((data as any)?.rows || []).map((r: any) => ({ id: r.id, name: r.name, definition: r.definition })));
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
      const data = await readJsonSafe(res);
      if (!res.ok) throw new Error((data as any)?.error || `HTTP ${res.status}`);
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
  async function readJsonSafe(res: Response) {
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      // try text for diagnostics
      try { const t = await res.text(); return { error: t || null }; } catch { return {}; }
    }
    try { return await res.json(); } catch { return {}; }
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

  async function loadFields() {
    try {
      const res = await fetch(`/api/publications/${publicationId}/analytics/fields`);
      const data = await res.json();
      if (res.ok) setFields(data?.fields || []);
    } catch {}
  }

  function fieldInfo(name: string | undefined) {
    if (!name) return undefined as any;
    return fields.find((f)=>f.key===name);
  }
  function allowedOpsFor(type: string | undefined): FilterOp[] {
    if (type === 'number') return ["eq","ne","in","nin","gt","gte","lt","lte"];
    if (type === 'boolean') return ["eq","ne","in","nin"];
    return ["eq","ne","in","nin"];
  }
  async function loadTop(field: string) {
    if (!field) return;
    setLoadingTop((m)=>({ ...m, [field]: true }));
    try {
      const res = await fetch(`/api/publications/${publicationId}/analytics/fields/values?field=${encodeURIComponent(field)}&limit=10`);
      const data = await res.json();
      if (res.ok) setTopVals((m)=>({ ...m, [field]: data?.values || [] }));
    } finally {
      setLoadingTop((m)=>({ ...m, [field]: false }));
    }
  }

  // auto-load top values when focusing a filter field
  useEffect(() => {
    if (activeFilterIdx == null) return;
    const f = filters[activeFilterIdx];
    if (!f || !f.field) return;
    if (!topVals[f.field]) loadTop(f.field);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilterIdx, filters]);

  function getUsage(): Record<string, number> {
    try { return JSON.parse(localStorage.getItem(usageKey) || '{}') || {}; } catch { return {}; }
  }
  function recordUsage(keys: string[]) {
    const cur = getUsage();
    for (const k of keys) cur[k] = (cur[k] || 0) + 1;
    try { localStorage.setItem(usageKey, JSON.stringify(cur)); } catch {}
  }
  function suggestedFieldKeys(max = 5): string[] {
    const regs = fields.map(f=>f.key);
    const usage = getUsage();
    const scored = regs.map(k => ({ k, s: usage[k] || 0 }));
    scored.sort((a,b)=> b.s - a.s || a.k.localeCompare(b.k));
    return scored.slice(0, max).map(x=>x.k);
  }
  function ensureOpFor(i: number, fieldKey: string) {
    const fi = fieldInfo(fieldKey);
    const ops = allowedOpsFor(fi?.type);
    setFilters((fs)=> fs.map((f, idx)=> idx!==i? f : (ops.includes(f.op) ? f : { ...f, op: ops[0] })));
  }

  function addFilter() {
    setFilters((f) => [...f, { field: "", op: "eq", value: "" }]);
  }
  function setF(i: number, patch: Partial<{ field: string; op: FilterOp; value: string }>) {
    setFilters((fs) => fs.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }
  function delF(i: number) { setFilters((fs) => fs.filter((_, idx) => idx !== i)); }

  return (
    <div className="space-y-4 w-full max-w-screen-2xl mx-auto">
      <div className="rounded-lg border p-4 space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs mb-1">Metric</label>
          <select className="input" value={metric} onChange={(e)=>setMetric(e.target.value as any)}>
            <option value="">select metric…</option>
            <option value="count">count</option>
            <option value="sum">sum</option>
            <option value="avg">avg</option>
            <option value="min">min</option>
            <option value="max">max</option>
          </select>
        </div>
        {metric && metric !== "count" && (
          <div>
            <label className="block text-xs mb-1">Field (numeric/boolean)</label>
            <div className="flex gap-2">
              <input className="input" value={metricField} onChange={(e)=>setMetricField(e.target.value)} placeholder="e.g., base_salary" />
              {fields.filter(f=> f.type==='number').slice(0,3).map((f)=>(
                <button key={f.key} className="btn-base btn-ghost btn-md" onClick={()=>setMetricField(f.key)}>{f.key}</button>
              ))}
            </div>
          </div>
        )}
          <div className="flex-1" />
          <button className="btn-base btn-primary btn-md" onClick={run} disabled={!metric || (metric !== 'count' && !metricField.trim())}>Run</button>
        </div>

        {/* Group by row */}
        <div>
          <label className="block text-xs mb-1">Group by (categorical)</label>
          <div className="flex flex-wrap gap-2">
            <input className="input" value={groupBy} onChange={(e)=>setGroupBy(e.target.value)} placeholder={fields.find(f=>f.type==='text')?.key || "country"} />
            {fields.filter(f=> f.type==='text' || f.type==='boolean').slice(0,6).map((f)=>(
              <button key={f.key} className="btn-base btn-ghost btn-md" onClick={()=>setGroupBy(f.key)}>{f.key}</button>
            ))}
          </div>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        <div className="md:col-span-2">
          <div className="text-sm font-medium mb-2">Filters</div>
          {filters.map((f, i) => {
          const fi = fieldInfo(f.field);
          const ops = allowedOpsFor(fi?.type);
          const valueIsList = f.op === 'in' || f.op === 'nin';
          return (
            <div key={i} className="mb-3 list-animate">
              <div className="flex gap-2 mb-1">
                <input className="input" value={f.field} placeholder="field key" onFocus={()=>{ setActiveFilterIdx(i); setShowSidebar(true); }} onChange={(e)=>{ setF(i,{field:e.target.value}); ensureOpFor(i, e.target.value);} } />
                <select className="input" value={f.op} onChange={(e)=>setF(i,{op:e.target.value as any})}>
                  {ops.map((o)=> (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
                {fi?.type === 'boolean' ? (
                  <select className="input" value={f.value} onChange={(e)=>setF(i,{value:e.target.value})}>
                    <option value="true">true</option>
                    <option value="false">false</option>
                    <option value="1">1</option>
                    <option value="0">0</option>
                  </select>
                ) : fi?.type === 'number' && !valueIsList ? (
                  <input type="number" className="input" placeholder="number" value={f.value} onChange={(e)=>setF(i,{value:e.target.value})} />
                ) : (
                  <input className="input" placeholder={valueIsList? 'a, b, c' : 'value'} value={f.value} onChange={(e)=>setF(i,{value:e.target.value})} />
                )}
                <button className="btn-base btn-ghost btn-md" onClick={()=>delF(i)}>Remove</button>
              </div>
              {fi?.samples && fi.samples.length ? (
                <div className="flex flex-wrap gap-1 ml-1">
                  {fi.samples.slice(0,8).map((s: string)=>(
                    <button key={s} className="btn-base btn-ghost btn-xs" onClick={()=>{
                      if (valueIsList) {
                        const cur = f.value ? f.value.split(',').map(x=>x.trim()).filter(Boolean) : [];
                        if (!cur.includes(s)) setF(i,{ value: [...cur, s].join(',') });
                      } else {
                        setF(i,{ value: s });
                      }
                    }}>{s}</button>
                  ))}
                </div>
              ) : null}
            </div>
          )
          })}
          <div className="flex items-center gap-2">
            <button className="btn-base btn-ghost btn-md" onClick={()=>{ addFilter(); setActiveFilterIdx(filters.length); setShowSidebar(true); }}>+ Add filter</button>
            {filters.length>0 && (
              <button className="btn-base btn-ghost btn-md" onClick={()=>{ setFilters([]); setActiveFilterIdx(null); setShowSidebar(false); }}>Clear</button>
            )}
          </div>
        </div>

        <div className="hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">Top values</div>
            {showSidebar ? (
              <button className="btn-base btn-ghost btn-xs" onClick={()=>setShowSidebar(false)}>Hide</button>
            ) : (
              <button className="btn-base btn-ghost btn-xs" onClick={()=>setShowSidebar(true)}>Show</button>
            )}
          </div>
          {!showSidebar ? (
            <div className="text-xs text-gray-600">Click Show or focus a filter field.</div>
          ) : activeFilterIdx == null ? (
            <div className="text-xs text-gray-600">
              Click a filter field to see values.
              <div className="mt-2">Popular fields:</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {suggestedFieldKeys(5).map(k => (
                  <button key={k} className="btn-base btn-ghost btn-xs" onClick={()=>{
                    const idx = filters.length ? (activeFilterIdx ?? 0) : 0;
                    if (filters.length === 0) { addFilter(); setActiveFilterIdx(0); }
                    setF(activeFilterIdx ?? 0, { field: k });
                    loadTop(k); setShowSidebar(true);
                  }}>{k}</button>
                ))}
              </div>
            </div>
          ) : !filters[activeFilterIdx]?.field ? (
            <div className="text-xs text-gray-600">Enter a field key first.</div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-gray-700">for <span className="font-mono">{filters[activeFilterIdx].field}</span></div>
              <div className="flex flex-wrap gap-1">
                {topVals[filters[activeFilterIdx].field]?.length ? (
                  topVals[filters[activeFilterIdx].field].map((t)=> (
                    <button key={filters[activeFilterIdx].field+':'+t.value} className="btn-base btn-ghost btn-xs" title={`${t.count} matches`} onClick={()=>{
                      const idx = activeFilterIdx;
                      if (idx == null) return;
                      const cur = filters[idx];
                      if (!cur) return;
                      const valueIsList = cur.op === 'in' || cur.op === 'nin';
                      if (valueIsList) {
                        const list = cur.value ? cur.value.split(',').map(x=>x.trim()).filter(Boolean) : [];
                        if (!list.includes(t.value)) setF(idx,{ value: [...list, t.value].join(',') });
                      } else {
                        setF(idx,{ value: t.value });
                      }
                    }}>{t.value}</button>
                  ))
                ) : (
                  <div className="space-y-2">
                    <div className="text-xs text-gray-600">No values found for this field. Try one of these:</div>
                    <div className="flex flex-wrap gap-1">
                      {suggestedFieldKeys(5).map(k => (
                        <button key={k} className="btn-base btn-ghost btn-xs" onClick={()=>{
                          setF(activeFilterIdx, { field: k, value: '' });
                          loadTop(k);
                        }}>{k}</button>
                      ))}
                    </div>
                    <button className="btn-base btn-ghost btn-xs" onClick={()=>loadTop(filters[activeFilterIdx].field)} disabled={loadingTop[filters[activeFilterIdx].field]}>Retry</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        {/* Save row */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-xs mb-1">Save as</label>
            <div className="flex gap-2">
              <input className="input" placeholder="Query name" value={savingName} onChange={(e)=>setSavingName(e.target.value)} />
              <button className="btn-base btn-md" onClick={save}>Save</button>
            </div>
          </div>
          <div>
            <label className="block text-xs mb-1">Export</label>
            <button className="btn-base btn-md" onClick={exportCSV} disabled={!result?.table?.length}>CSV</button>
          </div>
        </div>

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

      {/* Results header with single display switch */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600 flex items-center gap-2">
          <span>Results</span>
          <button
            className="btn-base btn-ghost btn-xs"
            onClick={() => { setQueryToShow(lastRunDef || { metric, metricField: metric !== 'count' ? metricField : undefined, filters, groupBy: groupBy || undefined }); setQueryView('pretty'); setShowQueryModal(true); }}
            title="Show executed query"
          >
            Show query
          </button>
        </div>
        <div className="flex gap-2">
          {(['table','barV','barH','pie','line'] as const).map(opt => (
            <button
              key={opt}
              className={`btn-base btn-xs ${display===opt? 'btn-primary' : 'btn-ghost'}`}
              onClick={()=>setDisplay(opt)}
            >{opt}</button>
          ))}
        </div>
      </div>
      <div key={`${display}-${resultVersion}`} className="swap-animate">
        <ResultsView result={result} viewMode={display==='table' ? 'table' : 'chart'} chartType={display==='table' ? 'barV' : display as any} />
      </div>

      {showQueryModal && queryToShow && (
        <Modal onClose={() => setShowQueryModal(false)} contentClassName="max-w-xl w-[90vw]">
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <div className="font-semibold text-sm">Executed Query</div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">View:</span>
              <button className={`btn-base btn-xs ${queryView==='pretty'?'btn-primary':'btn-ghost'}`} onClick={()=>setQueryView('pretty')}>Pretty</button>
              <button className={`btn-base btn-xs ${queryView==='json'?'btn-primary':'btn-ghost'}`} onClick={()=>setQueryView('json')}>JSON</button>
              {queryToShow?.sql && (
                <button className={`btn-base btn-xs ${queryView==='sql'?'btn-primary':'btn-ghost'}`} onClick={()=>setQueryView('sql')}>SQL</button>
              )}
              <button
                className="btn btn-xs"
                onClick={() => {
                  const text = queryView==='json' ? JSON.stringify(queryToShow, null, 2) : queryView==='sql' ? String(queryToShow?.sql || '') : readableString(queryToShow);
                  try { navigator.clipboard.writeText(text); } catch {}
                }}
              >Copy</button>
              <button className="btn btn-xs" onClick={() => setShowQueryModal(false)}>Close</button>
            </div>
          </div>
          <div className="p-4">
            {queryView === 'json' ? (
              <pre className="text-xs whitespace-pre-wrap border rounded p-2 bg-gray-50">{JSON.stringify(queryToShow, null, 2)}</pre>
            ) : queryView === 'sql' ? (
              <pre className="text-xs whitespace-pre-wrap border rounded p-2 bg-gray-50">
{String(queryToShow?.sql || '')}
              </pre>
            ) : (
              <div className="text-xs font-mono border rounded p-3 bg-white leading-5">
                {readableView(queryToShow)}
              </div>
            )}
          </div>
        </Modal>
      )}

      {showSidebar && (
        <div className="fixed right-6 top-32 w-80 z-40">
          <div className="border rounded-lg bg-white p-3 shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Top values</div>
              <button className="btn-base btn-ghost btn-xs" onClick={()=>setShowSidebar(false)}>Hide</button>
            </div>
            {activeFilterIdx == null ? (
              <div className="text-xs text-gray-600">
                Click a filter field to see values.
                <div className="mt-2">Popular fields:</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {suggestedFieldKeys(5).map(k => (
                    <button key={k} className="btn-base btn-ghost btn-xs" onClick={()=>{
                      const idx = filters.length ? (activeFilterIdx ?? 0) : 0;
                      if (filters.length === 0) { addFilter(); setActiveFilterIdx(0); }
                      setF(activeFilterIdx ?? 0, { field: k });
                      loadTop(k);
                    }}>{k}</button>
                  ))}
                </div>
              </div>
            ) : !filters[activeFilterIdx]?.field ? (
              <div className="text-xs text-gray-600">Enter a field key first.</div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs text-gray-700">for <span className="font-mono">{filters[activeFilterIdx].field}</span></div>
                {/* Values area */}
                <div className="flex flex-wrap gap-1">
                  {topVals[filters[activeFilterIdx].field]?.length ? (
                    topVals[filters[activeFilterIdx].field].map((t)=> (
                      <button key={filters[activeFilterIdx].field+':'+t.value} className="btn-base btn-ghost btn-xs" title={`${t.count} matches`} onClick={()=>{
                        const idx = activeFilterIdx;
                        if (idx == null) return;
                        const cur = filters[idx];
                        if (!cur) return;
                        const valueIsList = cur.op === 'in' || cur.op === 'nin';
                        if (valueIsList) {
                          const list = cur.value ? cur.value.split(',').map(x=>x.trim()).filter(Boolean) : [];
                          if (!list.includes(t.value)) setF(idx,{ value: [...list, t.value].join(',') });
                        } else {
                          setF(idx,{ value: t.value });
                        }
                      }}>{t.value}</button>
                    ))
                  ) : topVals[filters[activeFilterIdx].field] && !loadingTop[filters[activeFilterIdx].field] ? (
                    <div className="text-xs text-gray-600">
                      No values found for this field. Try one of these keys:
                      <div className="flex flex-wrap gap-1 mt-1">
                        {suggestedFieldKeys(5).map(k => (
                          <button key={k} className="btn-base btn-ghost btn-xs" onClick={()=>{ setF(activeFilterIdx, { field: k, value: '' }); loadTop(k); }}>{k}</button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <button className="btn-base btn-ghost btn-xs" onClick={()=>loadTop(filters[activeFilterIdx].field)} disabled={loadingTop[filters[activeFilterIdx].field]}>{loadingTop[filters[activeFilterIdx].field] ? 'Loading…' : 'Load top 10'}</button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function readableView(def: any) {
  const filters = Array.isArray(def?.filters) ? def.filters : [];
  return (
    <div className="space-y-1">
      <div>
        <span className="text-gray-500">metric:</span>
        <span className="text-pink-600 ml-1">{def?.metric || 'count'}</span>
        {def?.metric && def.metric !== 'count' && def?.metricField ? (
          <>
            <span className="text-gray-500 mx-1">on</span>
            <span className="text-blue-600 font-mono">{def.metricField}</span>
          </>
        ) : null}
      </div>
      <div>
        <span className="text-gray-500">group by:</span>
        {def?.groupBy ? (
          <span className="text-blue-600 font-mono ml-1">{def.groupBy}</span>
        ) : (
          <span className="text-gray-400 ml-1">none</span>
        )}
      </div>
      <div>
        <span className="text-gray-500">filters:</span>
        {!filters.length && <span className="text-gray-400 ml-1">none</span>}
      </div>
      {filters.map((f: any, i: number) => (
        <div key={i} className="pl-3">
          <span className="text-blue-600 font-mono">{f.field}</span>
          <span className="text-purple-600 mx-1">{f.op}</span>
          {f.op === 'in' || f.op === 'nin' ? (
            <span className="text-emerald-700">[{String(f.value)}]</span>
          ) : (
            <span className="text-emerald-700">{String(f.value)}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function readableString(def: any) {
  const parts: string[] = [];
  const metric = def?.metric || 'count';
  if (metric === 'count') {
    parts.push(`metric: count`);
  } else {
    parts.push(`metric: ${metric} on ${def?.metricField ?? '?'}`);
  }
  parts.push(`group by: ${def?.groupBy ?? 'none'}`);
  const filters = Array.isArray(def?.filters) ? def.filters : [];
  if (!filters.length) {
    parts.push(`filters: none`);
  } else {
    parts.push(`filters:`);
    for (const f of filters) {
      parts.push(`  ${f.field} ${f.op} ${Array.isArray(f.value) ? `[${f.value.join(', ')}]` : String(f.value)}`);
    }
  }
  return parts.join('\n');
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
