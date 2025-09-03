"use client";

import Form from "@rjsf/core";
import validator from "@rjsf/validator-ajv8";
import { useMemo, useState } from "react";

function isVisible(conds: any[] | undefined, formData: any) {
  if (!conds || !conds.length) return true;
  // supports [{ all: [{ field, eq }, ...] }, { any: [...] }]
  const result = conds.every((group) => {
    if (group.all)
      return group.all.every((c: any) => {
        const val = formData?.[c.field];
        const res = "eq" in c ? val == c.eq : val != c.ne; // use loose equality
        console.log(
          "[isVisible] all",
          c.field,
          "val:",
          val,
          "eq:",
          c.eq,
          "ne:",
          c.ne,
          "result:",
          res
        );
        return res;
      });
    if (group.any)
      return group.any.some((c: any) => {
        const val = formData?.[c.field];
        const res = "eq" in c ? val == c.eq : val != c.ne; // use loose equality
        console.log(
          "[isVisible] any",
          c.field,
          "val:",
          val,
          "eq:",
          c.eq,
          "ne:",
          c.ne,
          "result:",
          res
        );
        return res;
      });
    return true;
  });
  console.log(
    "[isVisible] conds:",
    conds,
    "formData:",
    formData,
    "result:",
    result
  );
  return result;
}

export default function PublicFormClient({
  token,
  schema,
  uiSchema,
}: {
  token: string;
  schema: any;
  uiSchema?: any;
}) {
  const [status, setStatus] = useState<"idle" | "submitting" | "ok" | "err">(
    "idle"
  );
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [data, setData] = useState<any>({});

  // build a uiSchema that marks invisible fields as hidden
  const effectiveUi = useMemo(() => {
    const next = { ...(uiSchema || {}) };
    console.log(
      "[effectiveUi] schema.properties keys:",
      Object.keys(schema.properties || {})
    );
    for (const key of Object.keys(schema.properties || {})) {
      const vis = next[key]?.["ui:options"]?.visibleWhen;
      console.log(
        "[effectiveUi] key:",
        key,
        "visibleWhen:",
        vis,
        "formData:",
        data
      );
      if (vis && !isVisible(vis, data)) {
        next[key] = { ...(next[key] || {}), "ui:widget": "hidden" };
        console.log("[effectiveUi] hiding", key);
      }
    }
    return next;
  }, [uiSchema, schema, data]);

  async function onSubmit({ formData }: any) {
    setStatus("submitting");
    setErrMsg(null);
    try {
      const res = await fetch(`/api/public/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: formData }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || `HTTP ${res.status}`);
      }
      setStatus("ok");
    } catch (e: any) {
      setErrMsg(e?.message || "Submit failed");
      setStatus("err");
    } finally {
      if (status === "submitting") setStatus("idle");
    }
  }

  return (
    <div>
      <Form
        schema={schema}
        uiSchema={effectiveUi}
        validator={validator}
        formData={data}
        onChange={(e: any) => setData(e.formData)}
        onSubmit={onSubmit}
      />
      {status === "err" && <p className="text-sm text-red-600">{errMsg}</p>}
      {status === "ok" && (
        <p className="text-sm text-green-700">
          Thanks! Your response was recorded.
        </p>
      )}
    </div>
  );
}
