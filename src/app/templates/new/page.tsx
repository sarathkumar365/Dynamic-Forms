"use client";

import BuilderShell from "@/components/builder/BuilderShell";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

export default function NewFormPage() {
  return (
    <Suspense fallback={<div className="p-6" />}> 
      <NewFormInner />
    </Suspense>
  );
}

function NewFormInner() {
  const sp = useSearchParams();
  const showImport = sp.get("import") === "1" || sp.get("import") === "true";
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
