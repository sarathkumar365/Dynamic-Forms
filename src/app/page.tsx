import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { resolveOwner } from "@/lib/owner";
import RecentPublicationsClient from "@/components/home/RecentPublicationsClient";

export const dynamic = 'force-dynamic'

export default async function Page() {
  const owner = await resolveOwner();
  const forms = await prisma.form.findMany({
    where: { ownerId: owner.id },
    orderBy: { updatedAt: "desc" },
    include: { publications: true },
  });
  const formIds = forms.map((f) => f.id);
  const publications = await prisma.publication.findMany({
    where: { formId: { in: formIds } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Forms</h1>
        {/* <Link href="/templates/new" className="btn">+ New Form</Link> */}
      </div>

      {/* Forms grid */}
      <section className="card">
        {forms.length === 0 ? (
          <div className="text-sm text-gray-600">No forms yet. Click “New Form” to get started.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {forms.map((f) => (
              <Link key={f.id} href={`/forms/${f.id}`} className="block rounded-xl border p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{f.title}</div>
                  <span className="badge">{f.publications.length} published</span>
                </div>
                {f.description ? (
                  <div className="text-sm text-gray-600 mt-1 line-clamp-2">{f.description}</div>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent publications with client-side sort */}
      <RecentPublicationsClient
        items={publications.map((p) => ({ id: p.id, title: p.title, createdAt: p.createdAt.toISOString() }))}
      />
    </div>
  );
}
