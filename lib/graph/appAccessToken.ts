// Shared client-credentials token for Microsoft Graph (Mail, SharePoint files, etc.).

interface Cached {
  token: string;
  expiresAt: number;
}

let cached: Cached | null = null;

export async function getGraphAppAccessToken(): Promise<string | null> {
  const tenant = process.env.GRAPH_APP_TENANT_ID;
  const clientId = process.env.GRAPH_APP_CLIENT_ID;
  const clientSecret = process.env.GRAPH_APP_CLIENT_SECRET;
  if (!tenant || !clientId || !clientSecret) return null;

  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default"
  });

  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cached = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000
  };
  return cached.token;
}
