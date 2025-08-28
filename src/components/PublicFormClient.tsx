'use client'
import { useState } from 'react'
import Form from '@rjsf/core'
import validator from '@rjsf/validator-ajv8'

export default function PublicFormClient({
  token,
  schema,
  uiSchema,
}: {
  token: string
  schema: any
  uiSchema?: any
}) {
  const [status, setStatus] = useState<'idle'|'submitting'|'success'|'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  return (
    <div>
      <Form
        schema={schema}
        uiSchema={uiSchema}
        validator={validator}
        onSubmit={async (e) => {
          setStatus('submitting')
          setError(null)
          try {
            const res = await fetch(`/api/public/${token}/submit`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ payload: e.formData })
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            setStatus('success')
          } catch (err: any) {
            setError(err?.message ?? 'Submit failed')
            setStatus('error')
          }
        }}
      >
        <button type="submit" className="btn" disabled={status==='submitting'}>
          {status==='submitting' ? 'Submitting…' : 'Submit'}
        </button>
      </Form>

      {status==='success' && (
        <p className="mt-3 text-green-700 text-sm">Submitted! Thank you.</p>
      )}
      {status==='error' && (
        <p className="mt-3 text-red-700 text-sm">Error: {error}</p>
      )}
    </div>
  )
}
