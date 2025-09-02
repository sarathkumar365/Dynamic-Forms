"use client";
import { FormSpec } from "@/types/formspec";
import { useState } from "react";
import { validateFormSpec } from "@/lib/formspec/validators";

export default function Toolbar({ spec, setSpec }: { spec: FormSpec; setSpec:(s:FormSpec)=>void }) {
  const [name, setName] = useState("New Form")
  const [description, setDescription] = useState("")

  async function save() {
    const v = validateFormSpec(spec)
    if (!v.ok) return alert(v.errors.join("\n"))
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, formSpec: spec })
    })
    const data = await res.json()
    if (!res.ok) return alert(data?.error || "Save failed")
    window.location.href = `/templates/${data.id}`
  }

  return (
    <div className="mb-2 flex items-center gap-2">
      <input className="input w-48" value={name} onChange={e=>setName(e.target.value)} placeholder="Form name"/>
      <input className="input w-72" value={description} onChange={e=>setDescription(e.target.value)} placeholder="Description"/>
      <button className="btn btn-sm" onClick={save}>Save</button>
      <button className="btn btn-sm" onClick={()=>{
        const v = validateFormSpec(spec)
        alert(v.ok ? "Spec looks good!" : v.errors.join("\n"))
      }}>Validate</button>
    </div>
  )
}
