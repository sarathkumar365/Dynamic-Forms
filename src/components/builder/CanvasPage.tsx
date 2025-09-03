"use client";
import { FSPage } from "@/types/formspec";
import CanvasSection from "./CanvasSection";

export default function CanvasPage({
  page,
  addSection,
  addQuickQuestion,
  activeSectionId,
  setActiveSectionId,
  onSelect,
  onMove,
  onDelete,
}: {
  page: FSPage;
  addSection: (pageId: string) => void;
  addQuickQuestion: (sectionId: string) => void;
  activeSectionId: string | null;
  setActiveSectionId: (id: string | null) => void;
  onSelect: (id: string) => void;
  onMove: (fromId: string, toSectionId: string, toIndex: number) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl border p-3">
      <div className="text-sm font-semibold mb-2">{page.title}</div>
      <div className="space-y-3">
        {page.sections.map((s) => (
          <CanvasSection
            key={s.id}
            section={s}
            addQuickQuestion={addQuickQuestion}
            active={activeSectionId === s.id}
            setActive={() => setActiveSectionId(s.id)}
            onSelect={onSelect}
            onMove={onMove}
            onDelete={onDelete}
          />
        ))}
        <div>
          <button className="btn btn-sm" onClick={() => addSection(page.id)}>+ Add Section</button>
        </div>
      </div>
    </div>
  );
}
