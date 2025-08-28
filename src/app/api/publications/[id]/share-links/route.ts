import { prisma } from '@/lib/prisma'
import { resolveOwner } from '@/lib/owner'
import { nanoid } from '@/lib/id'

export async function POST(_: Request, { params }: { params: { id: string }}) {
  const owner = await resolveOwner()
  const pub = await prisma.publication.findFirst({ where: { id: params.id, ownerId: owner.id } })
  if (!pub) return new Response('Not found', { status: 404 })
  const link = await prisma.shareLink.create({
    data: { publicationId: pub.id, token: nanoid(16) }
  })
  return Response.json(link)
}
