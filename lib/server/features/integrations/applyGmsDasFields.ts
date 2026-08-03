import { storage } from "@/lib/storage";
import { bus } from "@/lib/events/bus";
import {
  DAS_SETUP_SHEET_NAME,
  gmsDasProjectPatch,
  isDasCompleted,
  type GmsDasFields
} from "@/lib/domain/gmsDas";
import { syncProjectStatusFromSubitems } from "@/lib/domain/projectStatusSync";

/**
 * Applies GMS prevailing-wage / DAS fields onto a project and, when DAS is marked
 * completed in GMS, marks the "DAS Setup Sheet" checklist item Completed so the
 * board stays in sync without re-entry.
 */
export async function applyGmsDasFieldsToProject(
  projectId: string,
  fields: GmsDasFields
): Promise<{ projectUpdated: boolean; setupSheetCompleted: boolean }> {
  const patch = gmsDasProjectPatch(fields);
  let projectUpdated = false;
  let setupSheetCompleted = false;

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

  return { projectUpdated, setupSheetCompleted };
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

  await syncProjectStatusFromSubitems(projectId, null);
  bus.publish({
    type: "subitem.upsert",
    payload: { id: updated.id, projectId }
  });
  return true;
}
