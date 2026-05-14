import { storage } from "@/lib/storage";
import { initialsFromName } from "@/lib/utils";
import { getEffectiveOfficeAssigneeRows } from "./adminSiteConfigStore";

/** Upserts accounting office-matrix contacts so subitem auto-assignment can resolve by email/name. */
export async function syncOfficeAssigneeUsersIntoStorage(): Promise<void> {
  const assignees = await getEffectiveOfficeAssigneeRows();
  if (!assignees.length) return;

  for (const row of assignees) {
    const email = row.email?.trim();
    if (!email) continue;
    await storage.upsertUser({
      email,
      name: row.employeeListName.trim(),
      initials: initialsFromName(row.employeeListName)
    });
  }
}
