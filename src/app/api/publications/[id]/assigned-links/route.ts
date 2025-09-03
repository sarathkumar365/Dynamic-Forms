import { prisma } from '@/lib/prisma'
import { resolveOwner } from '@/lib/owner'
import { nanoid } from '@/lib/id'

export async function POST(req: Request, { params }: { params: { id: string }}) {
  const owner = await resolveOwner()
  const pub = await prisma.publication.findFirst({
    where: { id: params.id },
    include: { form: true },
  })
  if (!pub || !pub.form || pub.form.ownerId !== owner.id) {
    return new Response('Not found', { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const { assignedName, assignedEmail, note } = body || {}

  const created = await prisma.shareLink.create({
    data: {
      publicationId: pub.id,
      token: nanoid(16),
      assignedName: assignedName ?? null,
      assignedEmail: assignedEmail ?? null,
      note: note ?? null,
    }
  })
  return Response.json({ token: created.token, url: `/f/${created.token}` })
}
