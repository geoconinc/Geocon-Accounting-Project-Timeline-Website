"use client";

import { useEffect } from "react";

export default function Error({
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-lg shadow-sm p-8 text-center">
        <h1 className="text-lg font-semibold text-slate-800 mb-2">Something went wrong</h1>
        <p className="text-sm text-slate-500 mb-6">
          The page hit an unexpected error. Your data is safe — try again, and if it keeps
          happening, refresh the page or contact an administrator.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="btn-primary text-sm"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-ghost text-sm"
          >
            Reload page
          </button>
        </div>
        {error.digest && (
          <p className="mt-4 text-[11px] text-slate-400">Reference: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
