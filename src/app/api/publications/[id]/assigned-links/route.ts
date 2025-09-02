// import { prisma } from '@/lib/prisma'
// import { resolveOwner } from '@/lib/owner'
// import { nanoid } from '@/lib/id'

// export async function POST(req: Request, { params }: { params: { id: string }}) {
//   const owner = await resolveOwner()
//   const pub = await prisma.publication.findFirst({
//     where: { id: params.id, ownerId: owner.id }
//   })
//   if (!pub) return new Response('Not found', { status: 404 })

//   const body = await req.json().catch(() => ({}))
//   const { assignedName, assignedEmail, note } = body || {}

//   const link = await prisma.shareLink.create({
//     data: {
//       publicationId: pub.id,
//       token: nanoid(16),
//       assignedName: assignedName ?? null,
//       assignedEmail: assignedEmail ?? null,
//       note: note ?? null
//     }
//   })
//   return Response.json(link)
// }

// src/app/api/publications/[id]/share-links/route.ts
import { prisma } from '@/lib/prisma'
import { nanoid } from '@/lib/id'

export async function POST(_: Request, { params }: { params: { id: string }}) {
  // Optionally validate ownership
  const created = await prisma.shareLink.create({
    data: {
      publicationId: params.id,
      token: nanoid(),
    }
  })
  return Response.json({ token: created.token, url: `/f/${created.token}` })
}
