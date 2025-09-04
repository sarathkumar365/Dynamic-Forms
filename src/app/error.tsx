"use client";
import React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="container py-12">
          <div className="max-w-xl mx-auto rounded-lg border p-6 bg-white">
            <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
            <p className="text-sm text-gray-700 mb-4">
              We couldn’t complete your request. This may be temporary. Please try again.
            </p>
            <div className="flex items-center gap-2">
              <button className="btn" onClick={reset}>Retry</button>
              <button className="btn-base btn-ghost btn-md" onClick={() => (window.location.href = "/")}>Go home</button>
            </div>
            {process.env.NODE_ENV !== "production" && error?.message ? (
              <details className="mt-4 text-xs text-gray-600 whitespace-pre-wrap">
                <summary className="cursor-pointer mb-2">Error details</summary>
                {error.message}
                {error.digest ? `\nDigest: ${error.digest}` : null}
              </details>
            ) : null}
          </div>
        </div>
      </body>
    </html>
  );
}

