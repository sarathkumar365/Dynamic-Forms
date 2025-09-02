import { prisma } from '@/lib/prisma'
import { resolveOwner } from '@/lib/owner'
import { compileFormSpec } from '@/lib/formspec/compile'
import { validateFormSpec } from '@/lib/formspec/validators'

export async function POST(_: Request, { params }: { params: { id: string }}) {
  const owner = await resolveOwner()
  const tpl = await prisma.template.findFirst({
    where: { id: params.id, ownerId: owner.id }
  })
  if (!tpl) return new Response('Not found', { status: 404 })

  const spec = tpl.formSpec as any
  const v = validateFormSpec(spec)
  if (!v.ok) {
    return new Response(JSON.stringify({ error: 'Invalid FormSpec', details: v.errors }), { status: 400 })
  }

  const { schema, uiSchema } = compileFormSpec(spec)

  if (!schema?.properties || Object.keys(schema.properties).length === 0) {
    return new Response(JSON.stringify({ error: 'Form has no questions to publish.' }), { status: 400 })
  }

  const pub = await prisma.publication.create({
    data: {
      templateId: tpl.id,
      ownerId: owner.id,
      title: `${tpl.name} v${tpl.version}`,
      schema,     // <-- compiled JSON object
      uiSchema    // <-- compiled JSON object (or {})
    }
  })

  await prisma.template.update({ where: { id: tpl.id }, data: { version: { increment: 1 } } })

// TEMP LOG: remove after testing
console.log('[publish] props count =', Object.keys(schema?.properties || {}).length)
console.log('[publish] prop keys    =', Object.keys(schema?.properties || {}))

  return Response.json(pub)
}
