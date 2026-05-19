"use client";

import { useMemo } from "react";
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication, EventType, AuthenticationResult } from "@azure/msal-browser";
import { msalConfig } from "@/lib/auth/msalConfig";

let pca: PublicClientApplication | null = null;

function getPca() {
  if (typeof window === "undefined") return null;
  if (!msalConfig.auth.clientId) return null;
  if (!pca) {
    pca = new PublicClientApplication(msalConfig);
    pca.initialize().then(() => {
      const accounts = pca!.getAllAccounts();
      if (accounts.length > 0) pca!.setActiveAccount(accounts[0]);
      pca!.addEventCallback((event) => {
        if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
          const result = event.payload as AuthenticationResult;
          if (result.account) pca!.setActiveAccount(result.account);
        }
      });
    });
  }
  return pca;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const instance = useMemo(() => getPca(), []);
  if (!instance) return <>{children}</>;
  return <MsalProvider instance={instance}>{children}</MsalProvider>;
}
