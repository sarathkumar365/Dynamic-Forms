import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { resolveOwner } from "@/lib/owner";

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
  });

  return (
    <div className="space-y-6">
      {/* NEW: Mode picker */}
      <section className="card">
        <h2 className="text-lg font-semibold mb-2">Create a new form</h2>
        <p className="text-sm text-gray-600 mb-3">
          Choose how you want to build your form.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/templates/new?mode=ai" className="btn">
            ✨ Use AI
          </Link>
          <Link href="/templates/new?mode=manual" className="btn">
            🛠️ Create Manually
          </Link>
        </div>
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold mb-2">Forms</h2>
        <div className="mb-3">
          <Link href="/forms/new" className="btn">
            + New Form
          </Link>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Publications</th>
            </tr>
          </thead>
          <tbody>
            {forms.map((f) => (
              <tr key={f.id}>
                <td>
                  <Link className="link" href={`/forms/${f.id}`}>
                    {f.title}
                  </Link>
                </td>
                <td>{f.publications.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold mb-2">Publications</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {publications.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link className="link" href={`/publications/${p.id}`}>
                    {p.title}
                  </Link>
                </td>
                <td>{new Date(p.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
