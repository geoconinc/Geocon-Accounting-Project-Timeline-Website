"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f8fafc" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px"
          }}
        >
          <div
            style={{
              maxWidth: "28rem",
              width: "100%",
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "0.5rem",
              padding: "2rem",
              textAlign: "center"
            }}
          >
            <h1 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#1e293b", marginBottom: "0.5rem" }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: "1.5rem" }}>
              The application hit an unexpected error. Please try again or reload the page.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                background: "#1d4ed8",
                color: "#fff",
                border: 0,
                borderRadius: "0.375rem",
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                cursor: "pointer"
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
