import type { FormSpec, FSQuestion, FSRule, FSVisibleWhenClause, FSSection } from "@/types/formspec";

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

  const defaultQuestions: FSQuestion[] = [];
  const sections: FSSection[] = [];

  function toQuestion(key: string, prop: any): FSQuestion {
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
    } else if (t === "string" || !t) {
      q.type = "text";
    } else {
      warnings.push(`Unsupported type for '${key}': ${String(t)}`);
      q.type = "text";
    }
    // numeric constraints
    if (prop && (q.type === "number" || q.type === "integer")) {
      q.meta = q.meta || {};
      if (prop.minimum !== undefined) (q.meta as any).minimum = prop.minimum;
      if (prop.maximum !== undefined) (q.meta as any).maximum = prop.maximum;
      if (prop.exclusiveMinimum !== undefined) (q.meta as any).exclusiveMinimum = prop.exclusiveMinimum;
      if (prop.exclusiveMaximum !== undefined) (q.meta as any).exclusiveMaximum = prop.exclusiveMaximum;
    }
    return q;
  }

  // map properties: nested objects -> sections, primitives -> default section
  for (const [key, prop] of Object.entries<any>(properties)) {
    if (prop && prop.type === "object" && prop.properties) {
      const sec: FSSection = {
        id: crypto.randomUUID(),
        title: prop.title || key,
        questions: [],
      };
      for (const [k2, p2] of Object.entries<any>(prop.properties)) {
        if (p2 && p2.type === "object" && p2.properties) {
          warnings.push(`Nested object '${key}.${k2}' flattened into section '${prop.title || key}'`);
          for (const [k3, p3] of Object.entries<any>(p2.properties)) {
            sec.questions.push(toQuestion(String(k3), p3));
          }
        } else {
          sec.questions.push(toQuestion(String(k2), p2));
        }
      }
      sections.push(sec);
    } else {
      defaultQuestions.push(toQuestion(String(key), prop));
    }
  }

  // Convert simple if/then rules from schema.allOf / schema.if
  const rules: FSRule[] = [];
  const allOf = Array.isArray(schema.allOf) ? schema.allOf : [];
  const ruleSources = [] as any[];
  if (schema.if && schema.then) ruleSources.push({ if: schema.if, then: schema.then });
  ruleSources.push(...allOf.filter((x: any) => x && typeof x === "object" && x.if && x.then));

  const keyExists = new Set<string>();
  defaultQuestions.forEach((q) => q.key && keyExists.add(q.key));
  sections.forEach((s) => s.questions.forEach((q) => q.key && keyExists.add(q.key)));

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

  // Handle root oneOf/anyOf as a mode selector
  const branches = (Array.isArray(schema.oneOf) && schema.oneOf)
    || (Array.isArray(schema.anyOf) && schema.anyOf)
    || null;
  let modeQuestion: FSQuestion | undefined;
  if (branches && branches.length > 0) {
    const values: string[] = [];
    const labels: string[] = [];
    branches.forEach((br: any, i: number) => {
      const lbl = String(br?.title || `Option ${i + 1}`);
      const val = lbl.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || `option_${i+1}`;
      labels.push(lbl);
      values.push(val);
      const bprops = br?.properties || {};
      const brequired = new Set<string>(Array.isArray(br?.required) ? br.required : []);
      for (const [bk, bp] of Object.entries<any>(bprops)) {
        const q = toQuestion(String(bk), bp);
        q.required = undefined; // make conditional instead of unconditional
        q.visibleWhen = [{ all: [{ field: "mode", eq: val }] } as any];
        // conditional required via rule
        if (brequired.has(String(bk))) {
          rules.push({ id: crypto.randomUUID(), when: { all: [{ field: "mode", eq: val }] }, then: [{ op: "setRequired", field: String(bk), value: true }] as any });
        }
        defaultQuestions.push(q);
      }
    });
    modeQuestion = {
      id: crypto.randomUUID(),
      key: "mode",
      type: "select",
      label: schema.title ? `${schema.title} Type` : "Type",
      options: values.map((v, i) => ({ value: v, label: labels[i] })),
      required: true,
    } as any;
  }

  const spec: FormSpec = {
    version: "1.0",
    id: crypto.randomUUID(),
    title: schema.title || "Imported Form",
    description: schema.description || undefined,
    pages: (() => {
      const secList: FSSection[] = [];
      if (defaultQuestions.length || modeQuestion) {
        const qs = [...(modeQuestion ? [modeQuestion] : []), ...defaultQuestions];
        secList.push({ id: crypto.randomUUID(), title: "Section 1", questions: qs });
      }
      if (sections.length) secList.push(...sections);
      return [ { id: crypto.randomUUID(), title: "Page 1", sections: secList } ];
    })(),
    ui: { order: [...(modeQuestion ? [modeQuestion.id] : []), ...defaultQuestions.map((q) => q.id)] },
    rules,
    metadata: {},
  };

  return { spec, warnings };
}
