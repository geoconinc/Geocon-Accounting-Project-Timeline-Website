import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { notifyUser } from "@/lib/notifications/dispatch";
import { buildDasFollowupDigestEmail, type DasFollowupItem } from "@/lib/notifications/dasFollowupTemplates";

const DAS_NAMES = new Set([
  "DAS Setup Sheet",
  "DAS 140 & Confirmation",
  "DAS 142 & Confirmation"
]);

const SKIP_STATUSES = new Set(["Completed", "NA"]);

/**
 * Hit weekly by an external scheduler (Azure Timer / cron) with header
 * X-Cron-Secret: $CRON_SHARED_SECRET.
 *
 * Sends a single digest email per owner listing all their incomplete
 * DAS Setup Sheet, DAS 140, and DAS 142 subitems across all projects.
 */
export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SHARED_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const appBaseUrl =
    process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_MSAL_REDIRECT_URI ?? null;

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

    const { subject, message, html } = buildDasFollowupDigestEmail(
      user.name,
      items,
      appBaseUrl
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
