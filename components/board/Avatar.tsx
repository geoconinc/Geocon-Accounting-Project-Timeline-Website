"use client";

import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Avatar({
  user,
  size = 28,
  title
}: {
  user?: User | null;
  size?: number;
  title?: string;
}) {
  if (!user) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-full bg-slate-200 text-slate-400 grid place-items-center text-[11px] font-medium"
        title={title}
      >
        ?
      </div>
    );
  }
  return (
    <div
      style={{ width: size, height: size }}
      className={cn(
        "rounded-full bg-brand text-white grid place-items-center font-semibold uppercase",
        size <= 24 ? "text-[10px]" : "text-xs"
      )}
      title={title ?? `${user.name} (${user.email})`}
    >
      {user.initials}
    </div>
  );
}
