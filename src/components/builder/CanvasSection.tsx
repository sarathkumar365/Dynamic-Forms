"use client";
import { FSSection } from "@/types/formspec";
import CanvasQuestion from "./CanvasQuestion";

export default function CanvasSection({
  section,
  addQuickQuestion,
  active,
  setActive,
  onSelect,
  onMove,
  onDelete,
}: {
  section: FSSection;
  addQuickQuestion: (sectionId: string) => void;
  active: boolean;
  setActive: () => void;
  onSelect: (id: string) => void;
  onMove: (fromId: string, toSectionId: string, toIndex: number) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        active ? "ring-2 ring-blue-400 bg-blue-50" : "hover:bg-muted/40"
      }`}
    >
      <div
        className="text-sm font-medium mb-2 -mx-1 px-1 py-1 rounded hover:bg-blue-50 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          setActive();
        }}
        title="Click to focus this section"
      >
        {section.title}
      </div>
      <div className="space-y-2">
        {section.questions.map((q, idx) => (
          <CanvasQuestion
            key={q.id}
            sectionId={section.id}
            index={idx}
            q={q}
            onSelect={onSelect}
            onMove={onMove}
            onDelete={onDelete}
          />
        ))}
        <button
          className="btn btn-sm"
          onClick={(e) => {
            e.stopPropagation();
            addQuickQuestion(section.id);
          }}
        >
          + Add Question
        </button>
      </div>
    </div>
  );
}
