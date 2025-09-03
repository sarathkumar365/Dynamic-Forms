"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * If your publish endpoint is /api/templates/[id]/publish (Template -> Publication),
 * pass kind="template" (default). If you actually publish from Form, pass kind="form".
 */
export default function FormDetailClient({
  form,
  kind = "template", // "template" | "form"
}: {
  form: any;
  kind?: "template" | "form";
}) {
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  async function publishAction(entityId: string) {
    setPublishError(null);
    setPublishing(true);

    // Choose endpoint shape based on kind
    const path =
      kind === "form"
        ? `/api/forms/${entityId}/publish`
        : `/api/templates/${entityId}/publish`;

    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        // Try to surface server-provided error details
        let serverMsg = "";
        try {
          const data = await res.json();
          if (data?.details && Array.isArray(data.details)) {
            serverMsg = `${data.error || "Publish failed"}\n${data.details.join(
              "\n"
            )}`;
          } else if (data?.error) {
            serverMsg = data.error;
          }
        } catch {
          /* ignore JSON parse error */
        }
        setPublishError(
          serverMsg || `Publish failed (HTTP ${res.status} ${res.statusText})`
        );
        return;
      }

      const pub = await res.json(); // expect { id: string, ... }
      // Navigate to the new publication
      window.location.href = `/publications/${pub.id}`;
    } catch (err: any) {
      // Network errors / CORS / bad base URL will land here
      setPublishError(
        err?.message
          ? `Network error: ${err.message}`
          : "Network error while publishing."
      );
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-xl font-semibold">{form.title}</h2>
        {form.description && (
          <p className="text-sm text-gray-600">{form.description}</p>
        )}

        <button
          className="btn mt-3"
          onClick={() => publishAction(form.id)}
          disabled={publishing}
        >
          {publishing ? "Publishing…" : "Publish (compile & snapshot)"}
        </button>

        {publishError && (
          <div className="mt-3 text-sm text-red-600 whitespace-pre-line">
            {publishError}
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="font-semibold mb-2">Publications</h3>
        {(!form.publications || form.publications.length === 0) && (
          <p className="text-sm text-gray-600">No publications yet.</p>
        )}
        <ul className="list-disc pl-5">
          {(form.publications ?? []).map((p: any) => (
            <li key={p.id}>
              <Link className="link" href={`/publications/${p.id}`}>
                {p.title ?? p.id}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
