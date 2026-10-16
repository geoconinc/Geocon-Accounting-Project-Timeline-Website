import { isOffice, type Office } from "./offices";

/**
 * Geocon legal entities. Each office belongs to exactly one company
 * (source: `companies` / `offices` in data/gms-code-list-for-sid.json).
 */
export const COMPANIES = ["CONSULTANTS", "INC", "WEST"] as const;
export type Company = (typeof COMPANIES)[number];

export const COMPANY_LABELS: Record<Company, string> = {
  CONSULTANTS: "Geocon Consultants",
  INC: "Geocon Incorporated",
  WEST: "Geocon West"
};

const OFFICE_COMPANY: Record<Office, Company> = {
  "San Diego": "INC",
  Sacramento: "CONSULTANTS",
  Livermore: "CONSULTANTS",
  Suisun: "CONSULTANTS",
  Stockton: "CONSULTANTS",
  Rocklin: "CONSULTANTS",
  Murrieta: "WEST",
  Burbank: "WEST",
  Redlands: "WEST",
  "Orange County": "WEST"
};

/** Null when the project has no office yet (or a legacy office name this build doesn't know). */
export function companyForOffice(office: string | null | undefined): Company | null {
  return office && isOffice(office) ? OFFICE_COMPANY[office] : null;
}
