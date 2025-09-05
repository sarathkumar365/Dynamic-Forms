"use client";
import { useRef, useState } from "react";
import { validateFormSpec } from "@/lib/formspec/validators";
import { ensureKeys } from "@/hooks/useFormSpec";
import Modal from "@/components/ui/Modal";

export default function BuilderTopBar({
  getFormSpec,
  onOpenRules,
  previewOpen,
  onTogglePreview,
  onOpenSpecViewer,
  onOpenImport,
}: {
  getFormSpec: () => any;
  onOpenRules: () => void;
  previewOpen: boolean;
  onTogglePreview: () => void;
  onOpenSpecViewer: () => void;
  onOpenImport: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<Array<{ page: string; section: string; label: string; reason: string }>>([]);
  const [showIssues, setShowIssues] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const specDraftRef = useRef<any | null>(null);

  async function save() {
    setStatus("saving");
    setError(null);
    let spec = getFormSpec();
    spec = ensureKeys(spec);
    // preflight authoring issues for selects without options
    const found: Array<{ page: string; section: string; label: string; reason: string }> = [];
    (spec.pages || []).forEach((p: any) =>
      (p.sections || []).forEach((s: any) =>
        (s.questions || []).forEach((q: any) => {
          if (q.type === 'select' && (!Array.isArray(q.options) || q.options.length === 0)) {
            found.push({ page: p.title, section: s.title, label: q.label, reason: 'Select has no options' });
          }
        })
      )
    );
    if (found.length) {
      specDraftRef.current = spec;
      setIssues(found);
      setShowIssues(true);
      setStatus('idle');
      return;
    }
    const validation = validateFormSpec({ ...spec, version: "1.0", id: "temp" });
    if (!validation.ok) {
      setError(validation.errors.join("\n"));
      setStatus("error");
      return;
    }
    try {
      const res = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: name || spec.title || "Untitled Form",
          description,
          pages: spec.pages,
          rules: spec.rules,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      window.location.href = `/forms/${data.id}`;
    } catch (e: any) {
      setError(e?.message || "Save failed");
      setStatus("error");
    } finally {
      setStatus((s) => (s === "saving" ? "idle" : s));
    }
  }

  function proceedWithFallback() {
    const spec = specDraftRef.current;
    if (!spec) { setShowIssues(false); return; }
    const next = { ...spec, pages: spec.pages.map((p: any) => ({
      ...p,
      sections: p.sections.map((s: any) => ({
        ...s,
        questions: s.questions.map((q: any) => {
          if (q.type === 'select' && (!Array.isArray(q.options) || q.options.length === 0)) {
            const { options, ...rest } = q;
            return { ...rest, type: 'text' };
          }
          return q;
        })
      }))
    })) };
    specDraftRef.current = null;
    setShowIssues(false);
    (async () => {
      try {
        setStatus('saving');
        const v = validateFormSpec({ ...next, version: '1.0', id: 'temp' });
        if (!v.ok) { setError(v.errors.join('\n')); setStatus('error'); return; }
        const res = await fetch('/api/forms', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: name || next.title || 'Untitled Form', description, pages: next.pages, rules: next.rules })
        });
        const data = await res.json(); if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        window.location.href = `/forms/${data.id}`;
      } catch(e:any) { setError(e?.message || 'Save failed'); setStatus('error'); }
      finally { setStatus((s)=> (s==='saving'?'idle':s)); }
    })();
  }

  return (
    <div className="sticky top-0 z-10 mb-3 flex flex-wrap items-center gap-2 bg-white rounded-xl border p-3 w-full shadow-sm">
      {/* Save opens modal */}
      <button
        className="btn-base btn-primary btn-sm"
        onClick={() => setShowSaveModal(true)}
        disabled={status === 'saving'}
        title="Save"
      >
        {status === 'saving' ? 'Saving…' : 'Save'}
      </button>

      {/* Toggle Preview icon */}
      <button
        className="btn-base btn-ghost btn-sm btn-square-sm"
        onClick={onTogglePreview}
        title={previewOpen ? 'Hide Preview' : 'Show Preview'}
        aria-label={previewOpen ? 'Hide Preview' : 'Show Preview'}
      >
        {previewOpen ? <EyeOffIcon /> : <EyeIcon />}
      </button>

      {/* Import JSON icon */}
      <button className="btn-base btn-ghost btn-sm btn-square-sm" onClick={onOpenImport} title="Import JSON" aria-label="Import JSON">
        <ImportIcon />
      </button>

      {/* Show JSON icon */}
      <button className="btn-base btn-ghost btn-sm btn-square-sm" onClick={onOpenSpecViewer} title="Show JSON" aria-label="Show JSON">
        <CodeIcon />
      </button>

      {/* Small: Validate and Rules */}
      <button
        className="btn-base btn-ghost btn-sm"
        onClick={() => {
          const spec = getFormSpec();
          const v = validateFormSpec({ ...spec, version: '1.0', id: 'tmp' });
          alert(v.ok ? 'Spec looks good!' : v.errors.join('\n'));
        }}
        title="Validate"
      >
        Validate
      </button>
      <button className="btn-base btn-ghost btn-sm" onClick={onOpenRules} title="Rules">Rules</button>

      {status === "error" && <span className="text-sm text-red-600 ml-auto">{error}</span>}

      {/* Save modal collecting name/description */}
      {showSaveModal && (
        <Modal onClose={() => setShowSaveModal(false)} contentClassName="max-w-lg w-[90vw]">
          <div className="px-4 py-3 border-b">
            <div className="font-semibold">Save Form</div>
          </div>
          <div className="p-4 space-y-3">
            <label className="block text-sm">
              Name
              <input className="input w-full" value={name} onChange={(e)=>setName(e.target.value)} placeholder="Form name" />
            </label>
            <label className="block text-sm">
              Description (optional)
              <input className="input w-full" value={description} onChange={(e)=>setDescription(e.target.value)} placeholder="Description" />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-base btn-ghost btn-md" onClick={()=>setShowSaveModal(false)}>Cancel</button>
              <button className="btn-base btn-primary btn-md" onClick={()=>{ setShowSaveModal(false); save(); }} disabled={!name.trim() || status==='saving'}>
                Save
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showIssues && (
        <Modal onClose={() => setShowIssues(false)} contentClassName="max-w-xl w-[90vw]">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="font-semibold text-sm">Please review before saving</div>
            <button className="btn btn-xs" onClick={() => setShowIssues(false)}>Close</button>
          </div>
          <div className="p-4 space-y-3">
            <div className="text-sm">Some fields need options:</div>
            <ul className="text-xs list-disc pl-5">
              {issues.map((it, i) => (
                <li key={i}><span className="text-gray-600">{it.page} ▸ {it.section} ▸ </span><b>{it.label}</b> — {it.reason}</li>
              ))}
            </ul>
            <div className="text-xs text-gray-700 bg-yellow-50 border rounded p-2">
              If you don’t add options, these select fields will fallback to a plain text field (string) when saving.
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-base btn-ghost btn-md" onClick={() => setShowIssues(false)}>Fix now</button>
              <button className="btn-base btn-primary btn-md" onClick={proceedWithFallback}>Proceed with fallback</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Kebab({ items }: { items: { label: string; onClick: () => void }[] }) {
  // Legacy kebab – no longer used, kept for compatibility if referenced.
  return null as any;
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17.94 17.94C16.2 19.22 14.19 20 12 20 5 20 1 12 1 12a21.8 21.8 0 0 1 5.06-6.94"/>
      <path d="M9.9 4.24A10.66 10.66 0 0 1 12 4c7 0 11 8 11 8a21.86 21.86 0 0 1-3.87 5.14"/>
      <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}
function ImportIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v12"/>
      <path d="M8 11l4 4 4-4"/>
      <path d="M20 21H4a2 2 0 0 1-2-2v-3"/>
    </svg>
  );
}
function CodeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="16 18 22 12 16 6"/>
      <polyline points="8 6 2 12 8 18"/>
    </svg>
  );
}
