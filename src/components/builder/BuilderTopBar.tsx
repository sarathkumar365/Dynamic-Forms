"use client";
import { useState } from "react";
import { validateFormSpec } from "@/lib/formspec/validators";
import { ensureKeys } from "@/hooks/useFormSpec";

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
    <div className="sticky top-0 z-10 mb-3 flex flex-wrap items-center gap-3 bg-white rounded-xl border p-4 w-full shadow-sm">
      <input
        className="input input-lg flex-1 basis-[260px] min-w-[220px]"
        placeholder="Form name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="input input-lg flex-[2] basis-[420px] min-w-[260px]"
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <button className="btn-base btn-primary btn-md ml-auto shrink-0" onClick={save} disabled={status === "saving" || !name.trim()}>
        {status === "saving" ? "Saving…" : "Save"}
      </button>
      <button className="btn-base btn-primary btn-md shrink-0" onClick={onTogglePreview}>{previewOpen ? 'Hide Preview' : 'Show Preview'}</button>

      {/* Kebab menu for secondary actions */}
      <Kebab
        items={[
          { label: 'Import JSON', onClick: onOpenImport },
          { label: 'Rules', onClick: onOpenRules },
          { label: 'View JSON', onClick: onOpenSpecViewer },
          { label: 'Validate', onClick: () => {
              const spec = getFormSpec();
              const v = validateFormSpec({ ...spec, version: '1.0', id: 'tmp' });
              alert(v.ok ? 'Spec looks good!' : v.errors.join('\n'));
            }
          }
        ]}
      />
      {status === "error" && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}

function Kebab({ items }: { items: { label: string; onClick: () => void }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button className="btn-base btn-primary btn-md btn-square" aria-label="More" onClick={() => setOpen((v) => !v)}>⋯</button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-lg border bg-white shadow">
          {items.map((it, i) => (
            <button
              key={i}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
              onClick={() => { setOpen(false); it.onClick(); }}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
