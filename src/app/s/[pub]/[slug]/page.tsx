import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PublicFormClient from "@/components/PublicFormClient";

export default async function FormBySlug({ params }: { params: { pub: string; slug: string } }) {
  const pub = await prisma.publication.findFirst({ where: { slug: params.pub } });
  if (!pub) return notFound();
  const share = await prisma.shareLink.findFirst({ where: { publicationId: pub.id, slug: params.slug }, include: { publication: true } });
  if (!share || share.isDisabled) return notFound();
  try { await prisma.shareLink.update({ where: { id: share.id }, data: { viewCount: { increment: 1 } } }); } catch {}

  const schema = share.publication.schema as any;
  const uiSchema = (share.publication.uiSchema as any) ?? {};
  if (!schema || Object.keys(schema).length === 0) return notFound();

  return (
    <div className="card">
      <h1 className="text-xl font-semibold mb-3">{share.publication.title}</h1>
      <PublicFormClient token={share.token} schema={schema} uiSchema={uiSchema} />
    </div>
  );
}

