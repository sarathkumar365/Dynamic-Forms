'use client'

import Form from '@rjsf/core'
import validator from '@rjsf/validator-ajv8'
import { useMemo, useState } from 'react'

function isVisible(conds: any[]|undefined, formData: any) {
  if (!conds || !conds.length) return true
  // supports [{ all: [{ field, eq }, ...] }, { any: [...] }]
  return conds.every(group => {
    if (group.all) return group.all.every((c:any) => ('eq' in c ? formData?.[c.field] === c.eq : formData?.[c.field] !== c.ne))
    if (group.any) return group.any.some((c:any) => ('eq' in c ? formData?.[c.field] === c.eq : formData?.[c.field] !== c.ne))
    return true
  })
}

export default function PublicFormClient({ token, schema, uiSchema }: { token: string; schema: any; uiSchema?: any }) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'ok' | 'err'>('idle')
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [data, setData] = useState<any>({})

  // build a uiSchema that marks invisible fields as hidden
  const effectiveUi = useMemo(() => {
    const next = { ...(uiSchema || {}) }
    for (const key of Object.keys(schema.properties || {})) {
      const vis = next[key]?.['ui:options']?.visibleWhen
      if (vis && !isVisible(vis, data)) {
        next[key] = { ...(next[key] || {}), 'ui:widget': 'hidden' }
      }
    }
    return next
  }, [uiSchema, schema, data])

  async function onSubmit({ formData }: any) {
    setStatus('submitting'); setErrMsg(null)
    try {
      const res = await fetch(`/api/public/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: formData })
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d?.error || `HTTP ${res.status}`)
      }
      setStatus('ok')
    } catch (e: any) {
      setErrMsg(e?.message || 'Submit failed')
      setStatus('err')
    } finally {
      if (status === 'submitting') setStatus('idle')
    }
  }

  return (
    <div>
      <Form
        schema={schema}
        uiSchema={effectiveUi}
        validator={validator}
        formData={data}
        onChange={(e:any) => setData(e.formData)}
        onSubmit={onSubmit}
      />
      {status === 'err' && <p className="text-sm text-red-600">{errMsg}</p>}
      {status === 'ok' && <p className="text-sm text-green-700">Thanks! Your response was recorded.</p>}
    </div>
  )
}
