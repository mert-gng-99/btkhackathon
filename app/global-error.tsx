"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif", color: "#e5e7eb", background: "#0a0a0a", minHeight: "100vh" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ marginTop: "0.5rem", color: "#a3a3a3" }}>
            An unexpected error occurred. The issue has been reported.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              padding: "0.5rem 1rem",
              borderRadius: "9999px",
              background: "#fff",
              color: "#000",
              fontWeight: 600,
              cursor: "pointer",
              border: "none",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
