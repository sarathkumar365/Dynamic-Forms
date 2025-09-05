"use client";

import { FormSpec, FSQuestion, FSRule, FSRuleAction } from "@/types/formspec";
import { useMemo, useState } from "react";

type Operator = "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "in" | "nin";

export default function ActionRules({
  spec,
  setSpec,
}: {
  spec: FormSpec;
  setSpec: (s: FormSpec) => void;
}) {
  const questions: FSQuestion[] = useMemo(() => {
    const list: FSQuestion[] = [];
    for (const p of spec.pages) for (const s of p.sections) for (const q of s.questions) if (q.key) list.push(q);
    return list;
  }, [spec]);

  const [targetKey, setTargetKey] = useState("");
  const [actionType, setActionType] = useState<"setRequired" | "setConst" | "setEnum">("setRequired");
  const [constValue, setConstValue] = useState<any>("");
  const [enumValues, setEnumValues] = useState<string>(""); // comma sep
  const [rows, setRows] = useState<Array<{ fieldKey: string; operator: Operator; rawValue: any }>>([
    { fieldKey: "", operator: "eq", rawValue: "" },
  ]);
  const [ruleErr, setRuleErr] = useState<string | null>(null);

  const controlling = useMemo(
    () => rows.map((r) => questions.find((q) => q.key === r.fieldKey) || null),
    [questions, rows]
  );

  function toBestTypedValue(v: string) {
    if (v.trim() === "") return v;
    const n = Number(v);
    if (!Number.isNaN(n) && String(n) === v.trim()) return n;
    return v;
  }

  function addRule() {
    if (!targetKey) return;
    setRuleErr(null);
    const conds = rows
      .filter((r) => r.fieldKey && String(r.rawValue).trim() !== "")
      .map((r, idx) => {
        const ctrl = controlling[idx];
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
        return { field: r.fieldKey, [op]: typed } as any;
      });
    if (!conds.length) return;

    let action: FSRuleAction;
    if (actionType === "setRequired") {
      action = { op: "setRequired", field: targetKey, value: true };
    } else if (actionType === "setConst") {
      if (String(constValue).trim() === "") {
        setRuleErr("Please provide a value for ‘Set value’. ");
        return;
      }
      action = { op: "setConst", field: targetKey, value: constValue } as any;
    } else {
      const values = enumValues
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      if (values.length === 0) {
        setRuleErr("‘Restrict options’ requires at least one value.");
        return;
      }
      action = { op: "setEnum", field: targetKey, values } as any;
    }

    const rule: FSRule = {
      id: crypto.randomUUID(),
      when: { all: conds },
      then: [action],
    };

    setSpec({ ...spec, rules: [...(spec.rules ?? []), rule] });
    // reset
    setTargetKey("");
    setActionType("setRequired");
    setConstValue("");
    setEnumValues("");
    setRows([{ fieldKey: "", operator: "eq", rawValue: "" }]);
  }

  function deleteRule(idx: number) {
    const next = (spec.rules ?? []).slice();
    next.splice(idx, 1);
    setSpec({ ...spec, rules: next });
  }

  return (
    <div className="rounded-2xl border p-3 mt-3">
      <div className="text-sm font-semibold mb-2">Global Rules</div>
      {ruleErr && (
        <div className="mb-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">{ruleErr}</div>
      )}

      {/* Existing rules */}
      <ul className="text-xs space-y-1 mb-3">
        {(spec.rules ?? []).map((r, idx) => (
          <li key={r.id} className="flex items-center justify-between gap-2">
            <span>
              If {r.when.all?.map((c, i) => (
                <span key={i}>
                  {i > 0 ? " AND " : ""}
                  <b>{c.field}</b> {fmtOp(c)} {fmtVal(c)}
                </span>
              ))}{" "}
              then {r.then.map((a, i) => (
                <span key={i}>
                  {i > 0 ? ", " : ""}
                  {a.op === "setRequired"
                    ? `require ${a.field}`
                    : a.op === "setConst"
                    ? `set ${a.field} = ${String((a as any).value)}`
                    : `limit ${a.field} to [${(a as any).values?.join(", ")}]`}
                </span>
              ))}
            </span>
            <button className="btn btn-xs" onClick={() => deleteRule(idx)}>
              Delete
            </button>
          </li>
        ))}
      </ul>

      {/* Editor */}
      <div className="flex flex-wrap gap-2 mb-2 items-center">
        <span className="text-xs font-medium">Target</span>
        <select className="input" value={targetKey} onChange={(e) => setTargetKey(e.target.value)}>
          <option value="">Select field…</option>
          {questions.map((q) => (
            <option key={q.id} value={q.key!}>
              {q.label} ({q.key})
            </option>
          ))}
        </select>
        <select className="input" value={actionType} onChange={(e) => setActionType(e.target.value as any)}>
          <option value="setRequired">Make required</option>
          <option value="setConst">Set value</option>
          <option value="setEnum">Restrict options</option>
        </select>

        {actionType === "setConst" && (
          <input className="input" placeholder="Value" value={String(constValue)} onChange={(e) => setConstValue(e.target.value)} />
        )}
        {actionType === "setEnum" && (
          <input className="input" placeholder="Comma-separated values" value={enumValues} onChange={(e) => setEnumValues(e.target.value)} />
        )}
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
              onChange={(e) => setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, fieldKey: e.target.value } : r)))}
            >
              <option value="">Select field…</option>
              {questions.map((q) => (
                <option key={q.id} value={q.key!}>
                  {q.label} ({q.key})
                </option>
              ))}
            </select>
            <select
              className="input"
              value={row.operator}
              onChange={(e) => setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, operator: e.target.value as Operator } : r)))}
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
            ) : row.operator === "in" || row.operator === "nin" ? (
              <input
                className="input"
                placeholder="Comma-separated values"
                value={Array.isArray(row.rawValue) ? row.rawValue.join(", ") : String(row.rawValue)}
                onChange={(e) => setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, rawValue: e.target.value } : r)))}
              />
            ) : (
              <input
                className="input"
                type={ctrl?.type === 'number' || ctrl?.type === 'integer' ? 'number' : 'text'}
                value={String(row.rawValue)}
                onChange={(e) => setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, rawValue: e.target.value } : r)))}
              />
            )}
            <button className="btn btn-xs" onClick={() => setRows((prev) => prev.filter((_, i) => i !== idx))}>Remove</button>
          </div>
        );
      })}

      <div className="flex gap-2 mb-2">
        <button className="btn btn-sm" onClick={() => setRows((prev) => [...prev, { fieldKey: "", operator: "eq", rawValue: "" }])}>
          + AND condition
        </button>
      </div>

      <div className="flex justify-end">
        <button
          className="btn btn-sm"
          onClick={addRule}
          disabled={!targetKey || rows.length === 0 || rows.some((r) => !r.fieldKey || String(r.rawValue).trim() === "") || (actionType==='setEnum' && enumValues.trim()==='') || (actionType==='setConst' && String(constValue).trim()==='')}
        >
          Add Rule
        </button>
      </div>
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
  return String(c.eq ?? c.ne ?? c.gt ?? c.gte ?? c.lt ?? c.lte ?? (c.in ? c.in.join(", ") : c.nin?.join(", ")));
}
