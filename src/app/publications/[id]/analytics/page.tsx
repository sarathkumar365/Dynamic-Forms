import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { resolveOwner } from "@/lib/owner";
import QueryClient from "@/components/analytics/QueryClient";

export default async function PublicationAnalytics({ params }: { params: { id: string } }) {
  const owner = await resolveOwner();
  const pub = await prisma.publication.findFirst({
    where: { id: params.id },
    include: { form: true },
  });
  if (!pub || !pub.form || pub.form.ownerId !== owner.id) {
    return <div className="card">Not found</div>;
  }

  // Derive suggested keys from a recent submission (if any)
  const last = await prisma.submission.findFirst({
    where: { formId: pub.formId },
    orderBy: { createdAt: "desc" },
  });
  let suggested: string[] = [];
  try {
    const payload: any = (last as any)?.payload ?? {};
    if (payload && typeof payload === "object") {
      suggested = Object.keys(payload).filter((k) => typeof (payload as any)[k] === "string");
    }
  } catch {}

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Analytics — {pub.title}</h1>
        <Link className="link" href={`/publications/${pub.id}`}>Back to publication</Link>
      </div>
      <div className="card">
        {/* Client-side query builder */}
        <QueryClient publicationId={pub.id} suggestedKeys={suggested} />
      </div>
    </div>
  );
}
