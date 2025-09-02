import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import PublicFormClient from '@/components/PublicFormClient'

export default async function PublicForm({ params }: { params: { token: string }}) {
  const share = await prisma.shareLink.findUnique({
    where: { token: params.token },
    include: { publication: true }
  })
  if (!share || share.isDisabled) return notFound()

  const schema = share.publication.schema as any
  const uiSchema = (share.publication.uiSchema as any) ?? {}

  if (!schema || Object.keys(schema).length === 0) {
    return (
      <div className="card">
        <h1 className="text-xl font-semibold">{share.publication.title}</h1>
        <p className="text-red-600">This live version has no compiled schema. Please republish the template.</p>
      </div>
    )
  }

  return (
    <div className="card">
      <h1 className="text-xl font-semibold mb-3">{share.publication.title}</h1>
      <PublicFormClient token={params.token} schema={schema} uiSchema={uiSchema} />
    </div>
  )
}
