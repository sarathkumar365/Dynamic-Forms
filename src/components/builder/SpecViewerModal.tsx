"use client";
import React from "react";
import Modal from "@/components/ui/Modal";

export default function SpecViewerModal({
  spec,
  compiled,
  onClose,
}: {
  spec: any;
  compiled: { schema: any; uiSchema: any };
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState<"schema" | "ui" | "meta">("schema");

  const pretty = (v: any) => {
    try {
      return JSON.stringify(v, null, 2);
    } catch {
      return String(v);
    }
  };

  const meta = compiled?.uiSchema?.["ui:meta"] ?? {};

  const copy = async (value: any) => {
    try {
      await navigator.clipboard.writeText(pretty(value));
    } catch {
      /* no-op */
    }
  };

  const download = (value: any, filename: string) => {
    const blob = new Blob([pretty(value)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const rightData = tab === "schema" ? compiled?.schema : tab === "ui" ? compiled?.uiSchema : meta;
  const rightName = tab === "schema" ? "compiled.schema.json" : tab === "ui" ? "compiled.ui-schema.json" : "compiled.meta.json";

  return (
    <Modal onClose={onClose} contentClassName="w-[95vw] max-w-6xl h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="font-semibold">Spec & Compile Viewer</div>
          <div className="flex items-center gap-2">
            <button className="btn btn-xs" onClick={() => download(spec, "formspec.json")}>Download FormSpec</button>
            <button className="btn btn-xs" onClick={() => download(rightData, rightName)}>Download {tab === "schema" ? "Schema" : tab === "ui" ? "UI Schema" : "Meta"}</button>
            <button className="btn btn-xs" onClick={onClose}>Close</button>
          </div>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-0 overflow-hidden">
          {/* Left: FormSpec */}
          <div className="h-full border-r overflow-auto p-3">
            <div className="mb-2 text-xs font-medium text-gray-700 flex items-center justify-between">
              <span>FormSpec (authoring)</span>
              <div className="flex items-center gap-2">
                <button className="btn btn-xs" onClick={() => copy(spec)}>Copy</button>
              </div>
            </div>
            <pre className="text-xs whitespace-pre-wrap">{pretty(spec)}</pre>
          </div>
          {/* Right: Compiled */}
          <div className="h-full overflow-auto p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-medium text-gray-700">
                Compiled —
                <button
                  className={`ml-2 text-xs px-2 py-1 rounded ${tab === "schema" ? "bg-black text-white" : "border"}`}
                  onClick={() => setTab("schema")}
                >
                  JSON Schema
                </button>
                <button
                  className={`ml-2 text-xs px-2 py-1 rounded ${tab === "ui" ? "bg-black text-white" : "border"}`}
                  onClick={() => setTab("ui")}
                >
                  UI Schema
                </button>
                <button
                  className={`ml-2 text-xs px-2 py-1 rounded ${tab === "meta" ? "bg-black text-white" : "border"}`}
                  onClick={() => setTab("meta")}
                >
                  Meta
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn btn-xs" onClick={() => copy(rightData)}>Copy</button>
              </div>
            </div>
            <pre className="text-xs whitespace-pre-wrap">{pretty(rightData)}</pre>
          </div>
        </div>
    </Modal>
  );
}
