import { storage } from "@/lib/storage";
import { initialsFromName } from "@/lib/utils";
import { getEffectiveOfficeAssigneeRows } from "./adminSiteConfigStore";

/** Upserts accounting office-matrix contacts so subitem auto-assignment can resolve by email/name. */
export async function syncOfficeAssigneeUsersIntoStorage(): Promise<void> {
  const assignees = await getEffectiveOfficeAssigneeRows();
  if (!assignees.length) return;

  const toSync = assignees
    .map((row) => {
      const email = row.email?.trim();
      if (!email) return null;
      return {
        email,
        name: row.employeeListName.trim(),
        initials: initialsFromName(row.employeeListName)
      };
    })
    .filter((row): row is { email: string; name: string; initials: string } => row !== null);

  const BATCH = 8;
  for (let i = 0; i < toSync.length; i += BATCH) {
    await Promise.all(toSync.slice(i, i + BATCH).map((row) => storage.upsertUser(row)));
  }
}
