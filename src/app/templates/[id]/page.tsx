// src/app/templates/[id]/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { resolveOwner } from "@/lib/owner";
import { notFound, redirect } from "next/navigation";

export default async function FormPage({ params }: { params: { id: string } }) {
  const owner = await resolveOwner();
  const form = await prisma.form.findFirst({
    where: { id: params.id, ownerId: owner.id },
    include: { publications: true },
  });
  if (!form) return notFound();

  // Server action that calls the correct API route
  async function publishAction() {
    "use server";
    const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${base}/api/templates/${form.id}/publish`, {
      method: "POST",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || "Publish failed");
    }
    const pub = await res.json();
    redirect(`/publications/${pub.id}`);
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-xl font-semibold">{form.title}</h2>
        {form.description && (
          <p className="text-sm text-gray-600">{form.description}</p>
        )}
        <form action={publishAction}>
          <button className="btn mt-3">Publish (compile & snapshot)</button>
        </form>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-2">Publications</h3>
        <ul className="list-disc pl-5">
          {form.publications.map((p) => (
            <li key={p.id}>
              <Link className="link" href={`/publications/${p.id}`}>
                {p.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
