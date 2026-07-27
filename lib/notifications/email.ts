import { getGraphAppAccessToken } from "@/lib/graph/appAccessToken";
import { getEffectiveEmailConfig, type ResolvedEmailConfig } from "./emailConfig";
import { sendMailSmtp } from "./smtp";

export type MailSendResult = { ok: boolean; reason?: string };

async function sendMailGraph(
  opts: { to: string[]; subject: string; html: string },
  config: ResolvedEmailConfig
): Promise<MailSendResult> {
  const from = config.fromAddress;
  if (!from) return { ok: false, reason: "no_from_address" };
  const token = await getGraphAppAccessToken({
    tenantId: config.graphTenantId,
    clientId: config.graphClientId,
    clientSecret: config.graphClientSecret
  });
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

/**
 * Sends HTML email via SMTP (preferred when configured) or Microsoft Graph. Resolves the
 * effective config from the admin panel/env unless one is supplied by the caller.
 */
export async function sendMail(
  opts: { to: string[]; subject: string; html: string },
  config?: ResolvedEmailConfig
): Promise<MailSendResult> {
  const resolved = config ?? (await getEffectiveEmailConfig());
  if (resolved.driver === "smtp") {
    return sendMailSmtp(opts, resolved);
  }
  return sendMailGraph(opts, resolved);
}
