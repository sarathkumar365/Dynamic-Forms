// import { prisma } from '@/lib/prisma'

// export async function POST(req: Request, { params }: { params: { token: string }}) {
//   const share = await prisma.shareLink.findUnique({ where: { token: params.token }, include: { publication: true } })
//   if (!share || share.isDisabled) return new Response('Not found', { status: 404 })

//   const body = await req.json() // { payload, meta? }
//   const created = await prisma.submission.create({
//     data: {
//       publicationId: share.publicationId,
//       shareLinkId: share.id,
//       payload: body?.payload ?? {},     // store as JSONB
//       meta: body?.meta ?? undefined     // store as JSONB
//     }
//   })
//   return Response.json({ id: created.id })
// }

// src/app/api/public/[token]/submit/route.ts
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: { token: string } }
) {
  const share = await prisma.shareLink.findUnique({
    where: { token: params.token },
    include: { publication: true },
  });
  if (!share || share.isDisabled || !share.publication)
    return new Response("Not found", { status: 404 });

  const body = await req.json();
  await prisma.submission.create({
    data: {
      formId: share.publication.formId,
      shareLinkId: share.id,
      payload: body?.payload ?? {},
    },
  });

  return Response.json({ ok: true });
}
