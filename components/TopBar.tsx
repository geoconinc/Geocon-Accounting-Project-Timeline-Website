"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/types";
import { LogOut, X } from "lucide-react";
import { DEMO_MODE } from "@/lib/demo/config";
import { clearDemoSession } from "@/lib/demo/auth";

export default function TopBar({ user }: { user: User }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setConfirming(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirming]);

  async function logout() {
    setBusy(true);
    if (DEMO_MODE) {
      clearDemoSession();
    } else {
      await fetch("/api/logout", { method: "POST" });
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3 shrink-0">
      <span className="text-sm font-semibold text-brand-dark">Geocon Project Management</span>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-full bg-brand text-white grid place-items-center text-xs font-semibold"
          title={`${user.name} (${user.email})`}
        >
          {user.initials}
        </div>
        <div className="hidden sm:flex flex-col leading-tight">
          <span className="text-xs font-medium text-slate-700">{user.name}</span>
          <span className="text-[10px] text-slate-400">{user.email}</span>
        </div>
      </div>
      <button
        onClick={() => setConfirming(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm"
        title="Sign out"
      >
        <LogOut size={14} /> Log out
      </button>

      {confirming && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 grid place-items-center p-4"
          onClick={() => !busy && setConfirming(false)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-slate-800">Log out?</h2>
              <button
                onClick={() => !busy && setConfirming(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-5">
              You'll need to sign in with Microsoft again to access the project board.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirming(false)}
                disabled={busy}
                className="btn-ghost text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={logout}
                disabled={busy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50"
              >
                <LogOut size={14} /> {busy ? "Logging out..." : "Log out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
