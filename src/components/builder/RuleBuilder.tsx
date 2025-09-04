"use client";

import { FormSpec, FSQuestion, FSVisibleWhenClause } from "@/types/formspec";
import React, { useState } from "react";

type Operator = "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "in" | "nin";

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
  const [showEditor, setShowEditor] = useState(true);
  const [effect, setEffect] = useState<"hide" | "disable">("hide");
  const [rows, setRows] = useState<Array<{ fieldKey: string; operator: Operator; rawValue: any }>>([
    { fieldKey: "", operator: "eq", rawValue: "" },
  ]);

  const allQuestions: FSQuestion[] = React.useMemo(() => {
    if (!question) return [];
    const list: FSQuestion[] = [];
    for (const p of spec.pages) {
      for (const s of p.sections) {
        for (const q of s.questions) {
          if (q.id !== question.id && q.key) list.push(q);
        }
      }
    }
    return list;
  }, [spec, question?.id]);

  const selectableQuestions = React.useMemo(
    () => allQuestions.filter((q) => q.key),
    [allQuestions]
  );

  const controlling = React.useMemo(
    () => rows.map((r) => selectableQuestions.find((q) => q.key === r.fieldKey) || null),
    [selectableQuestions, rows]
  );

  if (!question) return null;

  function toBestTypedValue(v: string) {
    if (v.trim() === "") return v;
    const n = Number(v);
    if (!Number.isNaN(n) && String(n) === v.trim()) return n;
    return v;
  }

  function addGroup() {
    if (!question) return;
    const conds = rows
      .filter((r) => r.fieldKey && String(r.rawValue).trim() !== "")
      .map((r, idx) => {
        const ctrl = controlling[idx];
        const keyToUse = r.fieldKey;
        const op = r.operator;
        let typed: any = r.rawValue;
        if (op === "in" || op === "nin") {
          if (!Array.isArray(typed)) {
            typed = String(typed)
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s.length > 0);
          }
        } else if (ctrl?.type === "boolean") {
          typed = typed === "true" || typed === true;
        } else if (ctrl?.type === "number" || ctrl?.type === "integer") {
          typed = toBestTypedValue(String(typed));
        } else {
          typed = toBestTypedValue(String(typed));
        }
        return { field: keyToUse, [op]: typed } as any;
      });
    if (!conds.length) return;
    const clause: FSVisibleWhenClause = { all: conds };

    if (effect === "hide") {
      const next = [...(question.visibleWhen ?? []), clause];
      updateQuestion(question.id, { visibleWhen: next });
    } else {
      const next = [...(question.disabledWhen ?? []), clause];
      updateQuestion(question.id, { disabledWhen: next });
    }
    setRows([{ fieldKey: "", operator: "eq", rawValue: "" }]);
    setShowEditor(false);
  }

  function removeHideRule(idx: number) {
    if (!question) return;
    const next = (question.visibleWhen ?? []).slice();
    next.splice(idx, 1);
    updateQuestion(question.id, { visibleWhen: next });
  }
  function removeDisableRule(idx: number) {
    if (!question) return;
    const next = (question.disabledWhen ?? []).slice();
    next.splice(idx, 1);
    updateQuestion(question.id, { disabledWhen: next });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Visibility / Disable Rules</div>
        {onClose && (
          <button className="btn btn-xs" onClick={onClose}>
            Close
          </button>
        )}
      </div>

      {/* Hide rules */}
      <div className="text-xs font-medium mt-2">Hide rules (OR across groups)</div>
      <ul className="text-xs mt-1 space-y-1">
        {(question.visibleWhen ?? []).map((r, idx) => (
          <li key={idx} className="flex items-center justify-between gap-2">
            <span>
              {r.all?.map((cond, i) => (
                <span key={i}>
                  {i > 0 ? " AND " : ""}
                  <b>{cond.field}</b> {fmtOp(cond)} {fmtVal(cond)}
                </span>
              ))}
            </span>
            <button className="btn btn-xs" onClick={() => removeHideRule(idx)}>
              Delete
            </button>
          </li>
        ))}
      </ul>

      {/* Disable rules */}
      <div className="text-xs font-medium mt-3">Disable rules (OR across groups)</div>
      <ul className="text-xs mt-1 space-y-1">
        {(question.disabledWhen ?? []).map((r, idx) => (
          <li key={idx} className="flex items-center justify-between gap-2">
            <span>
              {r.all?.map((cond, i) => (
                <span key={i}>
                  {i > 0 ? " AND " : ""}
                  <b>{cond.field}</b> {fmtOp(cond)} {fmtVal(cond)}
                </span>
              ))}
            </span>
            <button className="btn btn-xs" onClick={() => removeDisableRule(idx)}>
              Delete
            </button>
          </li>
        ))}
      </ul>

      {showEditor && (
        <div className="mt-3 p-2 border rounded bg-muted/10">
          <div className="mb-2 text-sm font-medium">Add rule</div>
          <div className="mb-2">
            <label className="text-xs mr-2">Effect:</label>
            <select className="input" value={effect} onChange={(e) => setEffect(e.target.value as any)}>
              <option value="hide">Hide when …</option>
              <option value="disable">Disable when …</option>
            </select>
          </div>

          {rows.map((row, idx) => {
            const ctrl = controlling[idx];
            return (
              <div key={idx} className="flex gap-2 mb-2 flex-wrap items-center">
                {idx === 0 ? (
                  <span className="text-xs font-medium">IF</span>
                ) : (
                  <span className="text-xs font-medium">AND</span>
                )}
                <select
                  className="input"
                  value={row.fieldKey}
                  onChange={(e) => {
                    const v = e.target.value;
                    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, fieldKey: v } : r)));
                  }}
                >
                  <option value="">Select field…</option>
                  {selectableQuestions.map((q) => (
                    <option key={q.id} value={q.key!}>
                      {q.label} ({q.key})
                    </option>
                  ))}
                </select>

                <select
                  className="input"
                  value={row.operator}
                  onChange={(e) => {
                    const v = e.target.value as Operator;
                    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, operator: v } : r)));
                  }}
                >
                  <option value="eq">=</option>
                  <option value="ne">≠</option>
                  <option value="gt">&gt;</option>
                  <option value="gte">≥</option>
                  <option value="lt">&lt;</option>
                  <option value="lte">≤</option>
                  <option value="in">in</option>
                  <option value="nin">not in</option>
                </select>

                {ctrl?.type === "boolean" ? (
                  <select
                    className="input"
                    value={String(row.rawValue)}
                    onChange={(e) => setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, rawValue: e.target.value } : r)))}
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                ) : ctrl?.type === "select" && Array.isArray(ctrl?.options) ? (
                  row.operator === "in" || row.operator === "nin" ? (
                    <select
                      multiple
                      className="input"
                      value={Array.isArray(row.rawValue) ? row.rawValue : []}
                      onChange={(e) => {
                        const options = Array.from(e.target.selectedOptions).map((o) => o.value);
                        setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, rawValue: options } : r)));
                      }}
                    >
                      {ctrl.options!.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label} ({o.value})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      className="input"
                      value={String(row.rawValue)}
                      onChange={(e) => setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, rawValue: e.target.value } : r)))}
                    >
                      <option value="">Select value…</option>
                      {ctrl.options!.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label} ({o.value})
                        </option>
                      ))}
                    </select>
                  )
                ) : row.operator === "in" || row.operator === "nin" ? (
                  <input
                    className="input"
                    value={Array.isArray(row.rawValue) ? row.rawValue.join(", ") : String(row.rawValue)}
                    onChange={(e) => setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, rawValue: e.target.value } : r)))}
                    placeholder="Comma-separated values"
                  />
                ) : (
                  <input
                    className="input"
                    type={ctrl?.type === "number" || ctrl?.type === "integer" ? "number" : "text"}
                    value={String(row.rawValue)}
                    onChange={(e) => setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, rawValue: e.target.value } : r)))}
                    placeholder="Value"
                  />
                )}

                <button
                  type="button"
                  className="btn btn-xs"
                  onClick={() => setRows((prev) => prev.filter((_, i) => i !== idx))}
                >
                  Remove
                </button>
              </div>
            );
          })}

          <div className="flex gap-2 mb-2">
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setRows((prev) => [...prev, { fieldKey: "", operator: "eq", rawValue: "" }])}
            >
              + AND condition
            </button>
          </div>

          <div className="flex justify-end">
            <button
              className="btn btn-sm"
              onClick={addGroup}
              disabled={rows.length === 0 || rows.some((r) => !r.fieldKey || String(r.rawValue).trim() === "")}
            >
              Add OR group
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function fmtOp(c: any) {
  if (c.eq !== undefined) return "=";
  if (c.ne !== undefined) return "≠";
  if (c.gt !== undefined) return ">";
  if (c.gte !== undefined) return "≥";
  if (c.lt !== undefined) return "<";
  if (c.lte !== undefined) return "≤";
  if (Array.isArray(c.in)) return "in";
  if (Array.isArray(c.nin)) return "not in";
  return "?";
}
function fmtVal(c: any) {
  const v = c.eq ?? c.ne ?? c.gt ?? c.gte ?? c.lt ?? c.lte ?? (c.in ? c.in.join(", ") : c.nin?.join(", "));
  return String(v);
}
