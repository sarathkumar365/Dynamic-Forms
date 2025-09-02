import { FormSpec } from "@/types/formspec";

// export function validateFormSpec(spec: FormSpec): { ok: boolean; errors: string[] } {
//   const errors: string[] = [];
//   if (spec.version !== "1.0") errors.push("Unsupported FormSpec version");
//   if (!spec.pages?.length) errors.push("At least one page is required");
//   // ensure unique question IDs
//   const ids = new Set<string>();
//   spec.pages.forEach(p => p.sections.forEach(s => s.questions.forEach(q => {
//     if (ids.has(q.id)) errors.push(`Duplicate question id: ${q.id}`);
//     ids.add(q.id);
//   })));
//   return { ok: errors.length === 0, errors };
// }

const KEY_RX = /^[a-z][a-z0-9_]*$/

export function validateFormSpec(spec: FormSpec): { ok: boolean; errors: string[] } {
  const errors: string[] = []
  if (spec.version !== '1.0') errors.push('Unsupported FormSpec version')
  if (!spec.pages?.length) errors.push('At least one page is required')

  let questionCount = 0
  const ids = new Set<string>()
  const keys = new Set<string>()

  spec.pages.forEach(p => p.sections.forEach(s => s.questions.forEach(q => {
    questionCount++
    if (ids.has(q.id)) errors.push(`Duplicate question id: ${q.id}`)
    ids.add(q.id)

    if (q.key) {
      const k = q.key.trim()
      if (!KEY_RX.test(k)) errors.push(`Invalid key "${k}" on "${q.label}". Use a-z, 0-9, underscore; start with a letter.`)
      if (keys.has(k)) errors.push(`Duplicate key "${k}"`)
      keys.add(k)
    }
  })))

  if (questionCount === 0) errors.push('Form has no questions')
  return { ok: errors.length === 0, errors }
}

