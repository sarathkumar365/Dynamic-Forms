"use client";
import { useFormSpec } from "@/hooks/useFormSpec";
import QuestionPalette from "./QuestionPalette";
import BuilderCanvas from "./BuilderCanvas";
import Inspector from "./Inspector";
import RuleBuilder from "./RuleBuilder";
import ActionRules from "./ActionRules";
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

  // Helper: add section to first page
  const handleAddSection = () => {
    if (spec.pages.length > 0) {
      addSection(spec.pages[0].id);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-4 h-[calc(100vh-8rem)]">
      <div className="col-span-2">
        <div className="mb-4 space-y-2">
          <button className="btn w-full" onClick={() => addPage()}>
            + Add Page
          </button>
          <button
            className="btn w-full"
            onClick={handleAddSection}
            disabled={spec.pages.length === 0}
          >
            + Add Section
          </button>
        </div>
        <QuestionPalette
          onAdd={(sectionId, q) => addQuestion(sectionId, q)}
          spec={spec}
        />
      </div>
      <div className="col-span-5">
        <SaveBar getFormSpec={() => spec} />
        <BuilderCanvas
          spec={spec}
          onSelect={setSelectedId}
          onMove={moveQuestion}
          onDelete={deleteQuestion}
        />
        {/* Global rules editor */}
        <ActionRules spec={spec} setSpec={setSpec} />
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
