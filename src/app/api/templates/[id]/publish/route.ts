import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveOwner } from "@/lib/owner"
import { compileFormSpec } from "@/lib/formspec/compile"

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const tpl = await prisma.template.findUnique({ where: { id: params.id } })
  if (!tpl?.formSpec) return NextResponse.json({ error: "Template or formSpec not found" }, { status: 404 })

  const { schema, uiSchema } = compileFormSpec(tpl.formSpec as any)
  const owner = await resolveOwner()

  const pub = await prisma.publication.create({
    data: {
      templateId: tpl.id,
      ownerId: owner.id,
      title: tpl.name,
      schema,
      uiSchema
    }
  })
  return NextResponse.redirect(new URL(`/publications/${pub.id}`, process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"))
}
