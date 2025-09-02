// import Link from 'next/link'
// import { prisma } from '@/lib/prisma'
// import { resolveOwner } from '@/lib/owner'
// import { notFound } from 'next/navigation'

// export default async function TemplatePage({ params }: { params: { id: string }}) {
//   const owner = await resolveOwner()
//   const tpl = await prisma.template.findFirst({ where: { id: params.id, ownerId: owner.id }, include: { publications: true } })
//   if (!tpl) return notFound()

//   async function publish(data: FormData) {
//     'use server'
//     const owner = await resolveOwner()
//     const tpl = await prisma.template.findFirst({ where: { id: data.get('id') as string, ownerId: owner.id } })
//     if (!tpl) return
//     await prisma.publication.create({
//       data: {
//         templateId: tpl.id,
//         ownerId: owner.id,
//         title: `${tpl.name} v${tpl.version}`,
//         schema: tpl.schema,      // already string
//         uiSchema: tpl.uiSchema ?? undefined,
//       }
//     })
//   }

//   return (
//     <div className="space-y-4">
//       <div className="card">
//         <h2 className="text-xl font-semibold">{tpl.name}</h2>
//         <p className="text-sm text-gray-600">{tpl.description}</p>
//         <p className="text-sm">Version: {tpl.version}</p>
//         <form action={publish}>
//           <input type="hidden" name="id" value={tpl.id} />
//           <button className="btn mt-3">Publish</button>
//         </form>
//       </div>

//       <div className="card">
//         <h3 className="font-semibold mb-2">Publications</h3>
//         <table className="table">
//           <thead><tr><th>Title</th><th>Created</th></tr></thead>
//           <tbody>
//             {tpl.publications.map(p => (
//               <tr key={p.id}>
//                 <td><Link className="link" href={`/publications/${p.id}`}>{p.title}</Link></td>
//                 <td>{new Date(p.createdAt).toLocaleString()}</td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   )
// }
import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function TemplatePage({ params }: { params: { id: string } }) {
  const t = await prisma.template.findUnique({ where: { id: params.id } })
  if (!t) return <div>Not found</div>
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">{t.name}</h1>
      <p className="text-sm text-muted-foreground">{t.description}</p>
      <div className="flex gap-2">
        <Link className="btn" href={`/templates/${t.id}/builder`}>Open in Builder</Link>
        <form action={`/api/templates/${t.id}/publish`} method="post">
          <button className="btn">Publish live version</button>
        </form>
      </div>
      <pre className="text-xs bg-muted p-3 rounded">{JSON.stringify(t.formSpec, null, 2)}</pre>
    </div>
  )
}
