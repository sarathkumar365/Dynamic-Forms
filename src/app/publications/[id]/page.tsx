import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { resolveOwner } from '@/lib/owner'
import { notFound } from 'next/navigation'
import { nanoid } from '@/lib/id'

export default async function PublicationPage({ params }: { params: { id: string }}) {
  const owner = await resolveOwner()
  const pub = await prisma.publication.findFirst({
    where: { id: params.id, ownerId: owner.id },
    include: {
      shareLinks: true,
      submissions: { include: { shareLink: true }, orderBy: { createdAt: 'desc' } }
    }
  })
  if (!pub) return notFound()

  // Existing: generic link
  async function createShareLink() {
    'use server'
    const owner = await resolveOwner()
    const pub = await prisma.publication.findFirst({ where: { id: params.id, ownerId: owner.id } })
    if (!pub) return
    await prisma.shareLink.create({
      data: { publicationId: pub.id, token: nanoid(16) }
    })
  }

  // NEW: assigned link via server action
  async function createAssignedLink(formData: FormData) {
    'use server'
    const owner = await resolveOwner()
    const pub = await prisma.publication.findFirst({ where: { id: params.id, ownerId: owner.id } })
    if (!pub) return
    const assignedName = (formData.get('assignedName') as string) || null
    const assignedEmail = (formData.get('assignedEmail') as string) || null
    const note = (formData.get('note') as string) || null
    await prisma.shareLink.create({
      data: {
        publicationId: pub.id,
        token: nanoid(16),
        assignedName,
        assignedEmail,
        note
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-xl font-semibold">{pub.title}</h2>
        <p className="text-sm text-gray-600">Created: {new Date(pub.createdAt).toLocaleString()}</p>
      </div>

      {/* LINKS */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Share Links</h3>
          <form action={createShareLink}><button className="btn">+ New Generic Link</button></form>
        </div>

        {/* NEW: Assigned Link Creator */}
        <div className="border rounded-lg p-3">
          <h4 className="font-medium mb-2">Create Assigned Link</h4>
          <form action={createAssignedLink} className="grid md:grid-cols-4 gap-2">
            <input className="input" name="assignedName" placeholder="Recipient name (optional)" />
            <input className="input" name="assignedEmail" placeholder="Recipient email (optional)" />
            <input className="input md:col-span-2" name="note" placeholder="Internal note (optional)" />
            <div className="md:col-span-4">
              <button className="btn">+ Create Assigned Link</button>
            </div>
          </form>
        </div>

        {/* List all links with labels */}
        <ul className="space-y-2">
          {pub.shareLinks.map(sl => {
            const label = sl.assignedName || sl.assignedEmail ? (
              <>
                <span className="font-medium">{sl.assignedName || 'Unnamed'}</span>
                {sl.assignedEmail ? <span className="text-xs text-gray-600 ml-2">&lt;{sl.assignedEmail}&gt;</span> : null}
                {sl.note ? <span className="text-xs text-gray-500 ml-2">— {sl.note}</span> : null}
              </>
            ) : (<span className="text-xs text-gray-600">Generic</span>)
            return (
              <li key={sl.id} className="flex items-center justify-between">
                <div className="flex flex-col">
                  <code className="text-xs break-all">/f/{sl.token}</code>
                  <div className="text-sm">{label}</div>
                </div>
                <Link className="link" href={`/f/${sl.token}`} target="_blank">Open</Link>
              </li>
            )
          })}
        </ul>
      </div>

      {/* SUBMISSIONS */}
      <div className="card">
        <h3 className="font-semibold mb-2">Submissions ({pub.submissions.length})</h3>
        <table className="table">
          <thead>
            <tr>
              <th style={{width:'200px'}}>When</th>
              <th style={{width:'260px'}}>Via Link</th>
              <th>Payload</th>
            </tr>
          </thead>
          <tbody>
            {pub.submissions.map(s => (
              <tr key={s.id}>
                <td>{new Date(s.createdAt).toLocaleString()}</td>
                <td className="align-top">
                  <div className="text-xs break-all">/f/{s.shareLink?.token}</div>
                  {s.shareLink && (s.shareLink.assignedName || s.shareLink.assignedEmail) ? (
                    <div className="text-xs text-gray-700">
                      {s.shareLink.assignedName || 'Unnamed'}
                      {s.shareLink.assignedEmail ? <> &lt;{s.shareLink.assignedEmail}&gt;</> : null}
                      {s.shareLink.note ? <> — {s.shareLink.note}</> : null}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">Generic</div>
                  )}
                </td>
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
