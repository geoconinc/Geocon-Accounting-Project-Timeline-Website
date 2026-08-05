import type { Project } from "@/lib/types";

/** True when this row was created/updated by the GMS project push integration. */
export function isGmsImportedProject(project: Project): boolean {
  if (project.gmsProposalId) return true;
  const notes = project.notes?.trim() ?? "";
  return notes.startsWith("Imported from GMS");
}

/**
 * Timeline only tracks prevailing-wage GMS jobs. Manual (non-GMS) projects stay visible;
 * GMS imports without PW checked are hidden from Current / Future / Completed.
 */
export function isVisibleOnTimelineBoard(project: Project): boolean {
  if (!isGmsImportedProject(project)) return true;
  return project.prevailingWage === true;
}
