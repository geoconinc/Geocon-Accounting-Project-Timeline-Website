"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { usePopover } from "./Popover";
import { Avatar } from "./Avatar";
import type { User } from "@/lib/types";
import { DEMO_MODE } from "@/lib/demo/config";
import { demoStore } from "@/lib/demo/localStore";

export function OwnerCell({
  ownerId,
  users,
  onChange,
  allowClear = true,
  allowAddNewContact = true
}: {
  ownerId: string | null;
  users: User[];
  onChange: (id: string | null) => void;
  allowClear?: boolean;
  allowAddNewContact?: boolean;
}) {
  const { open, setOpen, ref } = usePopover();
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const owner = users.find((u) => u.id === ownerId) ?? null;
  const filtered = q
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(q.toLowerCase()) ||
          u.email.toLowerCase().includes(q.toLowerCase())
      )
    : users;

  function reset() {
    setAdding(false);
    setNewName("");
    setNewEmail("");
    setNewPhone("");
    setQ("");
  }

  function createContact() {
    if (!newName.trim() || !newEmail.trim()) return;
    if (!DEMO_MODE) return;
    const user = demoStore.upsertUser({
      name: newName.trim(),
      email: newEmail.trim(),
      phone: newPhone.trim() || undefined
    });
    onChange(user.id);
    window.dispatchEvent(new CustomEvent("geocon-demo-change"));
    reset();
    setOpen(false);
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="peer"
        title={
          owner
            ? `${owner.name} (${owner.email})${owner.phone ? ` · ${owner.phone}` : ""}`
            : "Assign"
        }
      >
        <Avatar user={owner} />
      </button>
      {owner && !open && (
        <div className="pointer-events-none absolute hidden peer-hover:block bg-white border border-slate-200 rounded shadow p-2 text-xs left-1/2 -translate-x-1/2 top-full mt-1 z-20 whitespace-nowrap">
          <div className="font-semibold">{owner.name}</div>
          <div className="text-slate-500">{owner.email}</div>
          {owner.phone && <div className="text-slate-500">{owner.phone}</div>}
        </div>
      )}
      {open && (
        <div className="absolute z-30 top-full left-1/2 -translate-x-1/2 mt-1 bg-white rounded-md shadow-lg border border-slate-200 w-72">
          {!adding ? (
            <>
              <input
                autoFocus
                placeholder="Search by name..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full px-3 py-2 border-b text-xs outline-none"
              />
              <div className="max-h-56 overflow-y-auto py-1">
                {allowClear && (
                  <button
                    onClick={() => {
                      onChange(null);
                      setOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-500"
                  >
                    <span className="w-7 h-7 rounded-full bg-slate-100 grid place-items-center">
                      —
                    </span>
                    Unassigned
                  </button>
                )}
                {filtered.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      onChange(u.id);
                      setOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Avatar user={u} size={28} />
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium truncate">{u.name}</span>
                      <span className="text-slate-500 text-[10px] truncate">{u.email}</span>
                    </div>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="px-3 py-4 text-xs text-slate-400">No users found.</div>
                )}
              </div>
              {DEMO_MODE && allowAddNewContact && (
                <button
                  onClick={() => setAdding(true)}
                  className="w-full px-3 py-2 text-left text-xs border-t hover:bg-slate-50 flex items-center gap-2 text-brand"
                >
                  <UserPlus size={14} /> Add new contact
                </button>
              )}
            </>
          ) : (
            <div className="p-3 flex flex-col gap-2">
              <div className="text-xs font-semibold">New contact</div>
              <input
                autoFocus
                placeholder="Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="border rounded px-2 py-1 text-xs outline-none"
              />
              <input
                placeholder="Email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="border rounded px-2 py-1 text-xs outline-none"
              />
              <input
                placeholder="Phone (optional)"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="border rounded px-2 py-1 text-xs outline-none"
              />
              <div className="flex justify-end gap-2 mt-1">
                <button onClick={reset} className="btn-ghost text-xs">
                  Cancel
                </button>
                <button
                  onClick={createContact}
                  disabled={!newName.trim() || !newEmail.trim()}
                  className="btn-primary text-xs disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
