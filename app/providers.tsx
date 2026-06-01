"use client";

import { useEffect, useMemo, useState } from "react";
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication, EventType, AuthenticationResult } from "@azure/msal-browser";
import { msalConfig } from "@/lib/auth/msalConfig";

let pcaSingleton: PublicClientApplication | null = null;
let pcaReady: Promise<void> | null = null;

function getOrCreatePca() {
  if (typeof window === "undefined") return null;
  if (!msalConfig.auth.clientId) return null;
  if (!pcaSingleton) {
    pcaSingleton = new PublicClientApplication(msalConfig);
    pcaReady = pcaSingleton.initialize().then(() => {
      const accounts = pcaSingleton!.getAllAccounts();
      if (accounts.length > 0) pcaSingleton!.setActiveAccount(accounts[0]);
      pcaSingleton!.addEventCallback((event) => {
        if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
          const result = event.payload as AuthenticationResult;
          if (result.account) pcaSingleton!.setActiveAccount(result.account);
        }
      });
    });
  }
  return pcaSingleton;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const instance = useMemo(() => getOrCreatePca(), []);
  const [ready, setReady] = useState(!pcaReady);

  useEffect(() => {
    if (pcaReady) pcaReady.then(() => setReady(true));
  }, []);

  if (!instance) return <>{children}</>;
  if (!ready) return <>{children}</>;
  return <MsalProvider instance={instance}>{children}</MsalProvider>;
}
