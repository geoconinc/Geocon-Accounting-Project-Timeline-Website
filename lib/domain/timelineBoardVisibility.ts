import type { Project } from "@/lib/types";

/** True when this row was created/updated by the GMS project push integration. */
export function isGmsImportedProject(project: Project): boolean {
  if (project.gmsProposalId) return true;
  const notes = project.notes?.trim() ?? "";
  return notes.startsWith("Imported from GMS");
}

/**
 * Timeline is a prevailing-wage board only.
 * Non-PW rows (GMS skips, PW flipped off, or legacy rows) stay hidden from Current /
 * Future / Completed — including manual creates that are not marked PW.
 */
export function isVisibleOnTimelineBoard(project: Project): boolean {
  return project.prevailingWage === true;
}
