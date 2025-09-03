import { prisma } from "@/lib/prisma";

export async function GET(
  _: Request,
  { params }: { params: { token: string } }
) {
  // Find share link and publication
  const share = await prisma.shareLink.findUnique({
    where: { token: params.token },
    include: {
      publication: true,
    },
  });
  if (!share || share.isDisabled || !share.publication) {
    return new Response("Not found", { status: 404 });
  }
  // Return compiled schema and uiSchema for public form rendering
  return Response.json({
    schema: share.publication.schema,
    uiSchema: share.publication.uiSchema,
  });
}
