import { FormSpec } from "@/types/formspec";

export const newEmptySpec = (title = "Untitled Form"): FormSpec => ({
  version: "1.0",
  id: crypto.randomUUID(),
  title,
  pages: [{ id: crypto.randomUUID(), title: "Page 1", sections: [
    { id: crypto.randomUUID(), title: "Section 1", questions: [] }
  ]}],
  ui: { order: [] },
  rules: [],
  metadata: {}
});
