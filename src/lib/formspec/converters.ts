import type { FormSpec, FSQuestion, FSRule, FSVisibleWhenClause } from "@/types/formspec";

// Best-effort converter: JSON Schema (Draft-07 subset) -> FormSpec 1.0
export function schemaToFormSpec(schema: any): { spec: FormSpec; warnings: string[] } {
  const warnings: string[] = [];
  if (!schema || typeof schema !== "object") {
    throw new Error("Invalid JSON: expected an object");
  }
  if (schema.type && schema.type !== "object") warnings.push(`Root type '${schema.type}' treated as object`);
  const properties = schema.properties || {};
  if (!properties || typeof properties !== "object") {
    throw new Error("Schema has no properties");
  }

  const requiredSet = new Set<string>(Array.isArray(schema.required) ? schema.required : []);

  const questions: FSQuestion[] = [];
  for (const [key, prop] of Object.entries<any>(properties)) {
    const q: FSQuestion = {
      id: crypto.randomUUID(),
      key,
      type: "text",
      label: prop?.title || key,
      help: prop?.description || undefined,
      required: requiredSet.has(key) || undefined,
    } as any;

    const t = prop?.type;
    const fmt = prop?.format;
    const enc = prop?.contentEncoding;
    if (Array.isArray(prop?.enum)) {
      q.type = "select";
      q.options = prop.enum.map((v: any) => ({ value: String(v), label: String(v) }));
    } else if (t === "array" && prop?.items && Array.isArray(prop.items.enum)) {
      q.type = "multiselect";
      q.options = prop.items.enum.map((v: any) => ({ value: String(v), label: String(v) }));
    } else if (t === "string" && fmt === "email") {
      q.type = "email";
    } else if (t === "string" && fmt === "date") {
      q.type = "date";
    } else if (t === "string" && enc === "base64") {
      q.type = "file";
    } else if (t === "number") {
      q.type = "number";
    } else if (t === "integer") {
      q.type = "integer";
    } else if (t === "boolean") {
      q.type = "boolean";
    } else if (t === "string") {
      q.type = "text";
    } else if (!t) {
      // no explicit type: default to text
      q.type = "text";
    } else {
      warnings.push(`Unsupported type for '${key}': ${String(t)}`);
      q.type = "text";
    }
    questions.push(q);
  }

  // Convert simple if/then rules from schema.allOf / schema.if
  const rules: FSRule[] = [];
  const allOf = Array.isArray(schema.allOf) ? schema.allOf : [];
  const ruleSources = [] as any[];
  if (schema.if && schema.then) ruleSources.push({ if: schema.if, then: schema.then });
  ruleSources.push(...allOf.filter((x) => x && typeof x === "object" && x.if && x.then));

  const keyExists = new Set(questions.map((q) => q.key!));

  for (const blk of ruleSources) {
    const whenAll: FSVisibleWhenClause["all"] = [];
    const condProps = blk.if?.properties || {};
    for (const [k, cond] of Object.entries<any>(condProps)) {
      if (!keyExists.has(k)) continue;
      if (cond && Object.prototype.hasOwnProperty.call(cond, "const")) {
        whenAll!.push({ field: k, eq: cond.const });
      } else {
        warnings.push(`Unsupported condition for '${k}' in if/then; only 'const' supported`);
      }
    }
    if (!whenAll || whenAll.length === 0) continue;

    const thenActions: FSRule["then"] = [] as any;
    const thenProps = blk.then?.properties || {};
    const thenReq = Array.isArray(blk.then?.required) ? blk.then.required : [];
    for (const r of thenReq) {
      if (keyExists.has(r)) thenActions.push({ op: "setRequired", field: r, value: true } as any);
    }
    for (const [tk, tdef] of Object.entries<any>(thenProps)) {
      if (!keyExists.has(tk)) continue;
      if (tdef && Object.prototype.hasOwnProperty.call(tdef, "const")) {
        thenActions.push({ op: "setConst", field: tk, value: tdef.const } as any);
      } else if (tdef && Array.isArray(tdef.enum)) {
        thenActions.push({ op: "setEnum", field: tk, values: tdef.enum.map((v: any) => String(v)) } as any);
      }
    }
    if (thenActions.length) {
      rules.push({ id: crypto.randomUUID(), when: { all: whenAll }, then: thenActions });
    }
  }

  const spec: FormSpec = {
    version: "1.0",
    id: crypto.randomUUID(),
    title: schema.title || "Imported Form",
    description: schema.description || undefined,
    pages: [
      {
        id: crypto.randomUUID(),
        title: "Page 1",
        sections: [
          {
            id: crypto.randomUUID(),
            title: "Section 1",
            questions,
          },
        ],
      },
    ],
    ui: { order: questions.map((q) => q.id) },
    rules,
    metadata: {},
  };

  return { spec, warnings };
}
