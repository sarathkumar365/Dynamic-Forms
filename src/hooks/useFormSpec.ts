"use client";
import { useMemo, useState, useCallback } from "react";
import { newEmptySpec } from "@/lib/formspec/defaults";
import { compileFormSpec } from "@/lib/formspec/compile";
import type { FormSpec, FSPage, FSSection, FSQuestion } from "@/types/formspec";

export function useFormSpec(initial?: FormSpec) {
  const [spec, setSpec] = useState<FormSpec>(initial ?? newEmptySpec());

  const compiled = useMemo(() => compileFormSpec(spec), [spec]);

  const addQuestion = useCallback((sectionId: string, q: FSQuestion) => {
    setSpec(prev => {
      const next = structuredClone(prev);
      for (const p of next.pages) {
        for (const s of p.sections) {
          if (s.id === sectionId) { s.questions.push(q); next.ui!.order!.push(q.id); }
        }
      }
      return next;
    });
  }, []);

  const updateQuestion = useCallback((qid: string, patch: Partial<FSQuestion>) => {
    setSpec(prev => {
      const next = structuredClone(prev);
      for (const p of next.pages) for (const s of p.sections) {
        const i = s.questions.findIndex(q => q.id === qid);
        if (i >= 0) s.questions[i] = { ...s.questions[i], ...patch };
      }
      return next;
    });
  }, []);

  const moveQuestion = useCallback((fromId: string, toSectionId: string, toIndex: number) => {
    setSpec(prev => {
      const next = structuredClone(prev);
      let moving: FSQuestion | undefined;
      for (const p of next.pages) for (const s of p.sections) {
        const idx = s.questions.findIndex(q => q.id === fromId);
        if (idx >= 0) moving = s.questions.splice(idx, 1)[0];
      }
      if (moving) {
        for (const p of next.pages) for (const s of p.sections) {
          if (s.id === toSectionId) s.questions.splice(toIndex, 0, moving);
        }
        // update ui order
        next.ui!.order = [];
        next.pages.forEach(p => p.sections.forEach(s => s.questions.forEach(q => next.ui!.order!.push(q.id))));
      }
      return next;
    });
  }, []);

  return { spec, setSpec, compiled, addQuestion, updateQuestion, moveQuestion };
}
