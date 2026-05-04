"use client";

import { useRouter } from "next/navigation";
import type { User } from "@/lib/types";
import { Bell, LogOut, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { DEMO_MODE } from "@/lib/demo/config";
import { resetDb } from "@/lib/demo/localStore";
import { clearDemoSession } from "@/lib/demo/auth";

export default function TopBar({ user }: { user: User }) {
  const router = useRouter();
  const [notifCount, setNotifCount] = useState(0);
  const [lastMsg, setLastMsg] = useState<string | null>(null);

  useEffect(() => {
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<{ message: string }>).detail;
      if (!detail) return;
      setNotifCount((c) => c + 1);
      setLastMsg(detail.message);
      setTimeout(() => setLastMsg(null), 4000);
    };
    window.addEventListener("geocon-toast", onToast);
    if (DEMO_MODE) return () => window.removeEventListener("geocon-toast", onToast);

    const es = new EventSource("/api/events");
    es.addEventListener("notification.new", (ev: MessageEvent) => {
      try {
        const data = JSON.parse(ev.data) as { userId: string; message: string };
        if (data.userId === user.id) {
          setNotifCount((c) => c + 1);
          setLastMsg(data.message);
          setTimeout(() => setLastMsg(null), 5000);
        }
      } catch {
        /* ignore */
      }
    });
    return () => {
      es.close();
      window.removeEventListener("geocon-toast", onToast);
    };
  }, [user.id]);

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

  function handleReset() {
    if (!confirm("Reset all demo data back to the seeded example?")) return;
    resetDb();
    window.dispatchEvent(new CustomEvent("geocon-demo-change"));
  }

  return (
    <div className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-4 shrink-0">
      {DEMO_MODE && (
        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
          Demo mode
        </span>
      )}
      <div className="flex-1" />
      {DEMO_MODE && (
        <button
          onClick={handleReset}
          className="btn-ghost text-xs"
          title="Reset all demo data"
        >
          <RotateCcw size={14} /> Reset data
        </button>
      )}
      <button
        className="relative p-2 rounded hover:bg-slate-100 text-slate-600"
        onClick={() => setNotifCount(0)}
        title="Notifications"
      >
        <Bell size={18} />
        {notifCount > 0 && (
          <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 grid place-items-center">
            {notifCount}
          </span>
        )}
      </button>
      <div
        className="w-8 h-8 rounded-full bg-brand text-white grid place-items-center text-xs font-semibold"
        title={`${user.name} (${user.email})`}
      >
        {user.initials}
      </div>
      <button onClick={logout} className="btn-ghost" title="Sign out">
        <LogOut size={16} />
      </button>
      {lastMsg && (
        <div className="fixed top-16 right-4 bg-brand-dark text-white px-4 py-2 rounded shadow-lg text-sm max-w-sm z-50">
          {lastMsg}
        </div>
      )}
    </div>
  );
}
