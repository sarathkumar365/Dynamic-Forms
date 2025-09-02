// import { FormSpec, FSQuestion } from "@/types/formspec";

// type Compiled = { schema: any; uiSchema: any };

// // helpers
// const qToSchema = (q: FSQuestion) => {
//   switch (q.type) {
//     case "email": return { type: "string", format: "email", title: q.label };
//     case "number": return { type: "number", title: q.label };
//     case "integer": return { type: "integer", title: q.label };
//     case "boolean": return { type: "boolean", title: q.label };
//     case "date": return { type: "string", format: "date", title: q.label };
//     case "select":
//       return {
//         type: "string",
//         title: q.label,
//         enum: q.options?.map(o => o.value) ?? [],
//         enumNames: q.options?.map(o => o.label) ?? []
//       };
//     case "multiselect":
//       return {
//         type: "array",
//         title: q.label,
//         items: { type: "string" },
//         uniqueItems: true
//       };
//     case "file":
//       return { type: "string", title: q.label, contentEncoding: "base64" };
//     default:
//       return { type: "string", title: q.label };
//   }
// };

// export function compileFormSpec(spec: FormSpec): Compiled {
//   const properties: Record<string, any> = {};
//   const required: string[] = [];
//   const uiSchema: Record<string, any> = {};
//   const allQuestionIds: string[] = [];

//   // build properties/required from every question in order of pages/sections
//   spec.pages.forEach(p =>
//     p.sections.forEach(s =>
//       s.questions.forEach(q => {
//         properties[q.id] = qToSchema(q);
//         if (q.required) required.push(q.id);
//         if (q.help) uiSchema[q.id] = { ...(uiSchema[q.id] || {}), "ui:help": q.help };
//         allQuestionIds.push(q.id);
//       })
//     )
//   );

//   // base schema
//   const schema: any = { type: "object", title: spec.title, properties };
//   if (required.length) schema.required = required;

//   // ui order defaults to discovered order; can be overridden by spec.ui?.order
//   const order = spec.ui?.order?.length ? spec.ui?.order : allQuestionIds;
//   uiSchema["ui:order"] = order;

//   // widgets from spec.ui
//   if (spec.ui?.widgets) {
//     for (const [k, widget] of Object.entries(spec.ui.widgets)) {
//       uiSchema[k] = { ...(uiSchema[k] || {}), "ui:widget": widget };
//     }
//   }

//   // compile rules into allOf if/then
//   const allOf: any[] = [];

//   // visibleWhen → soft hide hint; we still add schema if/then only when it changes validity
//   spec.pages.forEach(p =>
//     p.sections.forEach(s =>
//       s.questions.forEach(q => {
//         if (!q.visibleWhen) return;
//         // UI hint (consumer can hide in renderer)
//         uiSchema[q.id] = { ...(uiSchema[q.id] || {}), "ui:options": { ...(uiSchema[q.id]?.["ui:options"] || {}), visibleWhen: q.visibleWhen } };
//       })
//     )
//   );

//   // rules (setRequired / setConst / setEnum)
//   spec.rules?.forEach(rule => {
//     const cond: any = {};
//     (rule.when.all || []).forEach(w => {
//       cond.properties = cond.properties || {};
//       cond.required = cond.required || [];
//       cond.properties[w.field] = { ...(cond.properties[w.field] || {}), ...(w.eq !== undefined ? { const: w.eq } : {}) };
//       cond.required.push(w.field);
//     });
//     (rule.when.any || []).forEach(w => {
//       // simplified: any-of multiple single-field conditions
//       // advanced: could expand to proper anyOf with multiple branches
//     });

//     const thenObj: any = {};
//     rule.then.forEach(a => {
//       if (a.op === "setRequired") {
//         thenObj.required = thenObj.required || [];
//         if (a.value) thenObj.required.push(a.field);
//       } else if (a.op === "setConst") {
//         thenObj.properties = thenObj.properties || {};
//         thenObj.properties[a.field] = { const: a.value };
//       } else if (a.op === "setEnum") {
//         thenObj.properties = thenObj.properties || {};
//         thenObj.properties[a.field] = { enum: a.values };
//         if (a.labels?.length === a.values.length) {
//           thenObj.properties[a.field].enumNames = a.labels;
//         }
//       }
//     });

//     if (Object.keys(cond).length && Object.keys(thenObj).length) {
//       allOf.push({ if: cond, then: thenObj });
//     }
//   });

//   if (allOf.length) schema.allOf = allOf;
//   return { schema, uiSchema };
// }

import type { FormSpec, FSQuestion } from '@/types/formspec'

type Compiled = { schema: any; uiSchema: any }

