"use client";
import { FSPage } from "@/types/formspec";
import CanvasSection from "./CanvasSection";

export default function CanvasPage({
  page,
  onSelect,
  onMove,
  onDelete,
}: {
  page: FSPage;
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
            onSelect={onSelect}
            onMove={onMove}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}
