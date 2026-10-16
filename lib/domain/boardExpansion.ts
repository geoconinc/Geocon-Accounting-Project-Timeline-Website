/**
 * Which project rows show their subitems. `mode` sets the board-wide default (from the
 * Collapse all / Expand all button); `overrides` records rows toggled individually since.
 */
export type ExpansionMode = "default" | "allCollapsed" | "allExpanded";

export interface BoardExpansion {
  mode: ExpansionMode;
  overrides: Record<string, boolean>;
}

export const DEFAULT_EXPANSION: BoardExpansion = { mode: "default", overrides: {} };

export const EXPANSION_MODE_STORAGE_KEY = "board.expansionMode";

export function isProjectExpanded(
  expansion: BoardExpansion,
  project: { id: string; group: string }
): boolean {
  const override = expansion.overrides[project.id];
  if (override !== undefined) return override;
  switch (expansion.mode) {
    case "allCollapsed":
      return false;
    case "allExpanded":
      return true;
    case "default":
      return project.group !== "Completed";
    default: {
      const unhandled: never = expansion.mode;
      throw new Error(`Unhandled expansion mode: ${unhandled}`);
    }
  }
}

export function toggleProject(
  expansion: BoardExpansion,
  project: { id: string; group: string }
): BoardExpansion {
  return {
    ...expansion,
    overrides: { ...expansion.overrides, [project.id]: !isProjectExpanded(expansion, project) }
  };
}

export function setAllExpanded(expanded: boolean): BoardExpansion {
  return { mode: expanded ? "allExpanded" : "allCollapsed", overrides: {} };
}

/** Tolerates missing or stale values left in localStorage by other builds. */
export function parseStoredExpansionMode(raw: string | null): ExpansionMode {
  return raw === "allCollapsed" || raw === "allExpanded" ? raw : "default";
}
