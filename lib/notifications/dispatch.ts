import { storage } from "@/lib/storage";
import { bus } from "@/lib/events/bus";
import { sendMail } from "./email";

interface NotifyOpts {
  userId: string;
  projectId?: string;
  subject: string;
  message: string;
  html?: string;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function appUrl(): string | null {
  return process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_MSAL_REDIRECT_URI ?? null;
}

function defaultHtml(message: string): string {
  const url = appUrl();
  const link = url
    ? `<p><a href="${escapeHtml(url)}">Open Geocon Project Timeline</a></p>`
    : "";

  return `<p>${escapeHtml(message)}</p>${link}`;
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
      console.warn(`Graph email not sent: ${result.reason ?? "unknown_error"}`);
    }
  }).catch((error) => {
    console.warn("Graph email failed", error);
  });
}
