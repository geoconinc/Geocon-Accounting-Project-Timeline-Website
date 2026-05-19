import { resolveMatrixAssigneeId, type OfficeAssigneeRow } from "./officeAssigneeResolve";

// Office and per-office subitem assignment map.
// When a project is created, the project's office determines who is auto-assigned
// to each default subitem. Matrix labels (e.g. "Joanne Brightman") resolve via
// data/officeAssigneeDirectory.json to employee-list name + email; users must be
// synced (syncOfficeAssigneeUsersIntoStorage) before create.
//
// Source: accounting assignment matrix by office (May 2026).
// "DAS Setup Sheet" uses the literal ASSIGNEE_PROJECT_MANAGER — resolved to
// projectManagerId at project creation.


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

/** Placeholder in OFFICE_ASSIGNEES — replaced with the selected project manager's user id. */
export const ASSIGNEE_PROJECT_MANAGER = "__PROJECT_MANAGER__";

const K = "Kailua Mizejewski";

export const OFFICE_ASSIGNEES: Record<Office, Record<string, string>> = {
  "San Diego": {
    "DAS Setup Sheet": ASSIGNEE_PROJECT_MANAGER,
    "DAS 140 & Confirmation": "Lauren Mason",
    "DAS 142 & Confirmation": "Lauren Mason",
    "Fringe Benefit Statement": K,
    "Training Fund": K,
    "Other Certified Payroll Setup Forms": K,
    "Certified Payroll Entry": "Jill Sader",
    "Section 3 Forms": K,
    "Employee Information Sheet": K,
    "Payroll Deduction Authorization": K
  },
  Sacramento: {
    "DAS Setup Sheet": ASSIGNEE_PROJECT_MANAGER,
    "DAS 140 & Confirmation": "Christina Boeschen",
    "DAS 142 & Confirmation": "Christina Boeschen",
    "Fringe Benefit Statement": K,
    "Training Fund": K,
    "Other Certified Payroll Setup Forms": K,
    "Certified Payroll Entry": "Jill Sader",
    "Section 3 Forms": K,
    "Employee Information Sheet": K,
    "Payroll Deduction Authorization": K
  },
  Livermore: {
    "DAS Setup Sheet": ASSIGNEE_PROJECT_MANAGER,
    "DAS 140 & Confirmation": "Joanne Brightman",
    "DAS 142 & Confirmation": "Joanne Brightman",
    "Fringe Benefit Statement": K,
    "Training Fund": K,
    "Other Certified Payroll Setup Forms": K,
    "Certified Payroll Entry": "Jill Sader",
    "Section 3 Forms": K,
    "Employee Information Sheet": K,
    "Payroll Deduction Authorization": K
  },
  Rocklin: {
    "DAS Setup Sheet": ASSIGNEE_PROJECT_MANAGER,
    "DAS 140 & Confirmation": "Christina Boeschen",
    "DAS 142 & Confirmation": "Christina Boeschen",
    "Fringe Benefit Statement": K,
    "Training Fund": K,
    "Other Certified Payroll Setup Forms": K,
    "Certified Payroll Entry": "Jill Sader",
    "Section 3 Forms": K,
    "Employee Information Sheet": K,
    "Payroll Deduction Authorization": K
  },
  Murrieta: {
    "DAS Setup Sheet": ASSIGNEE_PROJECT_MANAGER,
    "DAS 140 & Confirmation": "Hilda Diaz",
    "DAS 142 & Confirmation": "Hilda Diaz",
    "Fringe Benefit Statement": K,
    "Training Fund": K,
    "Other Certified Payroll Setup Forms": K,
    "Certified Payroll Entry": "Keiala Beck",
    "Section 3 Forms": K,
    "Employee Information Sheet": K,
    "Payroll Deduction Authorization": K
  },
  Burbank: {
    "DAS Setup Sheet": "Kelsey Filban",
    "DAS 140 & Confirmation": "Kelsey Filban",
    "DAS 142 & Confirmation": "Amanda Fair",
    "Fringe Benefit Statement": K,
    "Training Fund": K,
    "Other Certified Payroll Setup Forms": K,
    "Certified Payroll Entry": "Keiala Beck",
    "Section 3 Forms": K,
    "Employee Information Sheet": K,
    "Payroll Deduction Authorization": K
  },
  Redlands: {
    "DAS Setup Sheet": "Kelsey Filban",
    "DAS 140 & Confirmation": "Kelsey Filban",
    "DAS 142 & Confirmation": "Amanda Fair",
    "Fringe Benefit Statement": K,
    "Training Fund": K,
    "Other Certified Payroll Setup Forms": K,
    "Certified Payroll Entry": "Keiala Beck",
    "Section 3 Forms": K,
    "Employee Information Sheet": K,
    "Payroll Deduction Authorization": K
  },
  "Orange County": {
    "DAS Setup Sheet": "Kelsey Filban",
    "DAS 140 & Confirmation": "Kelsey Filban",
    "DAS 142 & Confirmation": "Amanda Fair",
    "Fringe Benefit Statement": K,
    "Training Fund": K,
    "Other Certified Payroll Setup Forms": K,
    "Certified Payroll Entry": "Keiala Beck",
    "Section 3 Forms": K,
    "Employee Information Sheet": K,
    "Payroll Deduction Authorization": K
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

export function resolveOfficeSubitemOwnerId(
  assigneeRule: string | undefined,
  users: Array<{ id: string; name: string; email: string }>,
  projectManagerId: string | null,
  assigneeRows?: OfficeAssigneeRow[]
): string | null {
  if (!assigneeRule) return null;
  if (assigneeRule === ASSIGNEE_PROJECT_MANAGER) return projectManagerId;
  return (
    resolveMatrixAssigneeId(assigneeRule, users, assigneeRows ?? []) ??
    resolveAssigneeId(users, assigneeRule)
  );
}

export function subitemOwnerIdForOffice(
  office: Office | null,
  subitemName: string,
  users: Array<{ id: string; name: string; email: string }>,
  projectManagerId: string | null,
  assigneeRows?: OfficeAssigneeRow[]
): string | null {
  if (!office) return null;
  const rule = OFFICE_ASSIGNEES[office][subitemName];
  return resolveOfficeSubitemOwnerId(rule, users, projectManagerId, assigneeRows);
}
