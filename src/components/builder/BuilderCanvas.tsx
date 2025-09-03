"use client";
import { FormSpec } from "@/types/formspec";
import CanvasPage from "./CanvasPage";

export default function BuilderCanvas({
  spec,
  addPage,
  addSection,
  updateSection,
  addQuickQuestion,
  activeSectionId,
  setActiveSectionId,
  onSelect,
  onMove,
  onDelete,
}: {
  spec: FormSpec;
  addPage: (title?: string) => void;
  addSection: (pageId: string) => void;
  updateSection: (sectionId: string, patch: Partial<{ title: string }>) => void;
  addQuickQuestion: (sectionId: string) => void;
  activeSectionId: string | null;
  setActiveSectionId: (id: string | null) => void;
  onSelect: (id: string) => void;
  onMove: (fromId: string, toSectionId: string, toIndex: number) => void;
  onDelete: (id: string) => void;
}) {
  if (!spec.pages || spec.pages.length === 0) {
    return (
      <div className="rounded-2xl border p-8 text-center text-sm text-gray-700">
        <div className="text-lg font-semibold mb-2">Start your form</div>
        <p className="mb-4">Create your first page to begin adding sections and questions.</p>
        <button className="btn" onClick={() => addPage("New Page")}>+ Create First Page</button>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {spec.pages.map((p) => (
        <CanvasPage
          key={p.id}
          page={p}
          addSection={addSection}
          updateSection={updateSection}
          addQuickQuestion={addQuickQuestion}
          activeSectionId={activeSectionId}
          setActiveSectionId={setActiveSectionId}
          onSelect={onSelect}
          onMove={onMove}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
