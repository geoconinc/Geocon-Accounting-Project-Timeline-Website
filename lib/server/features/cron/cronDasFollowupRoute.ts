import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { notifyUser } from "@/lib/notifications/dispatch";
import { buildDasFollowupDigestEmail, type DasFollowupItem } from "@/lib/notifications/dasFollowupTemplates";
import { getEffectiveNotificationConfig, isCategoryEnabled } from "@/lib/notifications/emailConfig";
import { isAccountingEmailRecipient } from "@/lib/notifications/accountingOnly";

const DAS_NAMES = new Set([
  // "DAS Setup Sheet" is owned by GMS status sync — do not email PMs about it from Timeline.
  "DAS 140 & Confirmation",
  "DAS 142 & Confirmation"
]);

const SKIP_STATUSES = new Set(["Completed", "NA"]);

/**
 * Hit weekly by an external scheduler (Azure Timer / cron) with header
 * X-Cron-Secret: $CRON_SHARED_SECRET.
 *
 * Sends a single digest email per owner listing incomplete DAS 140 / DAS 142
 * checklist items (accounting). DAS Setup Sheet status comes from GMS, not email.
 */
export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SHARED_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Master switch / per-event toggle managed from the admin panel. When off, do no work.
  const config = await getEffectiveNotificationConfig();
  if (!isCategoryEnabled(config, "dasFollowup")) {
    return NextResponse.json({ ok: true, skipped: "notifications_disabled", owners: 0, subitems: 0 });
  }

  const [projects, allSubitems] = await Promise.all([
    storage.listProjects(),
    storage.listAllSubitems()
  ]);

  const projectById = new Map(projects.map((p) => [p.id, p]));

  const ownerItems = new Map<string, DasFollowupItem[]>();

  for (const sub of allSubitems) {
    if (!DAS_NAMES.has(sub.name)) continue;
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

    const { subject, message, html } = await buildDasFollowupDigestEmail(
      user.name,
      items
    );

    await notifyUser({
      userId: ownerId,
      category: "dasFollowup",
      subject,
      message,
      html
    });

    ownersSent++;
    subitemCount += items.length;
  }

  return NextResponse.json({ ok: true, owners: ownersSent, subitems: subitemCount });
}
