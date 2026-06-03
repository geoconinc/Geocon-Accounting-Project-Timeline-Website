import { storage } from "@/lib/storage";
import { bus } from "@/lib/events/bus";
import { appBaseUrl, escapeHtml } from "./html";
import { wrapEmailLayout } from "./layout";
import { sendMail } from "./email";

export { escapeHtml } from "./html";

interface NotifyOpts {
  userId: string;
  projectId?: string;
  subject: string;
  message: string;
  html?: string;
}

function defaultHtml(message: string): string {
  return wrapEmailLayout({
    headline: "Notification",
    bodyHtml: `<p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
    ctaLabel: "Open Project Timeline",
    ctaUrl: appBaseUrl()
  });
}

export async function notifyUser(opts: NotifyOpts) {
  const target = await storage.getUserById(opts.userId);
  if (!target) return;

  bus.publish({
    type: "notification.new",
    payload: { userId: opts.userId, message: opts.message, projectId: opts.projectId }
  });

  await sendMail({
    to: [target.email],
    subject: opts.subject,
    html: opts.html ?? defaultHtml(opts.message)
  }).then((result) => {
    if (!result.ok) {
      console.warn(`Email not sent (${process.env.EMAIL_DRIVER ?? "auto"}): ${result.reason ?? "unknown_error"}`);
    }
  }).catch((error) => {
    console.warn("Email send failed", error);
  });
}
