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
export const OFFICE_ASSIGNEES: Record<Office, Record<string, string>> = {
  "San Diego": {
    "DAS 140 & 142 Setup Form": "Lauren Mason",
    "DAS 140": "Lauren Mason",
    "DAS 140 Confirmation": "Lauren Mason",
    "DAS 142": "Kailua Mizejewski",
    "DAS 142 Confirmation": "Kailua Mizejewski",
    "Fringe Benefit Statement": "Kailua Mizejewski",
    "Training Fund": "Kailua Mizejewski",
    "Other Setup Forms": "Jill Sader",
    "Certified Payroll Reporting": "Kailua Mizejewski"
  },
  Sacramento: {
    "DAS 140 & 142 Setup Form": "Christina Boeschen",
    "DAS 140": "Christina Boeschen",
    "DAS 140 Confirmation": "Christina Boeschen",
    "DAS 142": "Kailua Mizejewski",
    "DAS 142 Confirmation": "Kailua Mizejewski",
    "Fringe Benefit Statement": "Kailua Mizejewski",
    "Training Fund": "Kailua Mizejewski",
    "Other Setup Forms": "Jill Sader",
    "Certified Payroll Reporting": "Kailua Mizejewski"
  },
  Livermore: {
    "DAS 140 & 142 Setup Form": "Joanne Brightman",
    "DAS 140": "Joanne Brightman",
    "DAS 140 Confirmation": "Joanne Brightman",
    "DAS 142": "Kailua Mizejewski",
    "DAS 142 Confirmation": "Kailua Mizejewski",
    "Fringe Benefit Statement": "Kailua Mizejewski",
    "Training Fund": "Kailua Mizejewski",
    "Other Setup Forms": "Jill Sader",
    "Certified Payroll Reporting": "Kailua Mizejewski"
  },
  Rocklin: {
    "DAS 140 & 142 Setup Form": "Christina Boeschen",
    "DAS 140": "Christina Boeschen",
    "DAS 140 Confirmation": "Christina Boeschen",
    "DAS 142": "Kailua Mizejewski",
    "DAS 142 Confirmation": "Kailua Mizejewski",
    "Fringe Benefit Statement": "Kailua Mizejewski",
    "Training Fund": "Kailua Mizejewski",
    "Other Setup Forms": "Jill Sader",
    "Certified Payroll Reporting": "Kailua Mizejewski"
  },
  Murrieta: {
    "DAS 140 & 142 Setup Form": "Hilda Diaz",
    "DAS 140": "Hilda Diaz",
    "DAS 140 Confirmation": "Hilda Diaz",
    "DAS 142": "Kailua Mizejewski",
    "DAS 142 Confirmation": "Kailua Mizejewski",
    "Fringe Benefit Statement": "Kailua Mizejewski",
    "Training Fund": "Kailua Mizejewski",
    "Other Setup Forms": "Keiala Beck",
    "Certified Payroll Reporting": "Kailua Mizejewski"
  },
  Burbank: {
    "DAS 140 & 142 Setup Form": "Kelsey Filban",
    "DAS 140": "Amanda Fair",
    "DAS 140 Confirmation": "Amanda Fair",
    "DAS 142": "Kailua Mizejewski",
    "DAS 142 Confirmation": "Kailua Mizejewski",
    "Fringe Benefit Statement": "Kailua Mizejewski",
    "Training Fund": "Kailua Mizejewski",
    "Other Setup Forms": "Keiala Beck",
    "Certified Payroll Reporting": "Kailua Mizejewski"
  },
  Redlands: {
    "DAS 140 & 142 Setup Form": "Kelsey Filban",
    "DAS 140": "Amanda Fair",
    "DAS 140 Confirmation": "Amanda Fair",
    "DAS 142": "Kailua Mizejewski",
    "DAS 142 Confirmation": "Kailua Mizejewski",
    "Fringe Benefit Statement": "Kailua Mizejewski",
    "Training Fund": "Kailua Mizejewski",
    "Other Setup Forms": "Keiala Beck",
    "Certified Payroll Reporting": "Kailua Mizejewski"
  },
  "Orange County": {
    "DAS 140 & 142 Setup Form": "Kelsey Filban",
    "DAS 140": "Amanda Fair",
    "DAS 140 Confirmation": "Amanda Fair",
    "DAS 142": "Kailua Mizejewski",
    "DAS 142 Confirmation": "Kailua Mizejewski",
    "Fringe Benefit Statement": "Kailua Mizejewski",
    "Training Fund": "Kailua Mizejewski",
    "Other Setup Forms": "Keiala Beck",
    "Certified Payroll Reporting": "Kailua Mizejewski"
  }
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
