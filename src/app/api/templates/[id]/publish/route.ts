import { prisma } from '@/lib/prisma'
import { resolveOwner } from '@/lib/owner'

export async function POST(_: Request, { params }: { params: { id: string }}) {
  const owner = await resolveOwner()
  const tpl = await prisma.template.findFirst({ where: { id: params.id, ownerId: owner.id } })
  if (!tpl) return new Response('Not found', { status: 404 })
  const pub = await prisma.publication.create({
    data: {
      templateId: tpl.id,
      ownerId: owner.id,
      title: `${tpl.name} v${tpl.version}`,
      schema: tpl.schema,
      uiSchema: tpl.uiSchema ?? undefined,
    }
  })
  return Response.json(pub)
}
