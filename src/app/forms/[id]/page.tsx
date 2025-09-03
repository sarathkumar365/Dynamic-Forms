import { prisma } from "@/lib/prisma";
import { resolveOwner } from "@/lib/owner";
import { notFound } from "next/navigation";
import FormDetailClient from "@/components/forms/FormDetailClient";

export default async function FormPage({ params }: { params: { id: string } }) {
  const owner = await resolveOwner();
  const form = await prisma.form.findFirst({
    where: { id: params.id, ownerId: owner.id },
    include: { publications: true },
  });
  if (!form) return notFound();
  return <FormDetailClient form={form} />;
}
