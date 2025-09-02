"use client";
import { FormSpec } from "@/types/formspec";
import CanvasPage from "./CanvasPage";

export default function BuilderCanvas({
  spec, onSelect, onMove
}: { spec: FormSpec; onSelect: (id: string)=>void; onMove: (fromId: string, toSectionId: string, toIndex: number)=>void }) {
  return (
    <div className="space-y-4">
      {spec.pages.map(p => (
        <CanvasPage key={p.id} page={p} onSelect={onSelect} onMove={onMove} />
      ))}
    </div>
  );
}
