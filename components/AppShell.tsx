"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/nav/Sidebar";
import TopBar from "@/components/TopBar";
import { getDemoSession } from "@/lib/demo/auth";
import { demoStore } from "@/lib/demo/localStore";
import type { User } from "@/lib/types";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const session = getDemoSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    const upserted = demoStore.upsertUser({
      email: session.email,
      name: session.name,
      initials: session.initials
    });
    setUser(upserted);
  }, [router]);

  if (!user) {
    return (
      <div className="h-screen grid place-items-center bg-slate-100 text-slate-500 text-sm">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar user={user} />
        <main className="flex-1 overflow-hidden bg-slate-100">{children}</main>
      </div>
    </div>
  );
}
