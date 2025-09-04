import type { FormSpec, FSQuestion } from "@/types/formspec";

type Compiled = { schema: any; uiSchema: any };

// Map a question to JSON Schema shape
const qToSchema = (q: FSQuestion) => {
  switch (q.type) {
    case "email":
      return { type: "string", format: "email", title: q.label };
    case "number":
      return {
        type: "number",
        title: q.label,
        ...(q.meta?.minimum !== undefined ? { minimum: q.meta.minimum } : {}),
        ...(q.meta?.maximum !== undefined ? { maximum: q.meta.maximum } : {}),
        ...(q.meta?.exclusiveMinimum !== undefined ? { exclusiveMinimum: q.meta.exclusiveMinimum } : {}),
        ...(q.meta?.exclusiveMaximum !== undefined ? { exclusiveMaximum: q.meta.exclusiveMaximum } : {}),
      };
    case "integer":
      return {
        type: "integer",
        title: q.label,
        ...(q.meta?.minimum !== undefined ? { minimum: q.meta.minimum } : {}),
        ...(q.meta?.maximum !== undefined ? { maximum: q.meta.maximum } : {}),
        ...(q.meta?.exclusiveMinimum !== undefined ? { exclusiveMinimum: q.meta.exclusiveMinimum } : {}),
        ...(q.meta?.exclusiveMaximum !== undefined ? { exclusiveMaximum: q.meta.exclusiveMaximum } : {}),
      };
    case "boolean":
      return { type: "boolean", title: q.label };
    case "date":
      return { type: "string", format: "date", title: q.label };
    case "select":
      return {
        type: "string",
        title: q.label,
        enum: q.options?.map((o) => o.value) ?? [],
        enumNames: q.options?.map((o) => o.label) ?? [],
      };
    case "multiselect":
      return {
        type: "array",
        title: q.label,
        items: q.options?.length
          ? { type: "string", enum: q.options.map((o) => o.value) }
          : { type: "string" },
        uniqueItems: true,
      };
    case "file":
      return { type: "string", title: q.label, contentEncoding: "base64" };
    default:
      return { type: "string", title: q.label }; // short_text, etc.
  }
};

function slug(s: string) {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 64) || "field"
  );
}

