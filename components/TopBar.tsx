"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/types";
import { LogOut, Mail, Settings, X } from "lucide-react";
import { formatAppVersionLabel } from "@/lib/config/appVersion";
import { ViewAsControls } from "@/components/ViewAsControls";
import type { ViewAsTarget } from "@/lib/domain/viewAs";

export default function TopBar({
  user,
  canViewAs = false,
  viewAs = null
}: {
  user: User;
  canViewAs?: boolean;
  viewAs?: ViewAsTarget | null;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [busy, setBusy] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setConfirming(false);
        setShowSettings(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!showSettings) return;
    const onClick = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [showSettings]);

  async function logout() {
    setBusy(true);
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="h-14 bg-gradient-to-b from-brand-dark to-[#062f37] border-b border-black/20 flex items-center px-4 gap-3 shrink-0">
      <span className="text-sm font-semibold text-white">Geocon Project Management</span>
      <div className="flex-1" />
      <ViewAsControls canViewAs={canViewAs} viewAs={viewAs} />
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-full bg-white/15 ring-1 ring-white/20 text-white grid place-items-center text-xs font-semibold"
          title={`${user.name} (${user.email})`}
        >
          {user.initials}
        </div>
        <div className="hidden sm:flex flex-col leading-tight">
          <span className="text-xs font-medium text-white">{user.name}</span>
          <span className="text-[10px] text-white/60">{user.email}</span>
        </div>
      </div>

      <div className="relative" ref={settingsRef}>
        <button
          onClick={() => setShowSettings((s) => !s)}
          className="p-2 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          title="Settings"
        >
          <Settings size={16} />
        </button>

        {showSettings && (
          <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-2xl border border-slate-200 z-50 animate-fade-in-up">
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-800">Settings</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand/10 text-brand grid place-items-center text-sm font-semibold">
                  {user.initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{user.name}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
              </div>
            </div>
            <div className="p-3">
              <p className="text-xs text-slate-500 mb-2">Need help?</p>
              <a
                href="mailto:mundra@geoconinc.com"
                className="flex items-center gap-2 text-xs text-brand hover:text-brand-dark font-medium"
              >
                <Mail size={14} />
                mundra@geoconinc.com
              </a>
            </div>
            <div className="p-3 pt-0">
              <p className="text-[10px] text-slate-400">
                {formatAppVersionLabel()}
              </p>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={() => setConfirming(true)}
        className="btn flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm hover:shadow-md"
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
            className="bg-white rounded-lg shadow-2xl w-full max-w-sm p-6 animate-fade-in-up"
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
              You&apos;ll need to sign in with Microsoft again to access the project board.
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
