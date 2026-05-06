"use client";

import { useRouter } from "next/navigation";
import type { User } from "@/lib/types";
import { LogOut } from "lucide-react";
import { DEMO_MODE } from "@/lib/demo/config";
import { clearDemoSession } from "@/lib/demo/auth";

export default function TopBar({ user }: { user: User }) {
  const router = useRouter();

  async function logout() {
    if (DEMO_MODE) {
      clearDemoSession();
      router.push("/login");
      router.refresh();
      return;
    }
    await fetch("/api/logout", { method: "POST" });
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
        onClick={logout}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm"
        title="Sign out"
      >
        <LogOut size={14} /> Log out
      </button>
    </div>
  );
}
