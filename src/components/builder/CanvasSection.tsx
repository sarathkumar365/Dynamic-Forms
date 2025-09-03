"use client";
import React from "react";
import { FSSection } from "@/types/formspec";
import CanvasQuestion from "./CanvasQuestion";

export default function CanvasSection({
  section,
  addQuickQuestion,
  updateSection,
  active,
  setActive,
  onSelect,
  onMove,
  onDelete,
}: {
  section: FSSection;
  addQuickQuestion: (sectionId: string) => void;
  updateSection: (sectionId: string, patch: Partial<{ title: string }>) => void;
  active: boolean;
  setActive: () => void;
  onSelect: (id: string) => void;
  onMove: (fromId: string, toSectionId: string, toIndex: number) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [title, setTitle] = React.useState(section.title);
  return (
    <div
      className={`rounded-xl border p-3 ${
        active ? "ring-2 ring-blue-400 bg-blue-50" : "hover:bg-muted/40"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        {editing ? (
          <input
            className="input text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              setEditing(false);
              if (title.trim() && title !== section.title) updateSection(section.id, { title: title.trim() });
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') { setTitle(section.title); setEditing(false); }
            }}
            autoFocus
          />
        ) : (
          <div
            className="text-sm font-medium -mx-1 px-1 py-1 rounded hover:bg-blue-50 cursor-pointer"
            onClick={(e) => { e.stopPropagation(); setActive(); }}
            title="Click to focus this section"
          >
            {section.title}
          </div>
        )}
        <button className="btn btn-xs" onClick={() => { setActive(); setEditing(true); }}>Rename</button>
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
