"use client";

import { useState } from "react";
import { usePopover } from "./Popover";
import { Avatar } from "./Avatar";
import type { User } from "@/lib/types";

export function OwnerCell({
  ownerId,
  users,
  onChange,
  allowClear = true,
  readOnly = false
}: {
  ownerId: string | null;
  users: User[];
  onChange: (id: string | null) => void;
  allowClear?: boolean;
  readOnly?: boolean;
}) {
  const { open, setOpen, ref } = usePopover();
  const [q, setQ] = useState("");

  const owner = users.find((u) => u.id === ownerId) ?? null;
  const filtered = q
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(q.toLowerCase()) ||
          u.email.toLowerCase().includes(q.toLowerCase())
      )
    : users;

  return (
    <div className="relative w-full h-full flex items-center justify-center" ref={ref}>
      <button
        onClick={() => {
          if (!readOnly) setOpen((o) => !o);
        }}
        className="peer"
        disabled={readOnly}
        title={
          owner
            ? `${owner.name} (${owner.email})${owner.phone ? ` · ${owner.phone}` : ""}${
                readOnly ? " · view only" : ""
              }`
            : readOnly
              ? "Unassigned"
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
      {open && !readOnly && (
        <div className="absolute z-30 top-full left-1/2 -translate-x-1/2 mt-1 bg-white rounded-md shadow-lg border border-slate-200 w-72">
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
                onClick={() => { onChange(null); setOpen(false); }}
                className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-500"
              >
                <span className="w-7 h-7 rounded-full bg-slate-100 grid place-items-center">—</span>
                Unassigned
              </button>
            )}
            {filtered.map((u) => (
              <button
                key={u.id}
                onClick={() => { onChange(u.id); setOpen(false); }}
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
        </div>
      )}
    </div>
  );
}
