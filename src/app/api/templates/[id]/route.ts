import { prisma } from '@/lib/prisma'
import { resolveOwner } from '@/lib/owner'

export async function GET(_: Request, { params }: { params: { id: string }}) {
  const owner = await resolveOwner()
  const item = await prisma.template.findFirst({ where: { id: params.id, ownerId: owner.id } })
  if (!item) return new Response('Not found', { status: 404 })
  return Response.json(item)
}

// export async function PUT(req: Request, { params }: { params: { id: string }}) {
//   const owner = await resolveOwner()
//   const body = await req.json()
//   const updated = await prisma.template.update({
//     where: { id: params.id },
//     data: {
//       name: body.name,
//       description: body.description ?? null,
//       schema: typeof body.schema === 'string' ? body.schema : JSON.stringify(body.schema ?? {}),
//       uiSchema: body.uiSchema ? (typeof body.uiSchema === 'string' ? body.uiSchema : JSON.stringify(body.uiSchema)) : null,
//       version: { increment: 1 }
//     }
//   })
//   return Response.json(updated)
// }

export async function PUT(req: Request, { params }: { params: { id: string }}) {
  const owner = await resolveOwner()
  const body = await req.json()
  const updated = await prisma.template.update({
    where: { id: params.id },
    data: {
      name: body.name,
      description: body.description ?? null,
      ...(body.formSpec ? { formSpec: body.formSpec } : {}),
      // bump version when formSpec changes (optional policy)
      ...(body.formSpec ? { version: { increment: 1 } } : {})
    }
  })
  return Response.json(updated)
}

