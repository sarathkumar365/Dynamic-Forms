import { prisma } from "@/lib/prisma";
import BuilderShell from "@/components/builder/BuilderShell";

export default async function FormBuilder({
  params,
}: {
  params: { id: string };
}) {
  const form = await prisma.form.findUnique({ where: { id: params.id } });
  if (!form) return <div>Not found</div>;
  return (
    <div className="p-6">
      <BuilderShell initialSpec={form} />
    </div>
  );
}
