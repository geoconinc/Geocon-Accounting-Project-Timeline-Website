"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/auth/msalConfig";
import { ALLOWED_DOMAIN, DEMO_ACCOUNTS, DEMO_MODE } from "@/lib/demo/config";
import { setDemoSession } from "@/lib/demo/auth";
import { demoStore } from "@/lib/demo/localStore";
import { initialsFromName } from "@/lib/utils";

export default function LoginPage() {
  if (DEMO_MODE) return <DemoLogin />;
  return <RealLogin />;
}

// =============================================================
// Demo login: looks and feels like Microsoft, fully client-side
// =============================================================
type Stage = "picker" | "custom" | "signing-in" | "redirecting";

function DemoLogin() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("picker");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [activeAccount, setActiveAccount] = useState<{ name: string; email: string } | null>(null);

  async function signIn(account: { name: string; email: string }) {
    if (!account.email.toLowerCase().endsWith("@" + ALLOWED_DOMAIN)) {
      setErr(`Only @${ALLOWED_DOMAIN} accounts can sign in.`);
      return;
    }
    setErr(null);
    setActiveAccount(account);
    setStage("signing-in");
    await new Promise((r) => setTimeout(r, 900));
    setStage("redirecting");

    setDemoSession(account.name, account.email);
    demoStore.upsertUser({
      name: account.name,
      email: account.email,
      initials: initialsFromName(account.name)
    });
    window.dispatchEvent(new CustomEvent("geocon-demo-change"));
    await new Promise((r) => setTimeout(r, 500));
    router.push("/");
    router.refresh();
  }

  function submitCustom() {
    if (!name.trim()) {
      setErr("Name is required");
      return;
    }
    if (!email.trim()) {
      setErr("Email is required");
      return;
    }
    signIn({ name: name.trim(), email: email.trim() });
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-brand-dark via-brand to-brand-light p-6">
      <div className="flex flex-col items-center w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <Image
            src="/logo.png"
            alt="Geocon"
            width={72}
            height={72}
            className="bg-white rounded-2xl p-2 shadow-lg"
          />
          <span className="text-white font-semibold text-lg mt-3">Geocon</span>
          <span className="text-white/70 text-xs">Project Timeline</span>
        </div>
        <div className="bg-white rounded-md shadow-2xl w-full overflow-hidden">
          <div className="px-8 pt-8 pb-2 flex items-center gap-2">
            <MicrosoftLogo />
            <span className="text-[15px] font-semibold text-slate-700">Microsoft</span>
          </div>

        {stage === "picker" && (
          <div className="px-8 pb-8">
            <h1 className="text-[24px] font-semibold text-slate-900 mt-4">Pick an account</h1>
            <div className="mt-6 flex flex-col">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  onClick={() => signIn(a)}
                  className="flex items-center gap-3 py-2.5 border-b border-slate-200 hover:bg-slate-50 -mx-8 px-8 text-left"
                >
                  <span className="w-8 h-8 rounded-full bg-brand text-white grid place-items-center text-xs font-semibold">
                    {initialsFromName(a.name)}
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm text-slate-900">{a.name}</span>
                    <span className="text-xs text-slate-500">{a.email}</span>
                  </span>
                </button>
              ))}
              <button
                onClick={() => {
                  setStage("custom");
                  setErr(null);
                }}
                className="flex items-center gap-3 py-2.5 hover:bg-slate-50 -mx-8 px-8 text-left"
              >
                <span className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 grid place-items-center text-lg">
                  +
                </span>
                <span className="text-sm text-slate-700">Use another account</span>
              </button>
            </div>
            {err && <p className="text-xs text-red-600 mt-4">{err}</p>}
            <p className="mt-6 text-[11px] text-slate-400 text-center">
              Demo mode · no real Microsoft account is contacted
            </p>
          </div>
        )}

        {stage === "custom" && (
          <div className="px-8 pb-8">
            <h1 className="text-[24px] font-semibold text-slate-900 mt-4">Sign in</h1>
            <p className="text-sm text-slate-500 mt-1">
              to continue to <span className="text-brand-dark font-medium">Geocon Project Timeline</span>
            </p>
            <div className="flex flex-col gap-3 mt-5">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Display name"
                className="border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-brand"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={`name@${ALLOWED_DOMAIN}`}
                onKeyDown={(e) => e.key === "Enter" && submitCustom()}
                className="border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </div>
            {err && <p className="text-xs text-red-600 mt-3">{err}</p>}
            <div className="flex justify-end mt-4 gap-2">
              <button onClick={() => setStage("picker")} className="text-sm text-slate-600 px-3 py-1.5 hover:bg-slate-50 rounded">
                Back
              </button>
              <button
                onClick={submitCustom}
                className="bg-brand text-white text-sm px-4 py-1.5 hover:bg-brand-light rounded"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {(stage === "signing-in" || stage === "redirecting") && activeAccount && (
          <div className="px-8 pb-10 pt-2 flex flex-col items-center text-center">
            <span className="w-12 h-12 rounded-full bg-brand text-white grid place-items-center text-base font-semibold mt-4">
              {initialsFromName(activeAccount.name)}
            </span>
            <p className="text-sm text-slate-700 mt-3">{activeAccount.email}</p>
            <div className="mt-6 flex items-center gap-2 text-sm text-slate-500">
              <Spinner />
              {stage === "signing-in" ? "Signing you in..." : "Taking you to Geocon..."}
            </div>
          </div>
        )}
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

function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// =============================================================
// Real MSAL login (used when DEMO_MODE=false)
// =============================================================
function RealLogin() {
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
          <h1 className="text-2xl font-bold text-brand-dark">Project Timeline</h1>
          <p className="text-slate-500 mt-2 text-sm">
            Sign in with your Geocon Microsoft account.
          </p>
          <button
            onClick={signIn}
            disabled={busy}
            className="mt-6 btn-primary w-full justify-center disabled:opacity-60"
          >
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
