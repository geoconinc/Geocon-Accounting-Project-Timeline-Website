import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { notifyUser } from "@/lib/notifications/dispatch";
import { buildDueTodayEmail } from "@/lib/notifications/templates/operational";
import { getEffectiveNotificationConfig, isCategoryEnabled } from "@/lib/notifications/emailConfig";
import { isAccountingEmailRecipient } from "@/lib/notifications/accountingOnly";

// Hit daily by an Azure timer / WebJob with header X-Cron-Secret: $CRON_SHARED_SECRET.
// Sends a notification to the assignee for any subitem whose due date is today
// and which isn't already Completed or N/A.

export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SHARED_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Master switch / per-event toggle managed from the admin panel. When off, skip the
  // whole scan so the cron job does no work instead of silently dropping each email.
  const config = await getEffectiveNotificationConfig();
  if (!isCategoryEnabled(config, "dueDateReminder")) {
    return NextResponse.json({ ok: true, skipped: "notifications_disabled", sent: 0 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const projects = await storage.listProjects();
  let sent = 0;

  for (const p of projects) {
    const subs = await storage.listSubitems(p.id);
    for (const s of subs) {
      if (!s.dueDate || s.dueDate !== today) continue;
      if (s.status === "Completed" || s.status === "NA") continue;
      if (!s.ownerId) continue;
      if (!isAccountingEmailRecipient(s.ownerId, p)) continue;
      const assignee = await storage.getUserById(s.ownerId);
      if (!assignee) continue;
      const mail = await buildDueTodayEmail({
        recipientName: assignee.name,
        subitemName: s.name,
        projectCode: p.code,
        projectName: p.name,
        dueDate: s.dueDate,
        projectId: p.id
      });
      await notifyUser({
        userId: s.ownerId,
        projectId: p.id,
        category: "dueDateReminder",
        ...mail
      });
      sent++;
    }
  }

  return NextResponse.json({ ok: true, sent });
}
