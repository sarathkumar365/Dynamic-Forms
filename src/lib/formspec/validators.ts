import { FormSpec } from "@/types/formspec";

export function validateFormSpec(spec: FormSpec): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (spec.version !== "1.0") errors.push("Unsupported FormSpec version");
  if (!spec.pages?.length) errors.push("At least one page is required");
  // ensure unique question IDs
  const ids = new Set<string>();
  spec.pages.forEach(p => p.sections.forEach(s => s.questions.forEach(q => {
    if (ids.has(q.id)) errors.push(`Duplicate question id: ${q.id}`);
    ids.add(q.id);
  })));
  return { ok: errors.length === 0, errors };
}
