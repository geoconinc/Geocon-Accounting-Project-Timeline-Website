"use client";

import type { User } from "@/lib/types";
import { Avatar } from "./Avatar";
import { formatRelativeTime } from "@/lib/utils";

export function LastUpdatedCell({
  at,
  by,
  users
}: {
  at: string;
  by: string | null;
  users: User[];
}) {
  const user = users.find((u) => u.id === by) ?? null;
  const full = new Date(at).toLocaleString();
  return (
    <div className="flex items-center gap-2 px-1" title={user ? `${user.name} • ${full}` : full}>
      <Avatar user={user} size={22} />
      <span className="text-[11px] text-slate-500 truncate">{formatRelativeTime(at)}</span>
    </div>
  );
}
