"use client";

import { useEffect, useState } from "react";
import { Mail, Phone, UserPlus, X, Trash2 } from "lucide-react";
import { demoStore, loadDb, type Invitation } from "@/lib/demo/localStore";
import { DEMO_MODE, DEMO_USER } from "@/lib/demo/config";
import type { User } from "@/lib/types";
import type { BoardData } from "@/components/features/board/state";
import { Avatar } from "@/components/features/board/Avatar";

export function TeamView() {
  const [users, setUsers] = useState<User[]>(() => (DEMO_MODE ? loadDb().users : []));
  const [invitations, setInvitations] = useState<Invitation[]>(() =>
    DEMO_MODE ? loadDb().invitations : []
  );
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    if (DEMO_MODE) {
      const refresh = () => {
        const db = loadDb();
        setUsers(db.users);
        setInvitations(db.invitations);
      };
      refresh();
      window.addEventListener("geocon-demo-change", refresh);
      return () => window.removeEventListener("geocon-demo-change", refresh);
    }

    let cancelled = false;
    const load = async () => {
      const res = await fetch("/api/projects");
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as BoardData;
      setUsers(data.users);
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="p-6 overflow-auto h-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-brand-dark">Team</h1>
          <p className="text-sm text-slate-500">Everyone with access to this board.</p>
        </div>
        {DEMO_MODE && (
          <button onClick={() => setShowInvite(true)} className="btn-primary text-sm">
            <UserPlus size={14} /> Invite person
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Member</th>
              <th className="text-left px-4 py-2 font-medium">Email</th>
              <th className="text-left px-4 py-2 font-medium">Phone</th>
              <th className="text-left px-4 py-2 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-3">
                    <Avatar user={u} size={32} />
                    <span className="font-medium">{u.name}</span>
                  </div>
                </td>
                <td className="px-4 py-2 text-slate-600">
                  <a href={`mailto:${u.email}`} className="hover:text-brand inline-flex items-center gap-1">
                    <Mail size={12} /> {u.email}
                  </a>
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {u.phone ? (
                    <span className="inline-flex items-center gap-1">
                      <Phone size={12} /> {u.phone}
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="px-4 py-2 text-slate-500">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {DEMO_MODE && invitations.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 font-medium border-b">
            Pending invitations
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {invitations.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium">{inv.name}</td>
                  <td className="px-4 py-2 text-slate-600">{inv.email}</td>
                  <td className="px-4 py-2 text-slate-500">
                    Invited {new Date(inv.invitedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full ${
                        inv.status === "accepted"
                          ? "bg-status-completed/15 text-status-completed"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        demoStore.removeInvitation(inv.id);
                        window.dispatchEvent(new CustomEvent("geocon-demo-change"));
                      }}
                      className="text-slate-300 hover:text-red-500"
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showInvite && <InviteDialog onClose={() => setShowInvite(false)} />}
    </div>
  );
}

function InviteDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function submit() {
    if (!name.trim() || !email.trim()) {
      setErr("Name and email are required");
      return;
    }
    setBusy(true);
    try {
      demoStore.invitePerson({
        name: name.trim(),
        email: email.trim(),
        invitedBy: DEMO_USER.id
      });
      window.dispatchEvent(new CustomEvent("geocon-demo-change"));
      window.dispatchEvent(
        new CustomEvent("geocon-toast", {
          detail: { message: `Invitation sent to ${email.trim()} (demo).` }
        })
      );
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 grid place-items-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-brand-dark">Invite person</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Name</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              className="border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Email</span>
            <input
              value={email}
              type="email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@geoconinc.com"
              onKeyDown={(e) => e.key === "Enter" && submit()}
              className="border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand"
            />
          </label>
          {err && <p className="text-xs text-red-600">{err}</p>}
          <p className="text-[11px] text-slate-500">
            They will receive an email invitation. In production, only @geoconinc.com accounts can sign in.
          </p>
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={onClose} className="btn-ghost text-sm">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={busy || !name.trim() || !email.trim()}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {busy ? "Sending..." : "Send invitation"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
