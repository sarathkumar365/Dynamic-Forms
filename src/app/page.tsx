import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { resolveOwner } from '@/lib/owner'

export default async function Page() {
  const owner = await resolveOwner()
  const templates = await prisma.template.findMany({
    where: { ownerId: owner.id },
    orderBy: { updatedAt: 'desc' },
    include: { publications: true }
  })
  const publications = await prisma.publication.findMany({
    where: { ownerId: owner.id },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <section className="card">
        <h2 className="text-lg font-semibold mb-2">Templates</h2>
        <div className="mb-3"><Link href="/templates/new" className="btn">+ New Template</Link></div>
        <table className="table">
          <thead><tr><th>Name</th><th>Version</th><th>Publications</th></tr></thead>
          <tbody>
            {templates.map(t => (
              <tr key={t.id}>
                <td><Link className="link" href={`/templates/${t.id}`}>{t.name}</Link></td>
                <td>{t.version}</td>
                <td>{t.publications.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold mb-2">Publications</h2>
        <table className="table">
          <thead><tr><th>Title</th><th>Created</th></tr></thead>
          <tbody>
            {publications.map(p => (
              <tr key={p.id}>
                <td><Link className="link" href={`/publications/${p.id}`}>{p.title}</Link></td>
                <td>{new Date(p.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
