import { prisma } from '@/lib/prisma'

export async function POST(req: Request, { params }: { params: { token: string }}) {
  const share = await prisma.shareLink.findUnique({ where: { token: params.token }, include: { publication: true } })
  if (!share || share.isDisabled) return new Response('Not found', { status: 404 })
  const body = await req.json() // { payload, meta? }
  const created = await prisma.submission.create({
    data: {
      publicationId: share.publicationId,
      shareLinkId: share.id,
      payload: typeof body.payload === 'string' ? body.payload : JSON.stringify(body.payload ?? {}),
      meta: body.meta ? (typeof body.meta === 'string' ? body.meta : JSON.stringify(body.meta)) : null
    }
  })
  return Response.json({ id: created.id })
}
