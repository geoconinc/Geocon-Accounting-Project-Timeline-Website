"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Search, X } from "lucide-react";
import type { User } from "@/lib/types";
import type { ViewAsTarget } from "@/lib/domain/viewAs";

export function ViewAsControls({
  canViewAs,
  viewAs
}: {
  canViewAs: boolean;
  viewAs: ViewAsTarget | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open || loaded) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/users");
        if (!res.ok) return;
        const data = (await res.json()) as { users: User[] };
        if (!cancelled) {
          setUsers(data.users ?? []);
          setLoaded(true);
        }
      } catch {
        // ignore — picker stays empty
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, loaded]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...users].sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return list;
    return list.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [users, query]);

  async function setViewAs(userId: string | null) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/view-as", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId })
      });
      if (!res.ok) return;
      setOpen(false);
      setQuery("");
      router.refresh();
      // Hard reload so client board state / SSE refetch picks up filtered payload.
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  if (!canViewAs) return null;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={busy}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-50 ${
          viewAs
            ? "bg-amber-400/20 text-amber-100 ring-1 ring-amber-300/40 hover:bg-amber-400/30"
            : "text-white/80 hover:text-white hover:bg-white/10"
        }`}
        title="Preview the board as another person"
      >
        <Eye size={14} />
        <span className="hidden md:inline">{viewAs ? `Viewing as ${viewAs.name}` : "View as"}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-2xl border border-slate-200 z-50 overflow-hidden">
          <div className="p-3 border-b border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-800">View as</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">
              Preview filtered board visibility. Editing is locked until you exit.
            </p>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name or email..."
                autoFocus
                className="w-full pl-8 pr-2 py-1.5 text-sm border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>
          {viewAs && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void setViewAs(null)}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border-b border-amber-100"
            >
              Exit — back to my admin view
            </button>
          )}
          <div className="max-h-64 overflow-auto">
            {!loaded && <p className="px-3 py-4 text-xs text-slate-400">Loading people…</p>}
            {loaded && filtered.length === 0 && (
              <p className="px-3 py-4 text-xs text-slate-400">No matches</p>
            )}
            {filtered.map((u) => (
              <button
                key={u.id}
                type="button"
                disabled={busy}
                onClick={() => void setViewAs(u.id)}
                className={`w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50 ${
                  viewAs?.id === u.id ? "bg-amber-50" : ""
                }`}
              >
                <span className="w-7 h-7 rounded-full bg-brand/10 text-brand grid place-items-center text-[10px] font-semibold shrink-0">
                  {u.initials}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm text-slate-800 truncate">{u.name}</span>
                  <span className="block text-[11px] text-slate-500 truncate">{u.email}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ViewAsBanner({
  viewAs,
  canViewAs
}: {
  viewAs: ViewAsTarget | null;
  canViewAs: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (!canViewAs || !viewAs) return null;

  async function exit() {
    setBusy(true);
    try {
      await fetch("/api/admin/view-as", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: null })
      });
      router.refresh();
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-3 text-sm text-amber-950">
      <Eye size={16} className="text-amber-700 shrink-0" />
      <p className="flex-1 min-w-0">
        <span className="font-semibold">Viewing as {viewAs.name}</span>
        <span className="text-amber-800/80"> ({viewAs.email}) — board is read-only</span>
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void exit()}
        className="shrink-0 px-2.5 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold disabled:opacity-50"
      >
        {busy ? "Exiting…" : "Exit view as"}
      </button>
    </div>
  );
}
