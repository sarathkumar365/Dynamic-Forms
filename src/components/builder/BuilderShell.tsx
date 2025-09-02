"use client";
import { useFormSpec } from "@/hooks/useFormSpec";
import QuestionPalette from "./QuestionPalette";
import BuilderCanvas from "./BuilderCanvas";
import Inspector from "./Inspector";
import RuleBuilder from "./RuleBuilder";
import PreviewPane from "./PreviewPane";
import Toolbar from "./Toolbar";
import SaveBar from "./SaveBar";
import { useState } from "react";

export default function BuilderShell({ initialSpec }: { initialSpec?: any }) {
  const { spec, setSpec, compiled, addQuestion, updateQuestion, moveQuestion } = useFormSpec(initialSpec);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-12 gap-4 h-[calc(100vh-8rem)]">
      <div className="col-span-2">
        <QuestionPalette onAdd={(sectionId, q) => addQuestion(sectionId, q)} spec={spec} />
      </div>
      <div className="col-span-5">
        <SaveBar getFormSpec={() => spec} />
        <Toolbar spec={spec} setSpec={setSpec} />
        <BuilderCanvas spec={spec} onSelect={setSelectedId} onMove={moveQuestion} />
        <RuleBuilder spec={spec} setSpec={setSpec} />
      </div>
      <div className="col-span-2">
        <Inspector spec={spec} selectedId={selectedId} updateQuestion={updateQuestion} />
      </div>
      <div className="col-span-3">
        <PreviewPane compiled={compiled} />
      </div>
    </div>
  );
}
