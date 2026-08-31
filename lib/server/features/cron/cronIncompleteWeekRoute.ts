import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { notifyUser } from "@/lib/notifications/dispatch";
import {
  buildIncompleteWeekDigestEmail,
  type IncompleteWeekItem
} from "@/lib/notifications/incompleteWeekTemplates";
import { getEffectiveNotificationConfig, isCategoryEnabled } from "@/lib/notifications/emailConfig";
import { isoDateDaysAgo } from "@/lib/utils";
import { isAccountingEmailRecipient } from "@/lib/notifications/accountingOnly";

const SKIP_STATUSES = new Set(["Completed", "NA"]);
const REMINDER_AFTER_DAYS = 7;

/**
 * Hit daily by an external scheduler (Render Cron Job, etc.) with header
 * X-Cron-Secret: $CRON_SHARED_SECRET.
 *
 * On the 7th calendar day after a subitem was created, if it is still
 * incomplete, email the assignee (one digest per owner).
 */
export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SHARED_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Master switch / per-event toggle managed from the admin panel. When off, do no work.
  const config = await getEffectiveNotificationConfig();
  if (!isCategoryEnabled(config, "incompleteWeek")) {
    return NextResponse.json({ ok: true, skipped: "notifications_disabled", owners: 0, subitems: 0 });
  }

  const createdOn = isoDateDaysAgo(REMINDER_AFTER_DAYS);

  const [projects, allSubitems] = await Promise.all([
    storage.listProjects(),
    storage.listAllSubitems()
  ]);

  const projectById = new Map(projects.map((p) => [p.id, p]));
  const ownerItems = new Map<string, IncompleteWeekItem[]>();

  for (const sub of allSubitems) {
    if (SKIP_STATUSES.has(sub.status)) continue;
    if (!sub.ownerId) continue;
    if (sub.createdAt.slice(0, 10) !== createdOn) continue;

    const project = projectById.get(sub.projectId);
    if (!project) continue;
    if (!isAccountingEmailRecipient(sub.ownerId, project)) continue;

    const list = ownerItems.get(sub.ownerId) ?? [];
    list.push({
      projectCode: project.code,
      projectName: project.name,
      subitemName: sub.name,
      status: sub.status
    });
    ownerItems.set(sub.ownerId, list);
  }

  let ownersSent = 0;
  let subitemCount = 0;

  for (const [ownerId, items] of ownerItems) {
    const user = await storage.getUserById(ownerId);
    if (!user) continue;

    const { subject, message, html } = await buildIncompleteWeekDigestEmail(user.name, items);

    await notifyUser({
      userId: ownerId,
      category: "incompleteWeek",
      subject,
      message,
      html
    });

    ownersSent++;
    subitemCount += items.length;
  }

  return NextResponse.json({
    ok: true,
    createdOn,
    owners: ownersSent,
    subitems: subitemCount
  });
}