const qToSchema = (q: FSQuestion) => {
  switch (q.type) {
    case 'email': return { type: 'string', format: 'email', title: q.label }
    case 'number': return { type: 'number', title: q.label }
    case 'integer': return { type: 'integer', title: q.label }
    case 'boolean': return { type: 'boolean', title: q.label }
    case 'date': return { type: 'string', format: 'date', title: q.label }
    case 'select':
      return {
        type: 'string',
        title: q.label,
        enum: q.options?.map(o => o.value) ?? [],
        enumNames: q.options?.map(o => o.label) ?? []
      }
    case 'multiselect':
      return {
        type: 'array',
        title: q.label,
        items: { type: 'string' },
        uniqueItems: true
      }
    case 'file':
      return { type: 'string', title: q.label, contentEncoding: 'base64' }
    default:
      return { type: 'string', title: q.label }
  }
}

function slug(s: string) {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64) || 'field'
}

export function compileFormSpec(spec: FormSpec): Compiled {
  const properties: Record<string, any> = {}
  const required: string[] = []
  const uiSchema: Record<string, any> = {}

  // 1) Build stable id -> key map (ensure uniqueness)
  const idToKey = new Map<string, string>()
  const used = new Set<string>()
  spec.pages.forEach(p => p.sections.forEach(s => s.questions.forEach(q => {
    let k = (q.key && q.key.trim()) || slug(q.label) || q.id
    while (used.has(k)) k = `${k}_${Math.random().toString(36).slice(2, 5)}`
    idToKey.set(q.id, k)
    used.add(k)
  })))

  // 2) Build properties/required and default order (by discovered keys)
  const defaultOrder: string[] = []
  spec.pages.forEach(p => p.sections.forEach(s => s.questions.forEach(q => {
    const k = idToKey.get(q.id)!
    properties[k] = qToSchema(q)
    if (q.required) required.push(k)
    if (q.help) uiSchema[k] = { ...(uiSchema[k] || {}), 'ui:help': q.help }
    defaultOrder.push(k)
  })))

  const schema: any = { type: 'object', title: spec.title, properties }
  if (required.length) schema.required = required

  // 3) ui:order — map the provided order (ids) to keys, else use default order
  const providedOrderIds = spec.ui?.order ?? []
  uiSchema['ui:order'] = providedOrderIds.length
    ? providedOrderIds.map(id => idToKey.get(id) || id)
    : defaultOrder

  // 4) visibleWhen — copy as UI hint, but remap referenced ids -> keys
  spec.pages.forEach(p => p.sections.forEach(s => s.questions.forEach(q => {
    if (!q.visibleWhen) return
    const k = idToKey.get(q.id)!
    const remapped = q.visibleWhen.map(group => ({
      all: group.all?.map(c => ({ ...c, field: idToKey.get(c.field) || c.field })),
      any: group.any?.map(c => ({ ...c, field: idToKey.get(c.field) || c.field })),
    }))
    uiSchema[k] = {
      ...(uiSchema[k] || {}),
      'ui:options': {
        ...(uiSchema[k]?.['ui:options'] || {}),
        visibleWhen: remapped
      }
    }
  })))

  // 5) rules — compile and remap ids -> keys in if/then
  const allOf: any[] = []
  spec.rules?.forEach(rule => {
    const cond: any = {}
    ;(rule.when.all || []).forEach(w => {
      const fk = idToKey.get(w.field) || w.field
      cond.properties = cond.properties || {}
      cond.required = cond.required || []
      cond.properties[fk] = {
        ...(cond.properties[fk] || {}),
        ...(w.eq !== undefined ? { const: w.eq } : {})
      }
      cond.required.push(fk)
    })
    // (rule.when.any support could build a proper anyOf if needed)

    const thenObj: any = {}
    rule.then.forEach(a => {
      const tk = idToKey.get(a.field) || a.field
      if (a.op === 'setRequired') {
        thenObj.required = thenObj.required || []
        if (a.value) thenObj.required.push(tk)
      } else if (a.op === 'setConst') {
        thenObj.properties = thenObj.properties || {}
        thenObj.properties[tk] = { const: a.value }
      } else if (a.op === 'setEnum') {
        thenObj.properties = thenObj.properties || {}
        thenObj.properties[tk] = {
          enum: a.values,
          ...(a.labels?.length === a.values.length ? { enumNames: a.labels } : {})
        }
      }
    })

    if (Object.keys(cond).length && Object.keys(thenObj).length) {
      allOf.push({ if: cond, then: thenObj })
    }
  })
  if (allOf.length) schema.allOf = allOf

  return { schema, uiSchema }
}
