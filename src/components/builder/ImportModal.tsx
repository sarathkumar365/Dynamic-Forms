"use client";
import React, { useMemo, useState } from "react";
import { importJson, detectFormat } from "@/lib/formspec/importers";
import { compileFormSpec } from "@/lib/formspec/compile";
import PreviewPane from "@/components/builder/PreviewPane";

export default function ImportModal({ onClose }: { onClose: () => void }) {
  const [raw, setRaw] = useState("{\n  \"title\": \"Contact\",\n  \"type\": \"object\",\n  \"properties\": {\n    \"name\": { \"type\": \"string\", \"title\": \"Name\" },\n    \"email\": { \"type\": \"string\", \"format\": \"email\", \"title\": \"Email\" }\n  },\n  \"required\": [\"name\", \"email\"]\n}");
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [spec, setSpec] = useState<any | null>(null);
  const [tab, setTab] = useState<"paste" | "validate" | "preview">("paste");

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setRaw(String(reader.result || ""));
    reader.readAsText(f);
  }

  function runImport() {
    setError(null); setWarnings([]); setSpec(null);
    try {
      const json = JSON.parse(raw);
      detectFormat(json); // for label, if needed later
      const { spec, warnings } = importJson(json);
      setSpec(spec);
      setWarnings(warnings);
      setTab("validate");
    } catch (e: any) {
      setError(e?.message || String(e));
      setTab("validate");
    }
  }

  const compiled = useMemo(() => (spec ? compileFormSpec(spec) : null), [spec]);

  async function createForm() {
    if (!spec) return;
    try {
      const res = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: spec.title || "Imported Form", description: spec.description, pages: spec.pages, rules: spec.rules }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      window.location.href = `/forms/${data.id}`;
    } catch (e: any) {
      setError(e?.message || "Create failed");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-[95vw] max-w-6xl h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="font-semibold">Import JSON</div>
          <div className="flex items-center gap-2">
            <button className="btn-base btn-primary btn-md" onClick={onClose}>Close</button>
          </div>
        </div>
        <div className="px-4 pt-3">
          <div className="flex gap-2 text-sm">
            <button className={`px-2 py-1 rounded ${tab==='paste'?'bg-black text-white':'border'}`} onClick={()=>setTab('paste')}>Paste</button>
            <button className={`px-2 py-1 rounded ${tab==='validate'?'bg-black text-white':'border'}`} onClick={()=>setTab('validate')}>Validate</button>
            <button className={`px-2 py-1 rounded ${tab==='preview'?'bg-black text-white':'border'}`} onClick={()=>setTab('preview')} disabled={!spec}>Preview</button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {tab === 'paste' && (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-600 mb-2">Paste JSON (FormSpec or JSON Schema)</div>
                <textarea className="w-full h-[50vh] border rounded-lg p-2 font-mono text-xs" value={raw} onChange={(e)=>setRaw(e.target.value)} />
                <div className="mt-2 flex items-center gap-2">
                  <input type="file" accept="application/json,.json" onChange={handleFile} />
                  <button className="btn-base btn-primary btn-md" onClick={runImport}>Validate</button>
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-2">Tips</div>
                <ul className="list-disc pl-5 text-xs text-gray-700 space-y-1">
                  <li>Supports FormSpec 1.0 and JSON Schema (Draft‑07).</li>
                  <li>Enum → Select; array of enum → Multi‑select.</li>
                  <li>if/then with const conditions converts to rules.</li>
                </ul>
              </div>
            </div>
          )}
          {tab === 'validate' && (
            <div className="space-y-3">
              {error ? (
                <div className="text-sm text-red-600 whitespace-pre-wrap">{error}</div>
              ) : (
                <>
                  <div className="text-sm text-green-700">Parsed successfully.</div>
                  {warnings.length ? (
                    <div className="text-xs text-yellow-700 whitespace-pre-wrap">Warnings:{"\n"}{warnings.join("\n")}</div>
                  ) : (
                    <div className="text-xs text-gray-600">No warnings.</div>
                  )}
                  {spec && (
                    <div>
                      <div className="text-xs font-medium mb-1">FormSpec</div>
                      <pre className="text-xs whitespace-pre-wrap border rounded p-2">{JSON.stringify(spec, null, 2)}</pre>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <button className="btn-base btn-primary btn-md" onClick={()=>setTab('preview')} disabled={!spec}>Preview</button>
                    <button className="btn-base btn-primary btn-md" onClick={createForm} disabled={!spec}>Create Form</button>
                  </div>
                </>
              )}
            </div>
          )}
          {tab === 'preview' && spec && compiled && (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-medium mb-1">Compiled (Schema)</div>
                <pre className="text-xs whitespace-pre-wrap border rounded p-2">{JSON.stringify(compiled.schema, null, 2)}</pre>
              </div>
              <div>
                <PreviewPane compiled={compiled as any} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
