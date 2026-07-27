import { storage } from "@/lib/storage";
import { bus } from "@/lib/events/bus";
import { appBaseUrl, escapeHtml } from "./html";
import { wrapEmailLayout } from "./layout";
import { sendMail } from "./email";
import { getEffectiveNotificationConfig, isCategoryEnabled } from "./emailConfig";
import type { NotificationCategory } from "./emailConfigTypes";

export { escapeHtml } from "./html";

interface NotifyOpts {
  userId: string;
  projectId?: string;
  subject: string;
  message: string;
  html?: string;
  /** Notification category used for the global kill-switch and per-event toggles. */
  category?: NotificationCategory;
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

  // In-app notification always fires; it is not gated by email settings.
  bus.publish({
    type: "notification.new",
    payload: { userId: opts.userId, message: opts.message, projectId: opts.projectId }
  });

  const config = await getEffectiveNotificationConfig();
  if (!isCategoryEnabled(config, opts.category)) return;

  await sendMail({
    to: [target.email],
    subject: opts.subject,
    html: opts.html ?? defaultHtml(opts.message)
  })
    .then((result) => {
      if (!result.ok) {
        console.warn(`Email not sent (${process.env.EMAIL_DRIVER ?? "auto"}): ${result.reason ?? "unknown_error"}`);
      }
    })
    .catch((error) => {
      console.warn("Email send failed", error);
    });
}
