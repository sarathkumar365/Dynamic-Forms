'use client'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Form from '@rjsf/core'
import validator from '@rjsf/validator-ajv8'

export default function NewTemplatePage() {
  const searchParams = useSearchParams()
  const mode = (searchParams.get('mode') ?? 'manual').toLowerCase() as 'ai'|'manual'

  // Shared state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  // === Manual mode state ===
  const [schemaText, setSchemaText] = useState<string>(JSON.stringify({
    title: "Customer Intake Form",
    type: "object",
    required: ["name","email"],
    properties: {
      name: { type: "string", title: "Full Name" },
      email: { type: "string", format: "email", title: "Email" },
      projectType: { type: "string", title: "Project Type", enum: ["Website","Mobile App","Consulting","Other"] },
      details: { type: "string", title: "Details" }
    },
    allOf: [
      {
        if: { properties: { projectType: { const: "Consulting" } } },
        then: {
          properties: { hours: { type: "integer", title: "Estimated Hours" } },
          required: ["hours"]
        }
      }
    ]
  }, null, 2))
  const [uiText, setUiText] = useState<string>(JSON.stringify({
    details: { "ui:widget": "textarea" }
  }, null, 2))
  const parsedSchema = useMemo(() => safeParse(schemaText), [schemaText])
  const parsedUi = useMemo(() => safeParse(uiText), [uiText])

  // === AI mode state ===
  const [prompt, setPrompt] = useState('')
  const [aiSchema, setAiSchema] = useState<any>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  async function generateFromAI() {
    setAiLoading(true)
    setAiError(null)
    try {
      const res = await fetch('/api/ai/generate-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'AI error')
      if (data?.warning) {
        setAiError(`Warning: ${data.warning}${data.details ? ` — ${data.details}` : ''}`)
      }
      setAiSchema(data.schema)
    } catch (err: any) {
      setAiError(err.message)
    } finally {
      setAiLoading(false)
    }
  }

  async function saveTemplate() {
    // choose source based on mode
    const schemaToSave = mode === 'ai' ? aiSchema : parsedSchema
    const uiToSave = mode === 'ai' ? undefined : parsedUi

    if (!schemaToSave) {
      alert('Please provide or generate a schema first.')
      return
    }

    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description,
        schema: schemaToSave,
        uiSchema: uiToSave
      })
    })
    const data = await res.json()
    if (!res.ok) {
      alert(data?.error || 'Failed to save')
      return
    }
    window.location.href = `/templates/${data.id}`
  }

  return (
    <div className="space-y-6">
      {/* Mode tabs (optional UX) */}
      <div className="card flex items-center gap-3">
        <span className="text-sm text-gray-600">Mode:</span>
        <ModePill active={mode==='ai'} href="/templates/new?mode=ai">✨ Use AI</ModePill>
        <ModePill active={mode==='manual'} href="/templates/new?mode=manual">🛠️ Manual</ModePill>
      </div>

      {/* Mode content */}
      {mode === 'ai' ? (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card space-y-3">
            <h2 className="text-lg font-semibold">AI-Assist</h2>
            <textarea
              className="input h-28 font-mono"
              placeholder="Describe your form (fields, required, conditionals)…"
              value={prompt}
              onChange={(e)=>setPrompt(e.target.value)}
            />
            <button onClick={generateFromAI} className="btn" disabled={aiLoading}>
              {aiLoading ? 'Generating…' : 'Generate with AI'}
            </button>
            {aiError && <p className="text-red-600 text-sm whitespace-pre-wrap">{aiError}</p>}
          </div>

          <div className="card space-y-3">
            <h2 className="text-lg font-semibold">Template Details</h2>
            <input className="input" placeholder="Template Name" value={name} onChange={e=>setName(e.target.value)} />
            <input className="input" placeholder="Description" value={description} onChange={e=>setDescription(e.target.value)} />
            <button onClick={saveTemplate} className="btn">Save Template</button>
          </div>

          <div className="md:col-span-2 card">
            <h2 className="text-lg font-semibold mb-2">Live Preview</h2>
            {aiSchema ? (
              <Form schema={aiSchema} validator={validator} onSubmit={()=>{}} />
            ) : (
              <p className="text-sm text-gray-600">Generate a schema to see the preview.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card space-y-3">
            <h2 className="text-lg font-semibold">Manual Editor</h2>
            <div>
              <label className="block text-sm font-medium mb-1">JSON Schema</label>
              <textarea className="input h-56 font-mono" value={schemaText} onChange={e=>setSchemaText(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">UI Schema (optional)</label>
              <textarea className="input h-40 font-mono" value={uiText} onChange={e=>setUiText(e.target.value)} />
            </div>
          </div>

          <div className="card space-y-3">
            <h2 className="text-lg font-semibold">Template Details</h2>
            <input className="input" placeholder="Template Name" value={name} onChange={e=>setName(e.target.value)} />
            <input className="input" placeholder="Description" value={description} onChange={e=>setDescription(e.target.value)} />
            <button onClick={saveTemplate} className="btn">Save Template</button>
            {!parsedSchema && <p className="text-red-600 text-sm">Invalid JSON Schema</p>}
          </div>

          <div className="md:col-span-2 card">
            <h2 className="text-lg font-semibold mb-2">Live Preview</h2>
            {parsedSchema ? (
              <Form schema={parsedSchema} uiSchema={parsedUi || undefined} validator={validator} onSubmit={()=>{}} />
            ) : (
              <p className="text-sm text-red-600">Fix the schema to see preview.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function safeParse(t: string) {
  try { return JSON.parse(t) } catch { return null }
}

function ModePill({ active, href, children }: { active: boolean; href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className={`px-3 py-1 rounded-full text-sm ${active ? 'bg-black text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
    >
      {children}
    </a>
  )
}
