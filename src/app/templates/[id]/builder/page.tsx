import { prisma } from "@/lib/prisma"
import BuilderShell from "@/components/builder/BuilderShell"

export default async function TemplateBuilder({ params }: { params: { id: string } }) {
  const t = await prisma.template.findUnique({ where: { id: params.id } })
  if (!t) return <div>Not found</div>
  return (
    <div className="p-6">
      <BuilderShell initialSpec={t.formSpec as any} />
    </div>
  )
}
