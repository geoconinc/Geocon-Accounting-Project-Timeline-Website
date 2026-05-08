// Office and per-office subitem assignment map.
// When a project is created, the project's office determines who is auto-assigned
// to each default subitem. Names are matched against users.name (case-insensitive)
// at create time; if no matching user exists yet, the subitem is left unassigned
// and can be claimed manually.

export const OFFICES = [
  "San Diego",
  "Sacramento",
  "Livermore",
  "Rocklin",
  "Murrieta",
  "Burbank",
  "Redlands",
  "Orange County"
] as const;

export type Office = (typeof OFFICES)[number];

// Default-assignee NAME for each default subitem, keyed by office.
// Source: assignment matrix provided by Sid (May 2026).
// Helper to keep the per-office tables tidy. Same shape for every office;
// only the "DAS owner" and "Other-forms owner" change.
function makeOffice(dasOwner: string, otherFormsOwner: string): Record<string, string> {
  return {
    "DAS Setup Sheet": dasOwner,
    "DAS 140 & Confirmation": dasOwner,
    "DAS 142 & Confirmation": "Kailua Mizejewski",
    "Fringe Benefit Statement": "Kailua Mizejewski",
    "Training Fund": "Kailua Mizejewski",
    "Other Certified Payroll Setup Forms": otherFormsOwner,
    "Certified Payroll Entry": "Kailua Mizejewski",
    "Section 3 Forms": "Kailua Mizejewski",
    "Employee Information Sheet": "Kailua Mizejewski",
    "Payroll Deduction Authorization": "Kailua Mizejewski"
  };
}

export const OFFICE_ASSIGNEES: Record<Office, Record<string, string>> = {
  "San Diego": makeOffice("Lauren Mason", "Jill Sader"),
  Sacramento: makeOffice("Christina Boeschen", "Jill Sader"),
  Livermore: makeOffice("Joanne Brightman", "Jill Sader"),
  Rocklin: makeOffice("Christina Boeschen", "Jill Sader"),
  Murrieta: makeOffice("Hilda Diaz", "Keiala Beck"),
  Burbank: { ...makeOffice("Kelsey Filban", "Keiala Beck"), "DAS 140 & Confirmation": "Amanda Fair" },
  Redlands: { ...makeOffice("Kelsey Filban", "Keiala Beck"), "DAS 140 & Confirmation": "Amanda Fair" },
  "Orange County": { ...makeOffice("Kelsey Filban", "Keiala Beck"), "DAS 140 & Confirmation": "Amanda Fair" }
};

// Project Manager email -> Office. Filled in once Sid provides the list.
// When a PM creates a project, we look up their office here. If not found,
// the user is prompted to pick the office in the Add Project dialog.
export const PM_TO_OFFICE: Record<string, Office> = {
  // "lauren.mason@geoconinc.com": "San Diego",
};

export function isOffice(value: unknown): value is Office {
  return typeof value === "string" && (OFFICES as readonly string[]).includes(value);
}

// Resolve a name to a user id by exact (case-insensitive) name match.
export function resolveAssigneeId(
  users: Array<{ id: string; name: string }>,
  name: string
): string | null {
  const target = name.trim().toLowerCase();
  return users.find((u) => u.name.trim().toLowerCase() === target)?.id ?? null;
}
