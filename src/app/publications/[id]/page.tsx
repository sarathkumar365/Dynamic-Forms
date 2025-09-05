import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { resolveOwner } from "@/lib/owner";
import { notFound } from "next/navigation";
import { nanoid } from "@/lib/id";
import { revalidatePath } from "next/cache";

export const dynamic = 'force-dynamic'

export default async function PublicationPage({
  params,
}: {
  params: { id: string };
}) {
  const owner = await resolveOwner();
  const pub = await prisma.publication.findFirst({
    where: { id: params.id },
    include: {
      form: true,
      shareLinks: true,
    },
  });
  if (!pub || !pub.form || pub.form.ownerId !== owner.id) return notFound();

  // Stats
  const [submissionsCount, links] = await Promise.all([
    prisma.submission.count({ where: { formId: pub.formId } }),
    prisma.shareLink.findMany({ where: { publicationId: pub.id }, select: { id: true, token: true, isDisabled: true, createdAt: true, assignedName: true, assignedEmail: true, note: true } }),
  ]);
  const totalLinks = links.length;
  // Try to compute total link opens; fallback to 0 if column not present yet
  let totalOpens = 0;
  try {
    const rows = await prisma.$queryRaw<{ value: number | bigint }[]>`
      SELECT COALESCE(SUM("viewCount"), 0)::bigint AS value
      FROM "ShareLink" WHERE "publicationId" = ${pub.id}
    `;
    const v = rows?.[0]?.value ?? 0;
    totalOpens = typeof v === 'bigint' ? Number(v) : Number(v || 0);
  } catch {}

  // Existing: generic link
  async function createShareLink() {
    "use server";
    const owner = await resolveOwner();
    const pub = await prisma.publication.findFirst({
      where: { id: params.id },
      include: { form: true },
    });
    if (!pub || !pub.form || pub.form.ownerId !== owner.id) return;
    await prisma.shareLink.create({
      data: { publicationId: pub.id, token: nanoid(16) },
    });
    revalidatePath(`/publications/${params.id}`);
  }

  // Set publication slug
  async function setPublicationSlug(formData: FormData) {
    "use server";
    const owner = await resolveOwner();
    const pub = await prisma.publication.findFirst({ where: { id: params.id }, include: { form: true } });
    if (!pub || !pub.form || pub.form.ownerId !== owner.id) return;
    const slug = (formData.get("slug") as string || "").trim();
    if (slug) {
      await prisma.publication.update({ where: { id: pub.id }, data: { slug } });
    }
  }

  // Set share link slug
  async function setShareSlug(formData: FormData) {
    "use server";
    const owner = await resolveOwner();
    const pub = await prisma.publication.findFirst({ where: { id: params.id }, include: { form: true } });
    if (!pub || !pub.form || pub.form.ownerId !== owner.id) return;
    const linkId = formData.get("linkId") as string;
    const slug = (formData.get("slug") as string || "").trim();
    if (!linkId) return;
    await prisma.shareLink.update({ where: { id: linkId }, data: { slug } });
  }

  // NEW: assigned link via server action
  async function createAssignedLink(formData: FormData) {
    "use server";
    const owner = await resolveOwner();
    const pub = await prisma.publication.findFirst({
      where: { id: params.id },
      include: { form: true },
    });
    if (!pub || !pub.form || pub.form.ownerId !== owner.id) return;
    const assignedName = (formData.get("assignedName") as string) || null;
    const assignedEmail = (formData.get("assignedEmail") as string) || null;
    const note = (formData.get("note") as string) || null;
    await prisma.shareLink.create({
      data: {
        publicationId: pub.id,
        token: nanoid(16),
        assignedName,
        assignedEmail,
        note,
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-xl font-semibold">{pub.title}</h2>
        <p className="text-sm text-gray-600">
          Created: {new Date(pub.createdAt).toLocaleString()}
        </p>
      </div>

      {/* LINKS */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Share Links</h3>
          <form action={createShareLink}>
            <button className="btn">Generate Link</button>
          </form>
        </div>

        {/* Minimal list of links to share */}
        <ul className="space-y-2">
          {pub.shareLinks.map((sl) => (
            <li key={sl.id} className="flex items-center justify-between">
              <code className="text-xs break-all">/f/{sl.token}</code>
              <Link className="link" href={`/f/${sl.token}`} target="_blank">Open</Link>
            </li>
          ))}
        </ul>
      </div>

      {/* OVERVIEW */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Overview</h3>
          <div className="flex items-center gap-2">
            <Link href={`/publications/${pub.id}/analytics`} className="btn">Analyze Responses</Link>
            <a className="btn" href={`/api/publications/${pub.id}/submissions/export`}>Export CSV</a>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Stat title="Links shared" value={totalLinks} />
          <Stat title="Link opens" value={totalOpens} />
          <Stat title="Submissions" value={submissionsCount} />
        </div>
      </div>
    </div>
  );
}

function pretty(v: any) {
  if (v == null) return "";
  if (typeof v === "string") {
    try {
      return JSON.stringify(JSON.parse(v), null, 2);
    } catch {
      return v;
    }
  }
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-gray-600">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
