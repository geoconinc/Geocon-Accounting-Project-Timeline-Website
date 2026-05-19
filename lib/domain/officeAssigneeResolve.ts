import type { User } from "@/lib/types";

export interface OfficeAssigneeRow {
  displayName: string;
  employeeListName: string;
  email: string;
}

/**
 * Resolves a matrix label (e.g. "Joanne Brightman") to a user id.
 * Rows come from Postgres site_config (office assignee directory).
 */
export function resolveMatrixAssigneeId(
  matrixLabel: string,
  users: Array<Pick<User, "id" | "name" | "email">>,
  rows: OfficeAssigneeRow[]
): string | null {
  const label = matrixLabel.trim().toLowerCase();
  const entry = rows.find((r) => r.displayName.trim().toLowerCase() === label);
  if (!entry) {
    return users.find((u) => u.name.trim().toLowerCase() === label)?.id ?? null;
  }
  const emailNorm = entry.email.trim().toLowerCase();
  const excelNorm = entry.employeeListName.trim().toLowerCase();
  return (
    users.find((u) => u.email.trim().toLowerCase() === emailNorm)?.id ??
    users.find((u) => u.name.trim().toLowerCase() === excelNorm)?.id ??
    null
  );
}
