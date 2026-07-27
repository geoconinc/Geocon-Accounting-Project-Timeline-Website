import nodemailer from "nodemailer";
import type { ResolvedEmailConfig } from "./emailConfig";

export async function sendMailSmtp(
  opts: { to: string[]; subject: string; html: string },
  config: ResolvedEmailConfig
): Promise<{ ok: boolean; reason?: string }> {
  const { smtpHost: host, smtpUser: user, smtpPassword: pass, fromAddress: from, fromName } = config;

  if (!host) return { ok: false, reason: "no_smtp_host" };
  if (!from) return { ok: false, reason: "no_from_address" };
  if (!user || !pass) return { ok: false, reason: "no_smtp_credentials" };

  const transport = nodemailer.createTransport({
    host,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: { user, pass }
  });

  try {
    await transport.sendMail({
      from: `"${fromName}" <${from}>`,
      to: opts.to.join(", "),
      subject: opts.subject,
      html: opts.html
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "smtp_send_failed";
    return { ok: false, reason: msg.slice(0, 200) };
  }
}
