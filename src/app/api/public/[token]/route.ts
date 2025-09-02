import { prisma } from '@/lib/prisma'

export async function POST(req: Request, { params }: { params: { token: string }}) {
  const share = await prisma.shareLink.findUnique({
    where: { token: params.token }
  })
  if (!share || share.isDisabled) return new Response('Not found', { status: 404 })

  const body = await req.json() // { payload, meta? }
  await prisma.submission.create({
    data: {
      publicationId: share.publicationId,
      shareLinkId: share.id,
      payload: body?.payload ?? {},
      meta: body?.meta ?? undefined,
    }
  })

  return Response.json({ ok: true })
}