export function compileFormSpec(spec: FormSpec): Compiled {
  const properties: Record<string, any> = {};
  const required: string[] = [];
  const uiSchema: Record<string, any> = {};

  // 1) Build stable id -> key map (always STRING keys)
  const idToKey = new Map<string, string>();
  const usedKeys = new Set<string>();

  spec.pages.forEach((p) =>
    p.sections.forEach((s) =>
      s.questions.forEach((q) => {
        let k = (q.key && q.key.trim()) || slug(q.label) || String(q.id);
        while (usedKeys.has(k)) k = `${k}_${Math.random().toString(36).slice(2, 5)}`;
        idToKey.set(String(q.id), k); // stringified
        usedKeys.add(k);
      })
    )
  );

  // Helper: resolve a field reference that may be an id or already a key
  const toKey = (ref: any) => {
    const asStr = String(ref);
    if (usedKeys.has(asStr)) return asStr; // already a key
    return idToKey.get(asStr) ?? asStr; // remap id -> key (or leave as-is)
  };

  // 2) Build properties/required and default order (by discovered keys)
  const defaultOrder: string[] = [];
  spec.pages.forEach((p) =>
    p.sections.forEach((s) =>
      s.questions.forEach((q) => {
        const k = toKey(q.id);
        properties[k] = qToSchema(q);
        if (q.required) required.push(k);
        if (q.help) uiSchema[k] = { ...(uiSchema[k] || {}), "ui:help": q.help };
        defaultOrder.push(k);
      })
    )
  );

  const schema: any = { type: "object", title: spec.title, properties };
  if (required.length) schema.required = required;

  // 3) ui:order — map the provided order (ids) to keys, else default order
  const providedOrderIds = spec.ui?.order ?? [];
  if (providedOrderIds.length) {
    const mapped = providedOrderIds.map((id) => toKey(id));
    const set = new Set<string>(mapped);
    for (const k of defaultOrder) if (!set.has(k)) mapped.push(k);
    uiSchema["ui:order"] = mapped;
  } else {
    uiSchema["ui:order"] = defaultOrder;
  }

  // 3b) Emit idToKey map so the public runtime can recover if rules slip through unmapped
  // Build sections meta: [{ title, keys[] }]
  const sectionsMeta: Array<{ title: string; keys: string[] }> = [];
  spec.pages.forEach((p) =>
    p.sections.forEach((s) => {
      const keys: string[] = [];
      s.questions.forEach((q) => {
        const k = toKey(q.id);
        if (schema.properties[k]) keys.push(k);
      });
      if (keys.length) sectionsMeta.push({ title: s.title, keys });
    })
  );

  uiSchema["ui:meta"] = {
    ...(uiSchema["ui:meta"] || {}),
    idToKey: Object.fromEntries(idToKey),
    sections: sectionsMeta,
  };

  // 4) visibleWhen — copy as UI hint, but remap referenced ids -> keys
  spec.pages.forEach((p) =>
    p.sections.forEach((s) =>
      s.questions.forEach((q) => {
        if (!q.visibleWhen || !q.visibleWhen.length) return;
        const k = toKey(q.id);
        const remapped = q.visibleWhen.map((group) => ({
          all: group.all?.map((c) => ({ ...c, field: toKey(c.field) })),
          any: group.any?.map((c) => ({ ...c, field: toKey(c.field) })),
        }));
        uiSchema[k] = uiSchema[k] ?? {};
        uiSchema[k]["ui:options"] = {
          ...(uiSchema[k]["ui:options"] || {}),
          visibleWhen: remapped,
        };

        // Mirror into schema as well so public renderer can recover even
        // if uiSchema entries are stripped or transformed during storage.
        (properties[k] as any)["ui:options"] = {
          ...((properties[k] as any)["ui:options"] || {}),
          visibleWhen: remapped,
        };
      })
    )
  );

  // 4b) disabledWhen — copy as UI hint, remap ids -> keys, and mirror
  spec.pages.forEach((p) =>
    p.sections.forEach((s) =>
      s.questions.forEach((q) => {
        if (!q.disabledWhen || !q.disabledWhen.length) return;
        const k = toKey(q.id);
        const remapped = q.disabledWhen.map((group) => ({
          all: group.all?.map((c) => ({ ...c, field: toKey(c.field) })),
          any: group.any?.map((c) => ({ ...c, field: toKey(c.field) })),
        }));
        uiSchema[k] = uiSchema[k] ?? {};
        uiSchema[k]["ui:options"] = {
          ...(uiSchema[k]["ui:options"] || {}),
          disabledWhen: remapped,
        };
        (properties[k] as any)["ui:options"] = {
          ...((properties[k] as any)["ui:options"] || {}),
          disabledWhen: remapped,
        };
      })
    )
  );

  // 5) top-level rules — compile and remap ids -> keys in if/then
  const allOf: any[] = [];
  spec.rules?.forEach((rule) => {
    const cond: any = {};
    (rule.when.all || []).forEach((w) => {
      const fk = toKey(w.field);
      cond.properties = cond.properties || {};
      cond.required = cond.required || [];
      cond.properties[fk] = {
        ...(cond.properties[fk] || {}),
        ...(w.eq !== undefined ? { const: w.eq } : {}),
      };
      cond.required.push(fk);
    });
    // TODO: rule.when.any -> anyOf branches if you need it

    const thenObj: any = {};
    rule.then.forEach((a) => {
      const tk = toKey(a.field);
      if (a.op === "setRequired") {
        thenObj.required = thenObj.required || [];
        if (a.value) thenObj.required.push(tk);
      } else if (a.op === "setConst") {
        thenObj.properties = thenObj.properties || {};
        thenObj.properties[tk] = { const: a.value };
      } else if (a.op === "setEnum") {
        thenObj.properties = thenObj.properties || {};
        thenObj.properties[tk] = {
          enum: a.values,
          ...(a.labels?.length === a.values.length ? { enumNames: a.labels } : {}),
        };
      }
    });

    if (Object.keys(cond).length && Object.keys(thenObj).length) {
      allOf.push({ if: cond, then: thenObj });
    }
  });
  if (allOf.length) schema.allOf = allOf;

  return { schema, uiSchema };
}
