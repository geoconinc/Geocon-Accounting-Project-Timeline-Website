// Microsoft Graph sendMail using app-only (client credentials) flow.
// Requires Mail.Send application permission granted to the app registration on
// the NOTIFY_FROM_ADDRESS mailbox (Application Access Policy can scope this).

import { getGraphAppAccessToken } from "@/lib/graph/appAccessToken";

export async function sendMail(opts: {
  to: string[];
  subject: string;
  html: string;
}): Promise<{ ok: boolean; reason?: string }> {
  const from = process.env.NOTIFY_FROM_ADDRESS;
  if (!from) return { ok: false, reason: "no_from_address" };
  const token = await getGraphAppAccessToken();
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
