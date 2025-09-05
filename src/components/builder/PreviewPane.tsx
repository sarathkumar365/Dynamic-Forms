"use client";
import Form from "@rjsf/core";
import validator from "@rjsf/validator-ajv8";
import React from "react";

export default function PreviewPane({ compiled }: { compiled: { schema:any; uiSchema:any }}) {
  const [data, setData] = React.useState<any>({});
  const sections = compiled?.uiSchema?.["ui:meta"]?.sections as Array<{ title: string; keys: string[] }> | undefined;

  // ---- Visibility/Disable helpers (mirrors PublicFormClient) ----
  type Cond = { field: string; eq?: any; ne?: any; gt?: number; gte?: number; lt?: number; lte?: number; in?: any[]; nin?: any[] };
  type VisibleWhen = Cond[] | { all?: Cond[]; any?: Cond[] } | Array<{ all?: Cond[]; any?: Cond[] }>;

  const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const getIdToKeyMap = (uiSchema: any): Record<string, string> => (uiSchema?.["ui:meta"]?.idToKey as Record<string, string>) || {};
  const idToKey = React.useMemo(() => getIdToKeyMap(compiled?.uiSchema), [compiled]);

  const getByPath = (obj: any, path: string, idMap?: Record<string, string>) => {
    if (!obj || !path) return undefined;
    const remapped = idMap?.[String(path)];
    const key = remapped || path;
    if (Object.prototype.hasOwnProperty.call(obj, key)) return obj[key];
    if (key.includes(".")) {
      return key.split(".").reduce((acc: any, k: string) => (acc == null ? undefined : acc[k]), obj);
    }
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
  const evalCond = (formData: any, c: Cond, idMap: Record<string,string>) => {
    const rawVal = getByPath(formData, c.field, idMap);
    if (c.eq !== undefined) { const [va, vb] = coerceComparable(rawVal, c.eq); return va === vb; }
    if (c.ne !== undefined) { const [va, vb] = coerceComparable(rawVal, c.ne); return va !== vb; }
    if (c.gt !== undefined) { const [va, vb] = coerceComparable(rawVal, c.gt); return typeof va === "number" && va > (vb as number); }
    if (c.gte !== undefined) { const [va, vb] = coerceComparable(rawVal, c.gte); return typeof va === "number" && va >= (vb as number); }
    if (c.lt !== undefined) { const [va, vb] = coerceComparable(rawVal, c.lt); return typeof va === "number" && va < (vb as number); }
    if (c.lte !== undefined) { const [va, vb] = coerceComparable(rawVal, c.lte); return typeof va === "number" && va <= (vb as number); }
    if (Array.isArray(c.in)) return new Set(c.in).has(rawVal);
    if (Array.isArray(c.nin)) return !new Set(c.nin).has(rawVal);
    return true;
  };
  function evalGroup(formData: any, group: Cond[] | { all?: Cond[]; any?: Cond[] }, idMap: Record<string,string>) {
    if (Array.isArray(group)) return group.every((c) => evalCond(formData, c, idMap));
    const all = group.all ?? [];
    const any = group.any ?? [];
    const allOk = all.every((c) => evalCond(formData, c, idMap));
    const anyOk = any.length ? any.some((c) => evalCond(formData, c, idMap)) : true;
    return allOk && anyOk;
  }
  const hasRealConds = (vw: VisibleWhen | undefined): boolean => {
    if (!vw) return false;
    if (Array.isArray(vw)) {
      if (vw.length === 0) return false;
      const first: any = vw[0];
      if (first && typeof first === "object" && "field" in first) return (vw as Cond[]).length > 0;
      return (vw as Array<{ all?: Cond[]; any?: Cond[] }>).some((g) => (g.all?.length || 0) > 0 || (g.any?.length || 0) > 0);
    }
    const g = vw as { all?: Cond[]; any?: Cond[] };
    return (g.all?.length || 0) > 0 || (g.any?.length || 0) > 0;
  };
  const isVisible = (formData: any, visibleWhen: VisibleWhen | undefined, idMap: Record<string,string>) => {
    if (!hasRealConds(visibleWhen)) return true;
    if (Array.isArray(visibleWhen)) {
      const first = visibleWhen[0] as any;
      if (!first) return true;
      if (typeof first === 'object' && 'field' in first) return evalGroup(formData, visibleWhen as Cond[], idMap);
      return (visibleWhen as Array<{ all?: Cond[]; any?: Cond[] }>).some((g) => evalGroup(formData, g, idMap));
    }
    return evalGroup(formData, visibleWhen as { all?: Cond[]; any?: Cond[] }, idMap);
  };

  // Build effective UI + Schema with visibility/disabled applied
  const { effectiveUi, effectiveSchema } = React.useMemo(() => {
    const nextUi: any = structuredClone(compiled?.uiSchema ?? {});
    const nextSchema: any = structuredClone(compiled?.schema ?? {});
    const propKeys = nextSchema?.properties ? Object.keys(nextSchema.properties) : [];
    const hidden = new Set<string>();

    for (const key of propKeys) {
      const prop: any = nextSchema?.properties?.[key] ?? {};
      const fromSchema = prop?.["ui:options"]?.visibleWhen ?? prop?.visibleWhen;
      const fromUi = nextUi?.[key]?.["ui:options"]?.visibleWhen ?? nextUi?.[key]?.visibleWhen ?? nextUi?.[key]?.["ui:visibleWhen"];
      const visibleWhen: VisibleWhen | undefined = fromSchema ?? fromUi;
      const show = isVisible(data, visibleWhen, idToKey);
      if (!show) { nextUi[key] = { ...(nextUi[key] || {}), "ui:widget": "hidden" }; hidden.add(key); }

      const disFromSchema = prop?.["ui:options"]?.disabledWhen ?? prop?.disabledWhen;
      const disFromUi = nextUi?.[key]?.["ui:options"]?.disabledWhen ?? nextUi?.[key]?.disabledWhen ?? nextUi?.[key]?.["ui:disabledWhen"];
      const disabledWhen: VisibleWhen | undefined = disFromSchema ?? disFromUi;
      const shouldDisable = hasRealConds(disabledWhen) ? isVisible(data, disabledWhen, idToKey) : false;
      if (shouldDisable) nextUi[key] = { ...(nextUi[key] || {}), "ui:disabled": true };
    }

    if (Array.isArray(nextSchema?.required)) {
      nextSchema.required = nextSchema.required.filter((k: string) => !hidden.has(k));
      if (nextSchema.required.length === 0) delete nextSchema.required;
    }
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
  }, [compiled, data, idToKey]);

  const ObjectFieldTemplate = ({ TitleField, description, properties }: any) => {
    if (!Array.isArray(sections) || sections.length === 0) {
      return (
        <div>
          {properties.map((p: any) => p.content)}
        </div>
      );
    }
    const byName: Record<string, any> = {};
    properties.forEach((p: any) => (byName[p.name] = p));
    const rendered: any[] = [];
    // Render properties grouped by sections
    sections.forEach((sec, idx) => {
      const kids = sec.keys.map((k) => byName[k]).filter(Boolean);
      if (kids.length) {
        rendered.push(
          <div key={idx} className="mb-4 rounded-xl border p-3 bg-gray-50">
            <div className="text-sm font-medium mb-2">{sec.title}</div>
            {kids.map((k: any) => k.content)}
          </div>
        );
      }
    });
    // Any remaining (not in sections)
    const shown = new Set(sections.flatMap((s) => s.keys));
    const leftovers = properties.filter((p: any) => !shown.has(p.name));
    if (leftovers.length) {
      rendered.unshift(
        <div key="general" className="mb-4 rounded-xl border p-3">
          {leftovers.map((p: any) => p.content)}
        </div>
      );
    }
    return <div>{rendered}</div>;
  };

  return (
    <div className="rounded-2xl border p-3 h-full overflow-auto">
      <div className="text-sm font-semibold mb-2">Live Preview</div>
      <Form
        schema={effectiveSchema}
        uiSchema={effectiveUi}
        validator={validator}
        templates={{ ObjectFieldTemplate }}
        formData={data}
        onSubmit={()=>{}}
        onChange={(e:any)=> setData(e.formData)}
      />
    </div>
  );
}
