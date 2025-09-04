import { schemaToFormSpec } from "@/lib/formspec/converters";
import { validateFormSpec } from "@/lib/formspec/validators";
import { ensureKeys } from "@/hooks/useFormSpec";
import type { FormSpec } from "@/types/formspec";

export type ImportResult = { spec: FormSpec; warnings: string[] };

export function detectFormat(json: any): "FormSpec" | "JSONSchema" | "Unknown" {
  if (!json || typeof json !== "object") return "Unknown";
  if (json.version === "1.0" && Array.isArray(json.pages)) return "FormSpec";
  if (json.$schema || (json.type === "object" && json.properties)) return "JSONSchema";
  return "Unknown";
}

export function importJson(json: any): ImportResult {
  const fmt = detectFormat(json);
  if (fmt === "FormSpec") {
    const spec = ensureKeys(json as FormSpec);
    const v = validateFormSpec(spec);
    if (!v.ok) {
      throw new Error(`Invalid FormSpec: \n${v.errors.join("\n")}`);
    }
    return { spec, warnings: [] };
  }
  if (fmt === "JSONSchema") {
    const { spec, warnings } = schemaToFormSpec(json);
    const v = validateFormSpec(spec);
    if (!v.ok) throw new Error(`Converted FormSpec invalid: \n${v.errors.join("\n")}`);
    return { spec, warnings };
  }
  throw new Error("Unknown JSON format. Provide FormSpec or JSON Schema.");
}
