import type { Project } from "@/lib/types";

/** True when this row was created/updated by the GMS project push integration. */
export function isGmsImportedProject(project: Project): boolean {
  if (project.gmsProposalId) return true;
  const notes = project.notes?.trim() ?? "";
  return notes.startsWith("Imported from GMS");
}

/**
 * Timeline is a prevailing-wage / union payroll board.
 * Non-PW, non-union rows stay hidden from Current / Future / Completed.
 */
export function isVisibleOnTimelineBoard(project: Project): boolean {
  return project.prevailingWage === true || project.union === true;
}
