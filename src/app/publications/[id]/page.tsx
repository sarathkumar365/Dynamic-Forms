import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { resolveOwner } from '@/lib/owner'
import { notFound } from 'next/navigation'
import { nanoid } from '@/lib/id'

export default async function PublicationPage({ params }: { params: { id: string }}) {
  const owner = await resolveOwner()
  const pub = await prisma.publication.findFirst({
    where: { id: params.id, ownerId: owner.id },
    include: { shareLinks: true, submissions: true }
  })
  if (!pub) return notFound()

  async function createShareLink() {
    'use server'
    const owner = await resolveOwner()
    const pub = await prisma.publication.findFirst({ where: { id: params.id, ownerId: owner.id } })
    if (!pub) return
    await prisma.shareLink.create({
      data: { publicationId: pub.id, token: nanoid(16) }
    })
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-xl font-semibold">{pub.title}</h2>
        <p className="text-sm text-gray-600">Created: {new Date(pub.createdAt).toLocaleString()}</p>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Share Links</h3>
          <form action={createShareLink}><button className="btn">+ New Share Link</button></form>
        </div>
        <ul className="space-y-2">
          {pub.shareLinks.map(sl => (
            <li key={sl.id} className="flex items-center justify-between">
              <code className="text-xs break-all">/f/{sl.token}</code>
              <Link className="link" href={`/f/${sl.token}`} target="_blank">Open</Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-2">Submissions ({pub.submissions.length})</h3>
        <table className="table">
          <thead><tr><th>When</th><th>Payload</th></tr></thead>
          <tbody>
            {pub.submissions.map(s => (
              <tr key={s.id}>
                <td>{new Date(s.createdAt).toLocaleString()}</td>
                <td><pre className="whitespace-pre-wrap text-xs">{pretty(s.payload)}</pre></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function pretty(s: string | null) {
  if (!s) return ''
  try { return JSON.stringify(JSON.parse(s), null, 2) } catch { return s }
}
