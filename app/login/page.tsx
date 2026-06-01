"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/auth/msalConfig";
import { ALLOWED_DOMAIN } from "@/lib/config/allowedDomain";

type Stage = "idle" | "ms-popup" | "verifying" | "redirecting";

export default function LoginPage() {
  const { instance } = useMsal();
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("idle");
  const [err, setErr] = useState<string | null>(null);

  async function signIn() {
    setStage("ms-popup");
    setErr(null);
    try {
      const result = await instance.loginPopup(loginRequest);
      if (!result.account) throw new Error("No account returned from Microsoft");

      setStage("verifying");

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
        setStage("idle");
        return;
      }

      setStage("redirecting");
      router.push("/");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Login failed");
      setStage("idle");
    }
  }

  if (stage === "verifying" || stage === "redirecting") {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-brand-dark via-brand to-brand-light p-6">
        <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-md animate-fade-in-up">
          <div className="flex flex-col items-center text-center gap-4">
            <Image src="/logo.png" alt="Geocon" width={120} height={44} priority />
            <div className="w-8 h-8 border-3 border-brand/30 border-t-brand rounded-full animate-spin" />
            <p className="text-sm font-medium text-brand-dark">
              {stage === "verifying" ? "Verifying your account..." : "Loading your workspace..."}
            </p>
            <p className="text-xs text-slate-400">This will only take a moment</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-brand-dark via-brand to-brand-light p-6">
      <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-md animate-fade-in-up">
        <div className="flex flex-col items-center text-center">
          <Image src="/logo.png" alt="Geocon" width={120} height={44} priority className="mb-4" />
          <h1 className="text-2xl font-bold text-brand-dark">Project Management</h1>
          <p className="text-slate-500 mt-2 text-sm">
            Sign in with your Geocon Microsoft account.
          </p>
          <button
            onClick={signIn}
            disabled={stage !== "idle"}
            className="btn mt-6 w-full inline-flex items-center justify-center gap-2.5 bg-[#2F2F2F] hover:bg-black text-white text-sm font-semibold px-4 py-2.5 rounded shadow-sm hover:shadow-md disabled:opacity-60"
          >
            <MicrosoftLogo />
            {stage === "ms-popup" ? "Waiting for Microsoft..." : "Sign in with Microsoft"}
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
