import { prisma } from '@/lib/prisma'

export async function GET(_: Request, { params }: { params: { token: string }}) {
  const share = await prisma.shareLink.findUnique({ where: { token: params.token }, include: { publication: true } })
  if (!share || share.isDisabled) return new Response('Not found', { status: 404 })
  return Response.json({
    title: share.publication.title,
    schema: share.publication.schema,
    uiSchema: share.publication.uiSchema
  })
}
