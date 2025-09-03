"use client";
import { useFormSpec } from "@/hooks/useFormSpec";
import QuestionPalette from "./QuestionPalette";
import BuilderCanvas from "./BuilderCanvas";
import Inspector from "./Inspector";
import RuleBuilder from "./RuleBuilder";
import ActionRules from "./ActionRules";
import BuilderTopBar from "./BuilderTopBar";
import PreviewDrawer from "./PreviewDrawer";
import SpecViewerModal from "./SpecViewerModal";
import SaveBar from "./SaveBar";
import React, { useEffect, useState } from "react";

export default function BuilderShell({ initialSpec }: { initialSpec?: any }) {
  const {
    spec,
    setSpec,
    compiled,
    addPage,
    addSection,
    updateSection,
    addQuestion,
    updateQuestion,
    moveQuestion,
    deleteQuestion,
  } = useFormSpec(initialSpec);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(
    spec.pages?.[0]?.sections?.[0]?.id ?? null
  );
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [previewWidth, setPreviewWidth] = useState<number>(380);
  const [showSpecViewer, setShowSpecViewer] = useState(false);

  // restore persisted preview state
  useEffect(() => {
    try {
      const s = localStorage.getItem("builder.preview.state");
      if (s) {
        const obj = JSON.parse(s);
        if (typeof obj.open === 'boolean') setPreviewOpen(obj.open);
        if (typeof obj.width === 'number') setPreviewWidth(obj.width);
      } else {
        // default: open on desktop, closed on mobile
        setPreviewOpen(typeof window !== 'undefined' ? window.innerWidth >= 1024 : false);
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("builder.preview.state", JSON.stringify({ open: previewOpen, width: previewWidth }));
    } catch {}
  }, [previewOpen, previewWidth]);

  // Keyboard shortcut: P to toggle preview (ignores inputs)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key?.toLowerCase();
      if (k === 'p' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const el = e.target as HTMLElement | null;
        const tag = el?.tagName?.toLowerCase();
        const isEditable = (el as any)?.isContentEditable;
        if (isEditable || (tag && ["input","textarea","select"].includes(tag))) return;
        e.preventDefault();
        setPreviewOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const [showRules, setShowRules] = useState(false);

  // Helper: add section to first page
  const handleAddSection = () => {
    if (spec.pages.length > 0) {
      const id = addSection(spec.pages[0].id);
      setActiveSectionId(id);
    }
  };
  console.log(spec,"Spec");

  return (
    <div className="grid grid-cols-12 gap-4 h-[calc(100vh-8rem)]">
      <div className="col-span-2">
        <QuestionPalette
          onAdd={(sectionId, q) => addQuestion(sectionId, q)}
          spec={spec}
          activeSectionId={activeSectionId}
        />
      </div>
      <div className="col-span-5">
        <BuilderTopBar
          getFormSpec={() => spec}
          onOpenRules={() => setShowRules(true)}
          previewOpen={previewOpen}
          onTogglePreview={() => setPreviewOpen((v) => !v)}
          onOpenSpecViewer={() => setShowSpecViewer(true)}
        />
        <BuilderCanvas
          spec={spec}
          addPage={addPage}
          addSection={addSection}
          updateSection={updateSection}
          activeSectionId={activeSectionId}
          setActiveSectionId={setActiveSectionId}
          addQuickQuestion={(sectionId) =>
            addQuestion(sectionId, {
              id: crypto.randomUUID(),
              type: "text",
              label: "New Question",
              required: false,
            })
          }
          onSelect={setSelectedId}
          onMove={moveQuestion}
          onDelete={deleteQuestion}
        />
        {showRules && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-lg shadow-xl p-4 max-w-2xl w-[90vw]">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold">Global Rules</div>
                <button className="btn btn-xs" onClick={() => setShowRules(false)}>Close</button>
              </div>
              <ActionRules spec={spec} setSpec={setSpec} />
            </div>
          </div>
        )}
      </div>
      <div className="col-span-2">
        <Inspector
          spec={spec}
          selectedId={selectedId}
          updateQuestion={updateQuestion}
        />
      </div>
      {/* Right-docked Preview Drawer (overlays grid) */}
      <PreviewDrawer
        open={previewOpen}
        width={previewWidth}
        onToggle={() => setPreviewOpen(false)}
        onResize={(w) => setPreviewWidth(w)}
        compiled={compiled}
      />

      {showSpecViewer && (
        <SpecViewerModal spec={spec} compiled={compiled} onClose={() => setShowSpecViewer(false)} />
      )}
    </div>
  );
}
