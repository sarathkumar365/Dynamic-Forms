'use client'

import BuilderShell from '@/components/builder/BuilderShell'
import { newEmptySpec } from '@/lib/formspec/defaults'

export default function NewTemplatePage() {
  const initial = newEmptySpec('New Form')
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Create a new form</h1>
      <BuilderShell initialSpec={initial} />
    </div>
  )
}
