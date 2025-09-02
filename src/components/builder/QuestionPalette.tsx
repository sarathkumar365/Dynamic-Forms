"use client";
import { FormSpec, FSQuestion } from "@/types/formspec";

export default function QuestionPalette({
  spec, onAdd
}: { spec: FormSpec; onAdd: (sectionId: string, q: FSQuestion) => void }) {
  const firstSectionId = spec.pages[0].sections[0].id;
  const add = (type: FSQuestion["type"], label: string) => {
    onAdd(firstSectionId, { id: crypto.randomUUID(), type, label, required: false });
  };
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">Add question</h3>
      <div className="grid gap-2">
        <button className="btn" onClick={() => add("text", "Short Text")}>Short Text</button>
        <button className="btn" onClick={() => add("email", "Email")}>Email</button>
        <button className="btn" onClick={() => add("number", "Number")}>Number</button>
        <button className="btn" onClick={() => add("date", "Date")}>Date</button>
        <button className="btn" onClick={() => add("select", "Select")}>Select</button>
        <button className="btn" onClick={() => add("multiselect", "Multi-select")}>Multi-select</button>
        <button className="btn" onClick={() => add("boolean", "Yes / No")}>Yes / No</button>
      </div>
    </div>
  );
}
