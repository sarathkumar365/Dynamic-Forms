"use client";
import { FormSpec, FSQuestion } from "@/types/formspec";
import { useMemo } from "react";

export default function Inspector({
  spec, selectedId, updateQuestion
}: { spec: FormSpec; selectedId: string | null; updateQuestion: (qid:string, patch: Partial<FSQuestion>)=>void }) {
  const q = useMemo(() => {
    if (!selectedId) return null;
    for (const p of spec.pages) for (const s of p.sections) {
      const hit = s.questions.find(x => x.id === selectedId);
      if (hit) return hit;
    }
    return null;
  }, [spec, selectedId]);

  if (!q) return <div className="text-sm text-muted-foreground">Select a question…</div>;

  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Inspector</h3>
      <label className="block text-sm">Label
        <input className="input w-full" value={q.label} onChange={e => updateQuestion(q.id, { label: e.target.value })}/>
      </label>
      <label className="block text-sm">Help
        <input className="input w-full" value={q.help ?? ""} onChange={e => updateQuestion(q.id, { help: e.target.value })}/>
      </label>
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" checked={!!q.required} onChange={e => updateQuestion(q.id, { required: e.target.checked })}/>
        Required
      </label>
      {["select","multiselect"].includes(q.type) && (
        <OptionsEditor q={q} update={updateQuestion} />
      )}
    </div>
  );
}

function OptionsEditor({ q, update }: { q: FSQuestion; update:(qid:string, patch:Partial<FSQuestion>)=>void }) {
  const opts = q.options ?? [];
  const add = () => update(q.id, { options: [...opts, { value: `opt_${opts.length+1}`, label: `Option ${opts.length+1}` }] });
  const set = (i:number, key:"value"|"label", v:string) => {
    const next = opts.slice(); (next[i] as any)[key] = v; update(q.id, { options: next });
  };
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Options</div>
      {opts.map((o, i) => (
        <div className="flex gap-2" key={i}>
          <input className="input" value={o.label} onChange={e => set(i, "label", e.target.value)} placeholder="Label"/>
          <input className="input" value={o.value} onChange={e => set(i, "value", e.target.value)} placeholder="Value"/>
        </div>
      ))}
      <button className="btn btn-sm" onClick={add}>Add option</button>
    </div>
  );
}
