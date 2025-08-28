import { prisma } from '@/lib/prisma'
import { resolveOwner } from '@/lib/owner'

export async function GET() {
  const owner = await resolveOwner()
  const items = await prisma.template.findMany({ where: { ownerId: owner.id }, orderBy: { updatedAt: 'desc' } })
  return Response.json(items)
}

export async function POST(req: Request) {
  const owner = await resolveOwner()
  const body = await req.json()
  const created = await prisma.template.create({
    data: {
      ownerId: owner.id,
      name: body.name,
      description: body.description ?? null,
      schema: typeof body.schema === 'string' ? body.schema : JSON.stringify(body.schema ?? {}),
      uiSchema: body.uiSchema ? (typeof body.uiSchema === 'string' ? body.uiSchema : JSON.stringify(body.uiSchema)) : null,
    }
  })
  return Response.json({ id: created.id })
}
