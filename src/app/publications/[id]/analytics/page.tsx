import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { resolveOwner } from "@/lib/owner";
import QueryClient from "@/components/analytics/QueryClient";
import ChatClient from "@/components/analytics/ChatClient";

export default async function PublicationAnalytics({ params, searchParams }: { params: { id: string }, searchParams?: { [key: string]: string | string[] | undefined } }) {
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

  const tab = typeof searchParams?.tab === 'string' ? searchParams!.tab : 'builder';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Analytics — {pub.title}</h1>
        <div className="flex items-center gap-3">
          <Link className={`link ${tab === 'builder' ? 'font-bold' : ''}`} href={`/publications/${pub.id}/analytics?tab=builder`}>Builder</Link>
          <Link className={`link ${tab === 'chat' ? 'font-bold' : ''}`} href={`/publications/${pub.id}/analytics?tab=chat`}>Chat</Link>
          <Link className="link" href={`/publications/${pub.id}`}>Back to publication</Link>
        </div>
      </div>
      <div className="card">
        {tab === 'chat' ? (
          <ChatClient publicationId={pub.id} />
        ) : (
          <QueryClient publicationId={pub.id} suggestedKeys={suggested} />
        )}
      </div>
    </div>
  );
}
