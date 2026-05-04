import type { Configuration, RedirectRequest } from "@azure/msal-browser";

const tenantId = process.env.NEXT_PUBLIC_MSAL_TENANT_ID || "common";
const clientId = process.env.NEXT_PUBLIC_MSAL_CLIENT_ID || "";
const redirectUri =
  process.env.NEXT_PUBLIC_MSAL_REDIRECT_URI ||
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false
  }
};

export const loginRequest: RedirectRequest = {
  scopes: ["User.Read"]
};
