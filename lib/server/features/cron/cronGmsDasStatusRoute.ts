import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { applyGmsDasFieldsToProject } from "@/lib/server/features/integrations/applyGmsDasFields";
import { fetchGmsDasStatus } from "@/lib/server/integrations/gmsDasStatusClient";
import { recordActivity } from "@/lib/server/activityLog";

/**
 * Daily (or on-demand) pull of prevailing-wage DAS status from GMS.
 * Header: X-Cron-Secret: $CRON_SHARED_SECRET
 *
 * Optional query: ?status=not_completed&since=YYYY-MM-DD&projectNumber=...
 */
export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SHARED_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  const since = url.searchParams.get("since") ?? undefined;
  const projectNumber = url.searchParams.get("projectNumber") ?? undefined;

  let remote;
  try {
    remote = await fetchGmsDasStatus({ status, since, projectNumber });
  } catch (e) {
    const message = e instanceof Error ? e.message : "fetch_failed";
    console.warn("GMS DAS status pull failed:", message);
    return NextResponse.json({ error: "gms_fetch_failed", message }, { status: 502 });
  }

  let matched = 0;
  let updated = 0;
  let setupSheetsCompleted = 0;
  let missing = 0;

  for (const row of remote.projects) {
    const project = await storage.getProjectByCode(row.projectNumber);
    if (!project) {
      missing++;
      continue;
    }
    matched++;

    const result = await applyGmsDasFieldsToProject(project.id, {
      prevailingWage: row.prevailingWage,
      pwCategory: row.pwCategory,
      dasRequired: row.dasRequired,
      dasStatus: row.dasStatus,
      dasCompletedAt: row.dasCompletedAt
    });

    if (result.projectUpdated) updated++;
    if (result.setupSheetCompleted) setupSheetsCompleted++;

    if (result.projectUpdated || result.setupSheetCompleted) {
      await recordActivity({
        actorId: null,
        entityType: "project",
        entityId: project.id,
        action: "update",
        payload: {
          source: "gms_das_status_pull",
          projectNumber: row.projectNumber,
          dasStatus: row.dasStatus,
          setupSheetCompleted: result.setupSheetCompleted
        }
      });
    }
  }

  return NextResponse.json({
    ok: true,
    generatedAt: remote.generatedAt ?? null,
    remoteCount: remote.projects.length,
    matched,
    updated,
    setupSheetsCompleted,
    missing
  });
}
