import nodemailer from "nodemailer";

export async function sendMailSmtp(opts: {
  to: string[];
  subject: string;
  html: string;
}): Promise<{ ok: boolean; reason?: string }> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.NOTIFY_FROM_ADDRESS;
  const fromName = process.env.NOTIFY_FROM_NAME ?? "Geocon Project Management";

  if (!host) return { ok: false, reason: "no_smtp_host" };
  if (!from) return { ok: false, reason: "no_from_address" };
  if (!user || !pass) return { ok: false, reason: "no_smtp_credentials" };

  const port = Number(process.env.SMTP_PORT ?? "587");
  const secure = process.env.SMTP_SECURE === "true";

  const transport = nodemailer.createTransport({
    host,
    port,
    secure,
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
