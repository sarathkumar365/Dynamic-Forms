"use client";

import Link from "next/link";
import React from "react";

type Pub = { id: string; title: string | null; createdAt: string };

export default function RecentPublicationsClient({ items }: { items: Pub[] }) {
  const [dir, setDir] = React.useState<"desc" | "asc">("desc");

  const sorted = React.useMemo(() => {
    const copy = [...items];
    copy.sort((a, b) => {
      const at = new Date(a.createdAt).getTime();
      const bt = new Date(b.createdAt).getTime();
      return dir === "desc" ? bt - at : at - bt;
    });
    return copy;
  }, [items, dir]);

  return (
    <section className="card">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Recent Publications</h2>
        <button className="btn btn-sm" onClick={() => setDir((d) => (d === "desc" ? "asc" : "desc"))}>
          Sort: {dir === "desc" ? "Newest" : "Oldest"}
        </button>
      </div>
      {sorted.length === 0 ? (
        <div className="text-sm text-gray-600">No publications yet.</div>
      ) : (
        <ul className="divide-y">
          {sorted.map((p) => (
            <li key={p.id} className="py-2 flex items-center justify-between">
              <Link className="link" href={`/publications/${p.id}`}>
                {p.title ?? p.id}
              </Link>
              <span className="text-xs text-gray-500">
                {new Date(p.createdAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

