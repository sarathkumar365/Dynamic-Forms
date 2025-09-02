"use client";
import { FormSpec, FSRule } from "@/types/formspec";

export default function RuleBuilder({ spec, setSpec }: { spec: FormSpec; setSpec: (s:FormSpec)=>void }) {
  const addRequiredIfCanada = () => {
    const r: FSRule = {
      id: crypto.randomUUID(),
      description: "Province required if Country = CA",
      when: { all: [{ field: "q_country", eq: "CA" }] },
      then: [{ op: "setRequired", field: "q_province", value: true }]
    };
    setSpec({ ...spec, rules: [...(spec.rules ?? []), r] });
  };
  return (
    <div className="mt-4 rounded-xl border p-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Rules</div>
        <button className="btn btn-xs" onClick={addRequiredIfCanada}>+ Example rule</button>
      </div>
      <ul className="text-xs mt-2 space-y-1">
        {(spec.rules ?? []).map(r => (<li key={r.id}>• {r.description ?? r.id}</li>))}
      </ul>
    </div>
  );
}
