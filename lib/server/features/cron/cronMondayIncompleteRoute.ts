import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { notifyUser } from "@/lib/notifications/dispatch";
import {
  buildMondayIncompleteDigestEmail,
  type MondayIncompleteItem
} from "@/lib/notifications/mondayIncompleteTemplates";
import { getEffectiveNotificationConfig, isCategoryEnabled } from "@/lib/notifications/emailConfig";
import { isVisibleOnTimelineBoard } from "@/lib/domain/timelineBoardVisibility";
import { isAccountingEmailRecipient } from "@/lib/notifications/accountingOnly";

const SKIP_STATUSES = new Set(["Completed", "NA"]);

/**
 * Schedule for Mondays (e.g. Azure Logic App / cron).
 * Header: X-Cron-Secret: $CRON_SHARED_SECRET
 *
 * Emails each assignee who still has incomplete checklist items on the
 * timeline board, with a list of those items.
 */
export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SHARED_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const config = await getEffectiveNotificationConfig();
  if (!isCategoryEnabled(config, "mondayIncomplete")) {
    return NextResponse.json({ ok: true, skipped: "notifications_disabled", owners: 0, subitems: 0 });
  }

  const [projects, allSubitems] = await Promise.all([
    storage.listProjects(),
    storage.listAllSubitems()
  ]);

  const boardProjects = projects.filter(isVisibleOnTimelineBoard);
  const projectById = new Map(boardProjects.map((p) => [p.id, p]));
  const ownerItems = new Map<string, MondayIncompleteItem[]>();

  for (const sub of allSubitems) {
    if (SKIP_STATUSES.has(sub.status)) continue;
    if (!sub.ownerId) continue;

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

    // Stable order: project code, then item name.
    items.sort((a, b) => {
      const byCode = a.projectCode.localeCompare(b.projectCode);
      if (byCode !== 0) return byCode;
      return a.subitemName.localeCompare(b.subitemName);
    });

    const { subject, message, html } = await buildMondayIncompleteDigestEmail(user.name, items);

    await notifyUser({
      userId: ownerId,
      category: "mondayIncomplete",
      subject,
      message,
      html
    });

    ownersSent++;
    subitemCount += items.length;
  }

  return NextResponse.json({
    ok: true,
    owners: ownersSent,
    subitems: subitemCount
  });
}
