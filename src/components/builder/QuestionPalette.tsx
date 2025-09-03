"use client";
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
        <>
          <div className="text-xs text-gray-500">Adding to: {labelForSection(spec, firstSectionId)}</div>
          <input className="input" placeholder="Search types… (text, email, select)" onChange={() => {}} />
        </>
      )}
      <div className="grid gap-2">
        {firstSectionId && (
          <>
            <button className="btn" onClick={() => add("text", "Text")}>Text</button>
            <button className="btn" onClick={() => add("email", "Email")}>Email</button>
            <button className="btn" onClick={() => add("number", "Number")}>Number</button>
            <button className="btn" onClick={() => add("date", "Date")}>Date</button>
            <button className="btn" onClick={() => add("select", "Select")}>Select</button>
            <button className="btn" onClick={() => add("multiselect", "Multi-select")}>Multi-select</button>
            <button className="btn" onClick={() => add("boolean", "Yes / No")}>Yes / No</button>
          </>
        )}
      </div>
    </div>
  );
}

function labelForSection(spec: FormSpec, sectionId: string) {
  for (const p of spec.pages) for (const s of p.sections) if (s.id === sectionId) return `${p.title} → ${s.title}`;
  return sectionId;
}
