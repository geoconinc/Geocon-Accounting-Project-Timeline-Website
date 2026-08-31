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
  let das140Updated = 0;
  let das142Updated = 0;
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
      prevailingWageType: row.prevailingWageType,
      union: row.union,
      pwCategory: row.pwCategory,
      dirNumber: row.dirNumber,
      dirContractNumber: row.dirContractNumber,
      dasRequired: row.dasRequired,
      dasStatus: row.dasStatus,
      dasCompletedAt: row.dasCompletedAt,
      das140Status: row.das140Status,
      das140FiledAt: row.das140FiledAt,
      das142Status: row.das142Status,
      das142FiledAt: row.das142FiledAt,
      payrollCycle: row.payrollCycle
    });

    if (result.projectUpdated) updated++;
    if (result.setupSheetCompleted) setupSheetsCompleted++;
    if (result.das140Updated) das140Updated++;
    if (result.das142Updated) das142Updated++;

    if (
      result.projectUpdated ||
      result.setupSheetCompleted ||
      result.das140Updated ||
      result.das142Updated
    ) {
      await recordActivity({
        actorId: null,
        entityType: "project",
        entityId: project.id,
        action: "update",
        payload: {
          source: "gms_das_status_pull",
          projectNumber: row.projectNumber,
          dasStatus: row.dasStatus,
          das140Status: row.das140Status,
          das142Status: row.das142Status,
          setupSheetCompleted: result.setupSheetCompleted,
          das140Updated: result.das140Updated,
          das142Updated: result.das142Updated
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
    das140Updated,
    das142Updated,
    missing
  });
}
