"use client";

import BuilderShell from "@/components/builder/BuilderShell";
import { newEmptySpec } from "@/lib/formspec/defaults";
import { useSearchParams } from "next/navigation";

export default function NewFormPage() {
  const sp = useSearchParams();
  const showImport = sp.get("import") === "1" || sp.get("import") === "true";
  // You may want to use a normalized empty form object here
  const initial = {
    title: "New Form",
    description: "",
    pages: [],
    rules: [],
  };
  return (
    <div className="p-6">
      <BuilderShell initialSpec={initial} initialShowImport={showImport} />
    </div>
  );
}
