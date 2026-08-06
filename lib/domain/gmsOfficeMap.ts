import { isOffice, type Office } from "./offices";

/**
 * GMS office short codes → timeline office names.
 * Source of truth for codes: data/gms-code-list-for-sid.json (from GMS production).
 * Timeline display names keep the accounting board labels where they already exist
 * (e.g. OC → "Orange County", RV → "Murrieta", SB → "Redlands").
 */
export const GMS_OFFICE_CODE_MAP: Record<string, Office> = {
  SD: "San Diego",
  SA: "Sacramento",
  EB: "Livermore",
  NB: "Suisun",
  SJ: "Stockton",
  RK: "Rocklin",
  RV: "Murrieta",
  LA: "Burbank",
  OC: "Orange County",
  SB: "Redlands"
};

/**
 * Resolve a GMS office code (and optional display name) to a timeline office.
 * Unknown codes return null unless `officeName` is already a valid timeline office.
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
