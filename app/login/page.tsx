"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/auth/msalConfig";
import { ALLOWED_DOMAIN } from "@/lib/config/allowedDomain";

export default function LoginPage() {
  const { instance } = useMsal();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function signIn() {
    setBusy(true);
    setErr(null);
    try {
      const result = await instance.loginPopup(loginRequest);
      if (!result.account) throw new Error("No account returned from Microsoft");
      const tokenRes = await instance.acquireTokenSilent({
        ...loginRequest,
        account: result.account
      });
      const res = await fetch("/api/microsoft-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accessToken: tokenRes.accessToken })
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.message || data.error || "Login failed");
        return;
      }
      router.push("/");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-brand-dark via-brand to-brand-light p-6">
      <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <Image src="/logo.png" alt="Geocon" width={120} height={120} className="mb-4" />
          <h1 className="text-2xl font-bold text-brand-dark">Project Management</h1>
          <p className="text-slate-500 mt-2 text-sm">
            Sign in with your Geocon Microsoft account.
          </p>
          <button
            onClick={signIn}
            disabled={busy}
            className="mt-6 w-full inline-flex items-center justify-center gap-2.5 bg-[#2F2F2F] hover:bg-black text-white text-sm font-semibold px-4 py-2.5 rounded shadow-sm disabled:opacity-60"
          >
            <MicrosoftLogo />
            {busy ? "Signing in..." : "Sign in with Microsoft"}
          </button>
          {err && (
            <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3 w-full">
              {err}
            </div>
          )}
          <p className="mt-6 text-xs text-slate-400">Access restricted to @{ALLOWED_DOMAIN}</p>
        </div>
      </div>
    </div>
  );
}

function MicrosoftLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="12" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="12" width="9" height="9" fill="#00A4EF" />
      <rect x="12" y="12" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}
