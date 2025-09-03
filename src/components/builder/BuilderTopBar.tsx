"use client";
import { useState } from "react";
import { validateFormSpec } from "@/lib/formspec/validators";
import { ensureKeys } from "@/hooks/useFormSpec";

export default function BuilderTopBar({
  getFormSpec,
  onOpenRules,
}: {
  getFormSpec: () => any;
  onOpenRules: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setStatus("saving");
    setError(null);
    let spec = getFormSpec();
    spec = ensureKeys(spec);
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
      <button className="btn" onClick={save} disabled={status === "saving" || !name.trim()}>
        {status === "saving" ? "Saving…" : "Save"}
      </button>
      <button className="btn" onClick={onOpenRules}>Rules</button>
      {status === "error" && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}

