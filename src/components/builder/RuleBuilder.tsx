"use client";
import { FormSpec, FSQuestion, FSVisibleWhenClause } from "@/types/formspec";
import { useState } from "react";

export default function RuleBuilder({
  spec,
  question,
  updateQuestion,
  onClose,
}: {
  spec: FormSpec;
  question?: FSQuestion | null;
  updateQuestion: (qid: string, patch: Partial<FSQuestion>) => void;
  onClose?: () => void;
}) {
  if (!question) return null;
  const [showEditor, setShowEditor] = useState(true);
  const [fieldId, setFieldId] = useState("");
  const [condition, setCondition] = useState("eq");
  const [value, setValue] = useState("");

  // Get all other fields in the form
  const allQuestions: FSQuestion[] = [];
  for (const p of spec.pages)
    for (const s of p.sections) {
      for (const q of s.questions) {
        if (q.id !== question.id) allQuestions.push(q);
      }
    }

  // Add a new visibility rule
  function addRule() {
    if (!question || !fieldId || !value) return;
    const clause: FSVisibleWhenClause = {
      all: [{ field: fieldId, [condition]: value }],
    };
    updateQuestion(question.id, {
      visibleWhen: [...(question.visibleWhen ?? []), clause],
    });
    setShowEditor(false);
    setFieldId("");
    setCondition("eq");
    setValue("");
  }

  // Remove a rule
  function removeRule(idx: number) {
    if (!question) return;
    const next = (question.visibleWhen ?? []).slice();
    next.splice(idx, 1);
    updateQuestion(question.id, { visibleWhen: next });
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Show/Hide Rules</div>
        {onClose && (
          <button className="btn btn-xs" onClick={onClose}>
            Close
          </button>
        )}
      </div>
      <ul className="text-xs mt-2 space-y-1">
        {(question?.visibleWhen ?? []).map((r, idx) => (
          <li key={idx} className="flex items-center justify-between">
            <span>
              {r.all?.map((cond, i) => (
                <span key={i}>
                  Hide if{" "}
                  <b>
                    {allQuestions.find((q) => q.id === cond.field)?.label ||
                      cond.field}
                  </b>{" "}
                  {cond.eq !== undefined ? "==" : "!="} "{cond.eq ?? cond.ne}"
                </span>
              ))}
            </span>
            <button className="btn btn-xs" onClick={() => removeRule(idx)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
      {showEditor && (
        <div className="mt-3 p-2 border rounded bg-muted/10">
          <div className="mb-2 text-sm font-medium">Add Show/Hide Rule</div>
          <div className="flex gap-2 mb-2">
            <select
              className="input"
              value={fieldId}
              onChange={(e) => setFieldId(e.target.value)}
            >
              <option value="">Select field…</option>
              {allQuestions.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.label}
                </option>
              ))}
            </select>
            <select
              className="input"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
            >
              <option value="eq">equals</option>
              <option value="ne">not equals</option>
            </select>
            <input
              className="input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Value"
            />
          </div>
          <div className="flex gap-2 mt-2">
            <button className="btn btn-sm" onClick={addRule}>
              Save Rule
            </button>
            {onClose && (
              <button className="btn btn-xs ml-2" onClick={onClose}>
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
