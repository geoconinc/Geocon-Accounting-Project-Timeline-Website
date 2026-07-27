// Shared client-credentials token for Microsoft Graph (Mail, SharePoint files, etc.).
// Credentials come from the caller (admin-configured, resolved) when provided, otherwise
// from the environment. Tokens are cached per credential identity so rotating the client
// id/secret/tenant does not serve a stale token.

interface GraphAppCredentials {
  tenantId: string | null;
  clientId: string | null;
  clientSecret: string | null;
}

interface Cached {
  token: string;
  expiresAt: number;
}

const cacheByKey = new Map<string, Cached>();

function credentialsFromEnv(): GraphAppCredentials {
  return {
    tenantId: process.env.GRAPH_APP_TENANT_ID ?? null,
    clientId: process.env.GRAPH_APP_CLIENT_ID ?? null,
    clientSecret: process.env.GRAPH_APP_CLIENT_SECRET ?? null
  };
}

export async function getGraphAppAccessToken(
  creds: GraphAppCredentials = credentialsFromEnv()
): Promise<string | null> {
  const { tenantId: tenant, clientId, clientSecret } = creds;
  if (!tenant || !clientId || !clientSecret) return null;

  const cacheKey = `${tenant}:${clientId}`;
  const cached = cacheByKey.get(cacheKey);
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
  const next: Cached = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000
  };
  cacheByKey.set(cacheKey, next);
  return next.token;
}
