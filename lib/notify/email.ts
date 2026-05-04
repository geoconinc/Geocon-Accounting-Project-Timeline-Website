// Microsoft Graph sendMail using app-only (client credentials) flow.
// Requires Mail.Send application permission granted to the app registration on
// the NOTIFY_FROM_ADDRESS mailbox (Application Access Policy can scope this).

interface AppToken {
  token: string;
  expiresAt: number;
}

let cached: AppToken | null = null;

async function getAppToken(): Promise<string | null> {
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

export async function sendMail(opts: {
  to: string[];
  subject: string;
  html: string;
}): Promise<{ ok: boolean; reason?: string }> {
  const from = process.env.NOTIFY_FROM_ADDRESS;
  if (!from) return { ok: false, reason: "no_from_address" };
  const token = await getAppToken();
  if (!token) return { ok: false, reason: "no_graph_token" };

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(from)}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        message: {
          subject: opts.subject,
          body: { contentType: "HTML", content: opts.html },
          toRecipients: opts.to.map((address) => ({ emailAddress: { address } }))
        },
        saveToSentItems: false
      })
    }
  );
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, reason: `graph_${res.status}:${text.slice(0, 120)}` };
  }
  return { ok: true };
}
