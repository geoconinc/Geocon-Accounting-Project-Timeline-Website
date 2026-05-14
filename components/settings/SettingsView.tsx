"use client";

import Image from "next/image";
import Link from "next/link";
import { Mail, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import type { User } from "@/lib/types";
import { isSuperAdminUser } from "@/lib/auth/superAdmin";

export function SettingsView() {
  const [adminUser, setAdminUser] = useState<User | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/verify-session");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { authenticated?: boolean; user?: User };
        if (data.authenticated && data.user && isSuperAdminUser(data.user)) {
          setAdminUser(data.user);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="p-6 overflow-auto h-full max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-brand-dark">Settings</h1>
      </div>
      {adminUser && (
        <div className="mb-4 rounded-lg border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
          <Link
            href="/settings/admin"
            className="inline-flex items-center gap-2 font-medium text-amber-900 hover:underline"
          >
            <Shield size={16} />
            Site admin — office directory &amp; project roster
          </Link>
        </div>
      )}
      <div className="bg-white rounded-lg border border-slate-200 p-8 flex flex-col items-center text-center">
        <Image src="/logo.png" alt="Geocon" width={56} height={56} className="mb-4" />
        <h2 className="text-base font-semibold text-slate-800">Need help?</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-sm">
          For any questions, requests, or issues with the Geocon Project Timeline,
          please reach out to:
        </p>
        <a
          href="mailto:mundra@geoconinc.com"
          className="mt-5 inline-flex items-center gap-2 text-brand hover:text-brand-dark font-semibold"
        >
          <Mail size={16} />
          mundra@geoconinc.com
        </a>
      </div>
    </div>
  );
}
