"use client";

import BuilderShell from "@/components/builder/BuilderShell";
import { newEmptySpec } from "@/lib/formspec/defaults";

export default function NewFormPage() {
  // You may want to use a normalized empty form object here
  const initial = {
    title: "New Form",
    description: "",
    pages: [],
    rules: [],
  };
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Create a new form</h1>
      <BuilderShell initialSpec={initial} />
    </div>
  );
}
