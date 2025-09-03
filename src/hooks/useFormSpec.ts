"use client";
import { useMemo, useState, useCallback } from "react";
import { newEmptySpec } from "@/lib/formspec/defaults";
import { compileFormSpec } from "@/lib/formspec/compile";
import type { FormSpec, FSPage, FSSection, FSQuestion } from "@/types/formspec";

export function ensureKeys(spec: FormSpec): FormSpec {
  let usedKeys = new Set<string>();
  for (const p of spec.pages)
    for (const s of p.sections)
      for (const q of s.questions) {
        if (!q.key || !/^[a-z][a-z0-9_]*$/.test(q.key)) {
          let base = (q.label || "")
            .toLowerCase()
            .replace(/[^a-z0-9_]+/g, "_")
            .replace(/^_+|_+$/g, "");
          if (!/^[a-z][a-z0-9_]*$/.test(base)) base = "q_" + q.id.slice(0, 6);
          let key = base;
          let i = 2;
          while (usedKeys.has(key)) {
            key = base + "_" + i;
            i++;
          }
          q.key = key;
        }
        usedKeys.add(q.key);
      }
  return spec;
}

export function useFormSpec(initial?: FormSpec) {
  // Helper: build id->key map for the spec
  function buildIdToKey(spec: FormSpec) {
    const map = new Map<string, string>();
    for (const p of spec.pages)
      for (const s of p.sections)
        for (const q of s.questions) {
          if (q.id && q.key) map.set(q.id, q.key);
        }
    return map;
  }

  const [spec, setSpec] = useState<FormSpec>(
    ensureKeys(initial ?? newEmptySpec())
  );

  const compiled = useMemo(() => compileFormSpec(spec), [spec]);

  const addPage = useCallback((title: string = "New Page") => {
    const newPageId = crypto.randomUUID();
    setSpec((prev: FormSpec) => {
      const next = structuredClone(prev);
      next.pages.push({ id: newPageId, title, sections: [] });
      return next;
    });
    return newPageId;
  }, []);

  const addSection = useCallback((pageId: string, title: string = "New Section") => {
    const sectionId = crypto.randomUUID();
    setSpec((prev: FormSpec) => {
      const next = structuredClone(prev);
      const page = next.pages.find((p: FSPage) => p.id === pageId);
      if (page) {
        page.sections.push({ id: sectionId, title, questions: [] });
      }
      return next;
    });
    return sectionId;
  }, []);

  const updateSection = useCallback((sectionId: string, patch: Partial<FSSection>) => {
    setSpec((prev: FormSpec) => {
      const next = structuredClone(prev);
      for (const p of next.pages) {
        const s = p.sections.find((sec) => sec.id === sectionId);
        if (s) Object.assign(s, patch);
      }
      return next;
    });
  }, []);

  const addQuestion = useCallback((sectionId: string, q: FSQuestion) => {
    setSpec((prev) => {
      const next = structuredClone(prev);
      for (const p of next.pages) {
        for (const s of p.sections) {
          if (s.id === sectionId) {
            s.questions.push(q);
            if (!next.ui) next.ui = { order: [], widgets: {} };
            if (!next.ui.order) next.ui.order = [];
            next.ui.order.push(q.id);
          }
        }
      }
      // Ensure all keys are valid/auto-generated for new questions
      ensureKeys(next);
      // Clean up any visibleWhen/disabledWhen clauses to use keys, not IDs
      const idToKey = buildIdToKey(next);
      for (const p of next.pages)
        for (const s of p.sections)
          for (const q of s.questions) {
            if (q.visibleWhen) {
              q.visibleWhen = q.visibleWhen.map((clause) => ({
                all: clause.all?.map((cond) => ({
                  ...cond,
                  field: idToKey.get(cond.field) || cond.field,
                })),
                any: clause.any?.map((cond) => ({
                  ...cond,
                  field: idToKey.get(cond.field) || cond.field,
                })),
              }));
            }
            if (q.disabledWhen) {
              q.disabledWhen = q.disabledWhen.map((clause) => ({
                all: clause.all?.map((cond) => ({
                  ...cond,
                  field: idToKey.get(cond.field) || cond.field,
                })),
                any: clause.any?.map((cond) => ({
                  ...cond,
                  field: idToKey.get(cond.field) || cond.field,
                })),
              }));
            }
          }
      return next;
    });
  }, []);

  const updateQuestion = useCallback(
    (qid: string, patch: Partial<FSQuestion>) => {
      setSpec((prev) => {
        const next = structuredClone(prev);
        for (const p of next.pages)
          for (const s of p.sections) {
            const i = s.questions.findIndex((q) => q.id === qid);
            if (i >= 0) s.questions[i] = { ...s.questions[i], ...patch };
          }
        // Auto-generate keys if missing/invalid when label changes
        ensureKeys(next);
        // Clean up visibleWhen/disabledWhen clauses to use keys, not IDs
        const idToKey = buildIdToKey(next);
        for (const p of next.pages)
          for (const s of p.sections)
            for (const q of s.questions) {
              if (q.visibleWhen) {
                q.visibleWhen = q.visibleWhen.map((clause) => ({
                  all: clause.all?.map((cond) => ({
                    ...cond,
                    field: idToKey.get(cond.field) || cond.field,
                  })),
                  any: clause.any?.map((cond) => ({
                    ...cond,
                    field: idToKey.get(cond.field) || cond.field,
                  })),
                }));
              }
              if (q.disabledWhen) {
                q.disabledWhen = q.disabledWhen.map((clause) => ({
                  all: clause.all?.map((cond) => ({
                    ...cond,
                    field: idToKey.get(cond.field) || cond.field,
                  })),
                  any: clause.any?.map((cond) => ({
                    ...cond,
                    field: idToKey.get(cond.field) || cond.field,
                  })),
                }));
              }
            }
        return next;
      });
    },
    []
  );

  const moveQuestion = useCallback(
    (fromId: string, toSectionId: string, toIndex: number) => {
      setSpec((prev) => {
        const next = structuredClone(prev);
        let moving: FSQuestion | undefined;
        for (const p of next.pages)
          for (const s of p.sections) {
            const idx = s.questions.findIndex((q) => q.id === fromId);
            if (idx >= 0) moving = s.questions.splice(idx, 1)[0];
          }
        if (moving) {
          for (const p of next.pages)
            for (const s of p.sections) {
              if (s.id === toSectionId) s.questions.splice(toIndex, 0, moving);
            }
          // update ui order
          next.ui!.order = [];
          next.pages.forEach((p) =>
            p.sections.forEach((s) =>
              s.questions.forEach((q) => next.ui!.order!.push(q.id))
            )
          );
        }
        return next;
      });
    },
    []
  );

  const deleteQuestion = useCallback((qid: string) => {
    setSpec((prev) => {
      const next = structuredClone(prev);
      // Remove the question
      for (const p of next.pages)
        for (const s of p.sections) {
          const idx = s.questions.findIndex((q) => q.id === qid);
          if (idx >= 0) s.questions.splice(idx, 1);
        }
      // Build id->key map
      const idToKey = buildIdToKey(next);
      // Remove visibleWhen/disabledWhen clauses referencing the deleted question (by key)
      for (const p of next.pages)
        for (const s of p.sections)
          for (const q of s.questions) {
            if (q.visibleWhen) {
              q.visibleWhen = q.visibleWhen.filter((clause) => {
                const allRefs = clause.all?.some(
                  (cond) => cond.field === idToKey.get(qid)
                );
                const anyRefs = clause.any?.some(
                  (cond) => cond.field === idToKey.get(qid)
                );
                return !allRefs && !anyRefs;
              });
            }
            if (q.disabledWhen) {
              q.disabledWhen = q.disabledWhen.filter((clause) => {
                const allRefs = clause.all?.some(
                  (cond) => cond.field === idToKey.get(qid)
                );
                const anyRefs = clause.any?.some(
                  (cond) => cond.field === idToKey.get(qid)
                );
                return !allRefs && !anyRefs;
              });
            }
          }
      // Remove global rules referencing the deleted question (by key)
      if (next.rules) {
        const key = idToKey.get(qid);
        next.rules = next.rules.filter((rule) => {
          const whenRefs =
            rule.when.all?.some((cond) => cond.field === key) ||
            rule.when.any?.some((cond) => cond.field === key);
          const thenRefs = rule.then.some((action) => action.field === key);
          return !whenRefs && !thenRefs;
        });
      }
      // update ui order
      next.ui!.order = [];
      next.pages.forEach((p) =>
        p.sections.forEach((s) =>
          s.questions.forEach((q) => next.ui!.order!.push(q.id))
        )
      );
      return next;
    });
  }, []);
  return {
    spec,
    setSpec,
    compiled,
    addPage,
    addSection,
    updateSection,
    addQuestion,
    updateQuestion,
    moveQuestion,
    deleteQuestion,
  };
}
