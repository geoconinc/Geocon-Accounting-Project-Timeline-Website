import { isOffice, type Office } from "./offices";

/** GMS office short codes → timeline office names (accounting matrix). */
export const GMS_OFFICE_CODE_MAP: Record<string, Office> = {
  SD: "San Diego",
  SA: "Sacramento",
  EB: "Livermore",
  RK: "Rocklin",
  RV: "Murrieta",
  LA: "Burbank",
  OC: "Orange County",
  SB: "Redlands"
};

/**
 * Resolve a GMS office code (and optional display name) to a timeline office.
 * Offices not in the accounting matrix (e.g. SJ, NB, CV) return null.
 */
export function mapGmsOfficeToTimeline(
  officeCode: string,
  officeName?: string | null
): Office | null {
  const fromCode = GMS_OFFICE_CODE_MAP[officeCode.trim().toUpperCase()];
  if (fromCode) return fromCode;

  if (officeName && isOffice(officeName.trim())) {
    return officeName.trim() as Office;
  }

  return null;
}
