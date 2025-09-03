"use client";

import Form from "@rjsf/core";
import validator from "@rjsf/validator-ajv8";
import { useMemo, useState } from "react";

/** ---- Types for rules ---- */
type Cond = {
  field: string;
  eq?: any;
  ne?: any;
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
  in?: any[];
  nin?: any[];
};

type VisibleWhen = Cond[] | { all?: Cond[]; any?: Cond[] } | Array<{ all?: Cond[]; any?: Cond[] }>;

/** ---- Helpers ---- */
const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const getIdToKeyMap = (uiSchema: any): Record<string, string> =>
  (uiSchema?.["ui:meta"]?.idToKey as Record<string, string>) || {};

const getByPath = (obj: any, path: string, idToKey?: Record<string, string>) => {
  if (!obj || !path) return undefined;

  // 0) If an idToKey map exists and path looks like an ID, remap first
  const remapped = idToKey?.[String(path)];
  const key = remapped || path;

  // 1) exact flat key
  if (Object.prototype.hasOwnProperty.call(obj, key)) return obj[key];

  // 2) dot-path
  if (key.includes(".")) {
    return key.split(".").reduce((acc: any, k: string) => {
      if (acc == null) return undefined;
      return acc[k];
    }, obj);
  }

  // 3) slug fallback (covers label vs slug mismatches)
  const s = slugify(key);
  if (Object.prototype.hasOwnProperty.call(obj, s)) return obj[s];

  return undefined;
};

const coerceComparable = (a: any, b: any) => {
  const na = typeof a === "string" && a.trim() !== "" ? Number(a) : a;
  const nb = typeof b === "string" && b.trim() !== "" ? Number(b) : b;
  const aNum = typeof na === "number" && !Number.isNaN(na);
  const bNum = typeof nb === "number" && !Number.isNaN(nb);
  if (aNum || bNum) return [aNum ? na : a, bNum ? nb : b] as const;
  return [a, b] as const;
};

const evalCond = (formData: any, c: Cond, idToKey: Record<string, string>) => {
  const rawVal = getByPath(formData, c.field, idToKey);

  if (c.eq !== undefined) {
    const [va, vb] = coerceComparable(rawVal, c.eq);
    return va === vb;
  }
  if (c.ne !== undefined) {
    const [va, vb] = coerceComparable(rawVal, c.ne);
    return va !== vb;
  }
  if (c.gt !== undefined) {
    const [va, vb] = coerceComparable(rawVal, c.gt);
    return typeof va === "number" && va > (vb as number);
  }
  if (c.gte !== undefined) {
    const [va, vb] = coerceComparable(rawVal, c.gte);
    return typeof va === "number" && va >= (vb as number);
  }
  if (c.lt !== undefined) {
    const [va, vb] = coerceComparable(rawVal, c.lt);
    return typeof va === "number" && va < (vb as number);
  }
  if (c.lte !== undefined) {
    const [va, vb] = coerceComparable(rawVal, c.lte);
    return typeof va === "number" && va <= (vb as number);
  }
  if (Array.isArray(c.in)) {
    return new Set(c.in).has(rawVal);
  }
  if (Array.isArray(c.nin)) {
    return !new Set(c.nin).has(rawVal);
  }

  return true;
};

function evalGroup(formData: any, group: Cond[] | { all?: Cond[]; any?: Cond[] }, idToKey: Record<string, string>) {
  if (Array.isArray(group)) {
    // Treat as an implicit AND of conditions
    return group.every((c) => evalCond(formData, c, idToKey));
  }
  const all = group.all ?? [];
  const any = group.any ?? [];
  const allOk = all.every((c) => evalCond(formData, c, idToKey));
  const anyOk = any.length ? any.some((c) => evalCond(formData, c, idToKey)) : true;
  return allOk && anyOk;
}

const hasRealConds = (vw: VisibleWhen | undefined): boolean => {
  if (!vw) return false;
  if (Array.isArray(vw)) {
    if (vw.length === 0) return false;
    const first: any = vw[0];
    if (first && typeof first === "object" && "field" in first) {
      return (vw as Cond[]).length > 0;
    }
    return (vw as Array<{ all?: Cond[]; any?: Cond[] }>).some(
      (g) => (g.all?.length || 0) > 0 || (g.any?.length || 0) > 0
    );
  }
  const g = vw as { all?: Cond[]; any?: Cond[] };
  return (g.all?.length || 0) > 0 || (g.any?.length || 0) > 0;
};

