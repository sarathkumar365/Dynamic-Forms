import Form from '@rjsf/core'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import PublicFormClient from '@/components/PublicFormClient'

export default async function PublicForm({ params }: { params: { token: string }}) {
  const share = await prisma.shareLink.findUnique({
    where: { token: params.token },
    include: { publication: true }
  })
  if (!share || share.isDisabled) return notFound()

  const schema = safeParse(share.publication.schema) || {}
  const uiSchema = share.publication.uiSchema ? safeParse(share.publication.uiSchema) : undefined

  // async function submitAction(formData: any) {
  //   'use server'
  //   const share = await prisma.shareLink.findUnique({ where: { token: params.token }, include: { publication: true } })
  //   if (!share) return
  //   await prisma.submission.create({
  //     data: {
  //       publicationId: share.publicationId,
  //       shareLinkId: share.id,
  //       payload: JSON.stringify(formData),
  //       meta: JSON.stringify({ ua: 'server-action' })
  //     }
  //   })
  // }

  return (
    <div className="card">
      <h1 className="text-xl font-semibold mb-3">{share.publication.title}</h1>
      <PublicFormClient token={params.token} schema={schema} uiSchema={uiSchema} />
    </div>
  )
}

function safeParse(s: string) {
  try { return JSON.parse(s) } catch { return null }
}
