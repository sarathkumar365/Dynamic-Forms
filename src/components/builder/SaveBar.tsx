"use client";
import { useRef, useState } from "react";
import { validateFormSpec } from "@/lib/formspec/validators";
import { ensureKeys } from "@/hooks/useFormSpec";
import Modal from "@/components/ui/Modal";

export default function SaveBar({ getFormSpec }: { getFormSpec: () => any }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [showIssues, setShowIssues] = useState(false);
  const [issues, setIssues] = useState<Array<{ page: string; section: string; label: string; reason: string }>>([]);
  const specDraftRef = useRef<any | null>(null);

  async function save() {
    setStatus("saving");
    setError(null);
    let spec = getFormSpec();
    // Ensure all keys are valid before saving
    spec = ensureKeys(spec);
    // Collect authoring issues that would cause invalid compiled schema
    const found: Array<{ page: string; section: string; label: string; reason: string }> = [];
    spec.pages.forEach((p: any) =>
      (p.sections || []).forEach((s: any) =>
        (s.questions || []).forEach((q: any) => {
          if (q.type === "select" && (!Array.isArray(q.options) || q.options.length === 0)) {
            found.push({ page: p.title, section: s.title, label: q.label, reason: "Select has no options" });
          }
        })
      )
    );
    if (found.length) {
      specDraftRef.current = spec;
      setIssues(found);
      setShowIssues(true);
      setStatus("idle");
      return;
    }
    // Validate before saving
    const validation = validateFormSpec({
      ...spec,
      version: "1.0",
      id: "temp",
    });
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
          title: name,
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
    // Coerce empty selects into plain text fields (string)
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
    // Now run the normal save pipeline with coerced spec
    (async () => {
      try {
        setStatus("saving");
        const validation = validateFormSpec({ ...next, version: '1.0', id: 'temp' });
        if (!validation.ok) {
          setError(validation.errors.join("\n"));
          setStatus("error");
          return;
        }
        const res = await fetch("/api/forms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: name, description, pages: next.pages, rules: next.rules }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        window.location.href = `/forms/${data.id}`;
      } catch (e: any) {
        setError(e?.message || 'Save failed');
        setStatus('error');
      } finally {
        setStatus((s) => (s === 'saving' ? 'idle' : s));
      }
    })();
  }

  return (
    <div className="sticky top-0 z-10 mb-3 flex items-center gap-2 bg-white/70 backdrop-blur rounded-xl border p-3">
      <input
        className="input"
        placeholder="Form name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="input"
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <button
        className="btn"
        onClick={save}
        disabled={status === "saving" || !name.trim()}
      >
        {status === "saving" ? "Saving…" : "Save Form"}
      </button>
      {status === "error" && (
        <span className="text-sm text-red-600">{error}</span>
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