const isVisible = (formData: any, visibleWhen: VisibleWhen | undefined, idToKey: Record<string, string>) => {
  if (!hasRealConds(visibleWhen)) return true;

  // Support three shapes:
  // 1) Array<Cond> (implicit AND)
  // 2) { all?: Cond[]; any?: Cond[] }
  // 3) Array<{ all?: Cond[]; any?: Cond[] }> where all groups must be satisfied (AND across groups)
  if (Array.isArray(visibleWhen)) {
    const first = visibleWhen[0] as any;
    if (!first) return true;
    if (typeof first === 'object' && 'field' in first) {
      // Array<Cond>
      return evalGroup(formData, visibleWhen as Cond[], idToKey);
    }
    // Array of groups — visible when ANY group matches
    return (visibleWhen as Array<{ all?: Cond[]; any?: Cond[] }>).some((g) => evalGroup(formData, g, idToKey));
  }
  // Single group object
  return evalGroup(formData, visibleWhen as { all?: Cond[]; any?: Cond[] }, idToKey);
};

/** ---- Component ---- */
export default function PublicFormClient({
  token,
  schema,
  uiSchema,
}: {
  token: string;
  schema: any;
  uiSchema?: any;
}) {
  const [status, setStatus] = useState<"idle" | "submitting" | "ok" | "err">("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [data, setData] = useState<any>({});

  const idToKey = useMemo(() => getIdToKeyMap(uiSchema), [uiSchema]);

  // Build a uiSchema that marks invisible fields as hidden on every change
  const { effectiveUi, effectiveSchema } = useMemo(() => {
    const nextUi: any = structuredClone(uiSchema ?? {});
    const nextSchema: any = structuredClone(schema ?? {});
    const propKeys = schema?.properties ? Object.keys(schema.properties) : [];
    const hidden = new Set<string>();
    const disabled = new Set<string>();

    // Debug (optional): uncomment while testing
    // console.log("compiled", {
    //   props: propKeys,
    //   shortTextUi: next?.short_text,
    //   shortTextVis: next?.short_text?.["ui:options"]?.visibleWhen,
    //   idToKey,
    //   formData: data,
    // });

    for (const key of propKeys) {
      const prop: any = schema?.properties?.[key] ?? {};
      const fromSchema = prop?.["ui:options"]?.visibleWhen ?? prop?.visibleWhen;
      const fromUi =
        nextUi?.[key]?.["ui:options"]?.visibleWhen ??
        nextUi?.[key]?.visibleWhen ??
        nextUi?.[key]?.["ui:visibleWhen"];

      const visibleWhen: VisibleWhen | undefined = fromSchema ?? fromUi;
      const show = isVisible(data, visibleWhen, idToKey);

      if (!show) {
        nextUi[key] = { ...(nextUi[key] || {}), "ui:widget": "hidden" };
        hidden.add(key);
      }

      // disabledWhen support
      const disFromSchema = prop?.["ui:options"]?.disabledWhen ?? prop?.disabledWhen;
      const disFromUi =
        nextUi?.[key]?.["ui:options"]?.disabledWhen ??
        nextUi?.[key]?.disabledWhen ??
        nextUi?.[key]?.["ui:disabledWhen"];
      const disabledWhen: VisibleWhen | undefined = disFromSchema ?? disFromUi;
      const shouldDisable = hasRealConds(disabledWhen)
        ? isVisible(data, disabledWhen, idToKey)
        : false; // only disable when a rule is defined and matches
      if (shouldDisable) {
        nextUi[key] = { ...(nextUi[key] || {}), "ui:disabled": true };
        disabled.add(key);
      }
    }

    // Remove hidden fields from required validation to avoid blocking submits
    if (Array.isArray(nextSchema?.required)) {
      nextSchema.required = nextSchema.required.filter((k: string) => !hidden.has(k));
      if (nextSchema.required.length === 0) delete nextSchema.required;
    }
    // Also scrub from any allOf/then.required blocks
    if (Array.isArray(nextSchema?.allOf)) {
      nextSchema.allOf = nextSchema.allOf.map((blk: any) => {
        if (blk?.then?.required && Array.isArray(blk.then.required)) {
          blk.then.required = blk.then.required.filter((k: string) => !hidden.has(k));
          if (blk.then.required.length === 0) delete blk.then.required;
        }
        return blk;
      });
    }

    return { effectiveUi: nextUi, effectiveSchema: nextSchema };
  }, [schema, uiSchema, data, idToKey]);

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
        schema={effectiveSchema}
        uiSchema={effectiveUi}
        validator={validator}
        formData={data}
        onChange={(e: any) => setData(e.formData)}
        onSubmit={onSubmit}
      />
      {status === "err" && <p className="text-sm text-red-600">{errMsg}</p>}
      {status === "ok" && (
        <p className="text-sm text-green-700">Thanks! Your response was recorded.</p>
      )}
    </div>
  );
}
