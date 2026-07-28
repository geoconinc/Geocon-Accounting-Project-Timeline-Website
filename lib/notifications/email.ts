import { getGraphAppAccessToken } from "@/lib/graph/appAccessToken";
import { sendMailSmtp } from "./smtp";

export type MailSendResult = { ok: boolean; reason?: string };

function emailDriver(): "smtp" | "graph" {
  const explicit = process.env.EMAIL_DRIVER?.toLowerCase();
  if (explicit === "smtp" || explicit === "graph") return explicit;
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    return "smtp";
  }
  return "graph";
}

async function sendMailGraph(opts: {
  to: string[];
  subject: string;
  html: string;
}): Promise<MailSendResult> {
  const from = process.env.NOTIFY_FROM_ADDRESS?.trim();
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

/** Sends HTML email via SMTP (preferred when configured) or Microsoft Graph. */
export async function sendMail(opts: {
  to: string[];
  subject: string;
  html: string;
}): Promise<MailSendResult> {
  if (emailDriver() === "smtp") {
    return sendMailSmtp(opts);
  }
  return sendMailGraph(opts);
}
