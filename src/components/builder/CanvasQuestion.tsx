"use client";
import { FSQuestion } from "@/types/formspec";

export default function CanvasQuestion({
  q,
  sectionId,
  index,
  onSelect,
  onMove,
  onDelete,
}: {
  q: FSQuestion;
  sectionId: string;
  index: number;
  onSelect: (id: string) => void;
  onMove: (fromId: string, toSectionId: string, toIndex: number) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-lg border p-2 flex items-center justify-between hover:bg-muted/40">
      <button className="text-left" onClick={() => onSelect(q.id)}>
        <div className="text-sm font-medium">{q.label}</div>
        <div className="text-xs text-muted-foreground">
          {q.type}
          {q.required ? " · required" : ""}
        </div>
      </button>
      <div className="flex gap-2">
        <button
          className="btn btn-xs"
          onClick={() => onMove(q.id, sectionId, Math.max(0, index - 1))}
        >
          ↑
        </button>
        <button
          className="btn btn-xs"
          onClick={() => onMove(q.id, sectionId, index + 1)}
        >
          ↓
        </button>
        <button
          className="btn btn-xs btn-danger"
          onClick={() => onDelete(q.id)}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
