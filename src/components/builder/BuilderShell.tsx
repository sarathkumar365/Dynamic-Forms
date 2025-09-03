"use client";
import { useFormSpec } from "@/hooks/useFormSpec";
import QuestionPalette from "./QuestionPalette";
import BuilderCanvas from "./BuilderCanvas";
import Inspector from "./Inspector";
import RuleBuilder from "./RuleBuilder";
import ActionRules from "./ActionRules";
import BuilderTopBar from "./BuilderTopBar";
import PreviewPane from "./PreviewPane";
import SaveBar from "./SaveBar";
import { useState } from "react";

export default function BuilderShell({ initialSpec }: { initialSpec?: any }) {
  const {
    spec,
    setSpec,
    compiled,
    addPage,
    addSection,
    addQuestion,
    updateQuestion,
    moveQuestion,
    deleteQuestion,
  } = useFormSpec(initialSpec);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(
    spec.pages?.[0]?.sections?.[0]?.id ?? null
  );
  const [showRules, setShowRules] = useState(false);

  // Helper: add section to first page
  const handleAddSection = () => {
    if (spec.pages.length > 0) {
      const id = addSection(spec.pages[0].id);
      setActiveSectionId(id);
    }
  };

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
        <BuilderTopBar getFormSpec={() => spec} onOpenRules={() => setShowRules(true)} />
        <BuilderCanvas
          spec={spec}
          addPage={addPage}
          addSection={addSection}
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
      <div className="col-span-3">
        <PreviewPane compiled={compiled} />
      </div>
    </div>
  );
}
