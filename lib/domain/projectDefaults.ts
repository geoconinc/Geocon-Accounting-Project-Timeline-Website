export const DEFAULT_SUBITEM_NAMES = [
  "DAS Setup Sheet",
  "DAS 140 & Confirmation",
  "DAS 142 & Confirmation",
  "Fringe Benefit Statement",
  "Training Fund",
  "Other Certified Payroll Setup Forms",
  "Certified Payroll Entry",
  "Section 3 Forms",
  "Employee Information Sheet",
  "Payroll Deduction Authorization"
] as const;

export const CPR_SUBITEM_NAME = "Certified Payroll Entry";

/** Checklist items DAS specialists may see board-wide (status for these on every project). */
export const DAS_TRACKING_SUBITEM_NAMES = [
  "DAS 140 & Confirmation",
  "DAS 142 & Confirmation"
] as const;

/** Also owned by some DAS people (e.g. Kelsey) — does not disqualify DAS board mode. */
export const DAS_SETUP_SUBITEM_NAME = "DAS Setup Sheet";

export type DasTrackingSubitemName = (typeof DAS_TRACKING_SUBITEM_NAMES)[number];

export function isDasTrackingSubitemName(name: string): boolean {
  return (DAS_TRACKING_SUBITEM_NAMES as readonly string[]).includes(name);
}

function isDasFamilySubitemName(name: string): boolean {
  return isDasTrackingSubitemName(name) || name === DAS_SETUP_SUBITEM_NAME;
}

/**
 * True when the user only owns DAS-family checklist rows (140/142 and/or Setup Sheet).
 * Those users get a DAS board: all PW projects, only DAS 140/142 rows.
 */
export function isDasOnlyAssignee(
  ownedSubitems: Array<{ name: string }>
): boolean {
  if (ownedSubitems.length === 0) return false;
  const ownsTracking = ownedSubitems.some((s) => isDasTrackingSubitemName(s.name));
  if (!ownsTracking) return false;
  return ownedSubitems.every((s) => isDasFamilySubitemName(s.name));
}
