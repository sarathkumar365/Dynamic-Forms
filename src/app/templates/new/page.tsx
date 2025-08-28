'use client'
import { useState } from 'react'
import Form from '@rjsf/core'
import validator from '@rjsf/validator-ajv8'

export default function NewTemplatePage() {
  const [name, setName] = useState('Customer Intake')
  const [description, setDescription] = useState('Demo template')
  const [schemaText, setSchemaText] = useState(JSON.stringify({
    title: "Customer Intake Form",
    type: "object",
    required: ["name","email"],
    properties: {
      name: { type: "string", title: "Full Name" },
      email: { type: "string", format: "email", title: "Email" },
      projectType: { type: "string", title: "Project Type", enum: ["Website","Mobile App","Consulting"] },
      details: { type: "string", title: "Details" }
    }
  }, null, 2))
  const [uiText, setUiText] = useState(JSON.stringify({
    details: { "ui:widget": "textarea" }
  }, null, 2))
  const [formData, setFormData] = useState<any>({})

  const parsedSchema = safeParse(schemaText)
  const parsedUi = safeParse(uiText)

  async function saveTemplate() {
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, schema: schemaText, uiSchema: uiText })
    })
    if (!res.ok) { alert('Failed to save'); return }
    const data = await res.json()
    window.location.href = `/templates/${data.id}`
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="card space-y-3">
        <h2 className="text-lg font-semibold">Template Details</h2>
        <input className="input" placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
        <input className="input" placeholder="Description" value={description} onChange={e=>setDescription(e.target.value)} />
        <div>
          <label className="block text-sm font-medium mb-1">JSON Schema</label>
          <textarea className="input h-56 font-mono" value={schemaText} onChange={e=>setSchemaText(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">UI Schema (optional)</label>
          <textarea className="input h-40 font-mono" value={uiText} onChange={e=>setUiText(e.target.value)} />
        </div>
        <button className="btn" onClick={saveTemplate}>Save Template</button>
      </div>
      <div className="card">
        <h2 className="text-lg font-semibold mb-2">Live Preview</h2>
        {parsedSchema ? (
          <Form
            schema={parsedSchema}
            uiSchema={parsedUi || undefined}
            validator={validator}
            formData={formData}
            onChange={(e)=>setFormData(e.formData)}
            onSubmit={()=>{}}
          />
        ) : (<p className="text-red-600">Invalid JSON Schema</p>)}
      </div>
    </div>
  )
}

function safeParse(t: string) {
  try { return JSON.parse(t) } catch { return null }
}
