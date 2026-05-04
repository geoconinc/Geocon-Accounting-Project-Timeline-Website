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

export async function notifyUser(opts: NotifyOpts) {
  const target = await storage.getUserById(opts.userId);
  if (!target) return;

  const pref = opts.projectId
    ? await storage.getNotificationPref(opts.userId, opts.projectId)
    : null;
  if (pref?.mute) return;

  bus.publish({
    type: "notification.new",
    payload: { userId: opts.userId, message: opts.message, projectId: opts.projectId }
  });

  await sendMail({
    to: [target.email],
    subject: opts.subject,
    html: opts.html ?? `<p>${opts.message}</p>`
  }).catch(() => undefined);
}
