"use client";
import { FSSection } from "@/types/formspec";
import CanvasQuestion from "./CanvasQuestion";

export default function CanvasSection({
  section,
  onSelect,
  onMove,
  onDelete,
}: {
  section: FSSection;
  onSelect: (id: string) => void;
  onMove: (fromId: string, toSectionId: string, toIndex: number) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border p-3">
      <div className="text-sm font-medium mb-2">{section.title}</div>
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
      </div>
    </div>
  );
}
