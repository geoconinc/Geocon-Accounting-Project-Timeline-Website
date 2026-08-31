import { storage } from "@/lib/storage";
import { bus } from "@/lib/events/bus";
import {
  DAS_140_NAME,
  DAS_142_NAME,
  DAS_SETUP_SHEET_NAME,
  gmsDasProjectPatch,
  isDasCompleted,
  mapGmsDasFormToSubitemPatch,
  type GmsDasFields
} from "@/lib/domain/gmsDas";
import { syncProjectStatusFromSubitems } from "@/lib/domain/projectStatusSync";

export interface ApplyGmsDasResult {
  projectUpdated: boolean;
  setupSheetCompleted: boolean;
  das140Updated: boolean;
  das142Updated: boolean;
}

/**
 * Applies GMS prevailing-wage / DAS fields onto a project and syncs checklist items:
 * - DAS Setup Sheet when aggregate dasStatus is completed
 * - DAS 140 / DAS 142 when GMS sends per-form status (+ filedAt)
 */
export async function applyGmsDasFieldsToProject(
  projectId: string,
  fields: GmsDasFields
): Promise<ApplyGmsDasResult> {
  const patch = gmsDasProjectPatch(fields);
  let projectUpdated = false;
  let setupSheetCompleted = false;
  let das140Updated = false;
  let das142Updated = false;

  if (Object.keys(patch).length > 0) {
    const updated = await storage.updateProject(projectId, patch, null);
    projectUpdated = Boolean(updated);
    if (updated) {
      bus.publish({ type: "project.upsert", payload: { id: projectId } });
    }
  }

  if (isDasCompleted(patch.dasStatus ?? fields.dasStatus)) {
    setupSheetCompleted = await completeDasSetupSheet(projectId);
  }

  if (fields.das140Status !== undefined) {
    das140Updated = await syncNamedDasSubitem(
      projectId,
      DAS_140_NAME,
      fields.das140Status,
      fields.das140FiledAt
    );
  }
  if (fields.das142Status !== undefined) {
    das142Updated = await syncNamedDasSubitem(
      projectId,
      DAS_142_NAME,
      fields.das142Status,
      fields.das142FiledAt
    );
  }

  if (setupSheetCompleted || das140Updated || das142Updated) {
    await syncProjectStatusFromSubitems(projectId, null);
  }

  return { projectUpdated, setupSheetCompleted, das140Updated, das142Updated };
}

async function completeDasSetupSheet(projectId: string): Promise<boolean> {
  const subs = await storage.listSubitems(projectId);
  const setup = subs.find((s) => s.name === DAS_SETUP_SHEET_NAME);
  if (!setup) return false;
  if (setup.status === "Completed" || setup.status === "NA") return false;

  const today = new Date().toISOString().slice(0, 10);
  const updated = await storage.updateSubitem(setup.id, {
    status: "Completed",
    dateCompleted: today
  });
  if (!updated) return false;

  bus.publish({
    type: "subitem.upsert",
    payload: { id: updated.id, projectId }
  });
  return true;
}

async function syncNamedDasSubitem(
  projectId: string,
  name: string,
  status: string | null | undefined,
  filedAt: string | null | undefined
): Promise<boolean> {
  const mapped = mapGmsDasFormToSubitemPatch(status, filedAt);
  if (!mapped) return false;

  const subs = await storage.listSubitems(projectId);
  const target = subs.find((s) => s.name === name);
  if (!target) return false;

  if (target.status === mapped.status && target.dateCompleted === mapped.dateCompleted) {
    return false;
  }

  const updated = await storage.updateSubitem(target.id, {
    status: mapped.status,
    dateCompleted: mapped.dateCompleted
  });
  if (!updated) return false;

  bus.publish({
    type: "subitem.upsert",
    payload: { id: updated.id, projectId }
  });
  return true;
}
