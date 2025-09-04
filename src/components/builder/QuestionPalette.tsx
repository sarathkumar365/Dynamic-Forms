"use client";
import React, { useState } from "react";
import { FormSpec, FSQuestion } from "@/types/formspec";

export default function QuestionPalette({
  spec,
  onAdd,
  activeSectionId,
}: {
  spec: FormSpec;
  onAdd: (sectionId: string, q: FSQuestion) => void;
  activeSectionId: string | null;
}) {
  const firstSectionId = activeSectionId ?? spec.pages?.[0]?.sections?.[0]?.id ?? null;
  const [query, setQuery] = useState("");
  const [showMore, setShowMore] = useState(false);
  const add = (type: FSQuestion["type"], label: string) => {
    if (!firstSectionId) return;
    onAdd(firstSectionId, {
      id: crypto.randomUUID(),
      type,
      label,
      required: false,
    });
  };
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">Add</h3>
      {!firstSectionId && (
        <div className="text-xs text-gray-500 mb-2">Add a page and section first.</div>
      )}
      {firstSectionId && (
        <div className="text-xs text-gray-500">Adding to: {labelForSection(spec, firstSectionId)}</div>
      )}
      <div className="grid gap-2">
        {firstSectionId && (
          <>
            {matches("text", query) && <button className="btn" onClick={() => add("text", "Text")}>Text</button>}
            {matches("email", query) && <button className="btn" onClick={() => add("email", "Email")}>Email</button>}
            {matches("number", query) && <button className="btn" onClick={() => add("number", "Number")}>Number</button>}
            {matches("select", query) && <button className="btn" onClick={() => add("select", "Select")}>Select</button>}
            {showMore && (
              <>
                {matches("date", query) && <button className="btn" onClick={() => add("date", "Date")}>Date</button>}
                {matches("multiselect", query) && <button className="btn" onClick={() => add("multiselect", "Multi-select")}>Multi-select</button>}
                {matches("boolean", query) && <button className="btn" onClick={() => add("boolean", "Yes / No")}>Yes / No</button>}
                {matches("file", query) && <button className="btn" onClick={() => add("file", "File")}>File</button>}
              </>
            )}
            {!query && (
              <button className="btn" onClick={() => setShowMore((v)=>!v)}>{showMore ? 'Less…' : 'More…'}</button>
            )}
          </>
        )}
        {!firstSectionId && (
          <div className="text-xs text-gray-400">&nbsp;</div>
        )}
      </div>
    </div>
  );
}

function labelForSection(spec: FormSpec, sectionId: string) {
  for (const p of spec.pages) for (const s of p.sections) if (s.id === sectionId) return `${p.title} → ${s.title}`;
  return sectionId;
}

function matches(type: string, q: string) {
  if (!q) return true;
  return type.toLowerCase().includes(q.toLowerCase());
}
