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
        className="rounded-full border border-dashed border-slate-300 text-slate-300 grid place-items-center text-[14px] font-light hover:border-brand hover:text-brand transition-colors"
        title={title ?? "Assign owner"}
      >
        +
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
