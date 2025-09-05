"use client";
import React, { useState } from "react";

type Msg = { role: "user" | "assistant"; content: string; result?: any };

export default function ChatClient({ publicationId }: { publicationId: string }) {
  const [messages, setMessages] = useState<Msg[]>([{
    role: "assistant",
    content: "Ask me analytics questions like: 'count responses', 'count by country', 'sum salary where country = US', 'avg age by department where country in US,CA'."
  }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [fields, setFields] = useState<Array<{ key: string; type: string }>>([]);
  const [useAi, setUseAi] = useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/publications/${publicationId}/analytics/fields`);
        const data = await res.json();
        if (res.ok) setFields((data?.fields || []).map((f: any) => ({ key: f.key, type: f.type })));
      } catch {}
    })();
  }, [publicationId]);

  async function send() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setBusy(true);
    try {
      const path = useAi ? `/api/publications/${publicationId}/analytics/chat/ai` : `/api/publications/${publicationId}/analytics/chat`;
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: next.slice(-6) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      const suffix = data?.warning ? `\n(${data.warning})` : '';
      setMessages((m) => [...m, { role: "assistant", content: (data.text || '') + suffix, result: data.result }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: "assistant", content: e?.message || "Something went wrong" }]);
    } finally {
      setBusy(false);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const last = messages[messages.length - 1]?.result;

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-3 h-64 overflow-auto bg-white">
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`${m.role === 'user' ? 'text-right' : 'text-left'} msg-animate`}>
              <div className={`inline-block px-3 py-2 rounded-lg text-sm ${m.role === 'user' ? 'bg-black text-white' : 'bg-gray-100'}`}>{m.content}</div>
            </div>
          ))}
        </div>
      </div>
      {fields.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {fields.slice(0, 12).map((f) => (
            <button key={f.key} className="btn-base btn-ghost btn-sm px-3 py-1.5" title={f.type}
              onClick={() => setInput((s) => s ? `${s} ${f.key}` : `count by ${f.key}`)}>
              {f.key}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2 items-center">
        <input className="input flex-1" placeholder="Ask a question..." value={input} onChange={(e)=>setInput(e.target.value)} onKeyDown={onKey} />
        <div className="flex items-center gap-2 mr-1" title="Toggle AI natural-language parsing">
          <span className={useAi ? 'ai-nlq-on' : 'text-xs text-gray-600'}>AI NLQ</span>
          <button
            type="button"
            aria-pressed={useAi}
            onClick={() => setUseAi(v => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-150 ${useAi ? 'bg-black' : 'bg-gray-300'}`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-150 ${useAi ? 'translate-x-5' : 'translate-x-1'}`}
            />
          </button>
        </div>
        <button className="btn" onClick={send} disabled={busy}>Send</button>
      </div>

      {last && (
        <div className="space-y-3 swap-animate">
          {last.series && last.series.labels?.length ? (
            <Bar labels={last.series.labels} data={last.series.data} />
          ) : last.value !== undefined ? (
            <div className="rounded-lg border p-3 text-sm">Value: <span className="font-mono">{String(last.value)}</span></div>
          ) : (
            <div className="rounded-lg border p-3 text-sm text-gray-600">No results</div>
          )}
          {last.table && last.table.length ? (
            <div className="overflow-auto rounded-lg border">
              <table className="table">
                <thead><tr>{Object.keys(last.table[0]).map((h:string)=>(<th key={h}>{h}</th>))}</tr></thead>
                <tbody>
                  {last.table.map((row: any, idx: number)=>(
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
          <div className="flex-1 h-3 bg-gray-100 rounded relative">
            <div className="absolute left-0 top-0 bottom-0 bg-black rounded chart-barh-fill" style={{ ['--w' as any]: `${(data[i] / max) * 100}%` }} />
          </div>
          <div className="w-12 text-right text-xs">{data[i]}</div>
        </div>
      ))}
    </div>
  );
}
