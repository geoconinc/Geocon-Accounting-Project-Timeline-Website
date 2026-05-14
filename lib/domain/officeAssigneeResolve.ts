import type { User } from "@/lib/types";
import directory from "@/data/officeAssigneeDirectory.json";

export interface OfficeAssigneeRow {
  displayName: string;
  employeeListName: string;
  email: string;
}

const defaultRows: OfficeAssigneeRow[] =
  (directory as { assignees: OfficeAssigneeRow[] }).assignees ?? [];

/**
 * Resolves a matrix label (e.g. "Joanne Brightman") to a user id.
 * Employee export uses "Last, First" names; directory maps display → email + Excel name.
 */
export function resolveMatrixAssigneeId(
  matrixLabel: string,
  users: Array<Pick<User, "id" | "name" | "email">>,
  rows?: OfficeAssigneeRow[]
): string | null {
  const useRows = rows ?? defaultRows;
  const label = matrixLabel.trim().toLowerCase();
  const entry = useRows.find((r) => r.displayName.trim().toLowerCase() === label);
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
