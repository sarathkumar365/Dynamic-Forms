"use client";
import React from "react";
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
    <div className="group rounded-lg border p-2 flex items-center justify-between hover:bg-muted/40">
      <button className="text-left" onClick={() => onSelect(q.id)}>
        <div className="text-sm font-medium">{q.label}</div>
        <div className="text-xs text-muted-foreground">
          {q.type}
          {q.required ? " · required" : ""}
        </div>
      </button>
      <div className="row-actions hidden group-hover:flex gap-2 items-center">
        <button className="btn btn-xs" title="Move up" onClick={() => onMove(q.id, sectionId, Math.max(0, index - 1))}>↑</button>
        <button className="btn btn-xs" title="Move down" onClick={() => onMove(q.id, sectionId, index + 1)}>↓</button>
        <Kebab onDelete={() => onDelete(q.id)} />
      </div>
    </div>
  );
}

function Kebab({ onDelete }: { onDelete: () => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative">
      <button className="btn btn-xs" aria-label="More" onClick={() => setOpen(v => !v)}>⋯</button>
      {open && (
        <div className="absolute right-0 mt-1 w-36 rounded-lg border bg-white shadow">
          <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" onClick={() => { setOpen(false); onDelete(); }}>Delete</button>
        </div>
      )}
    </div>
  );
}
