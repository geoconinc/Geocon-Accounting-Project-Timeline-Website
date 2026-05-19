import { storage } from "@/lib/storage";
import { initialsFromName } from "@/lib/utils";
import type { GeoconRoleAssigneesFile } from "@/lib/types/roleAssigneeData";
import { readAdminSiteConfig } from "./adminSiteConfigStore";

let cached: GeoconRoleAssigneesFile | null | undefined;

export function invalidateRoleAssigneesCache(): void {
  cached = undefined;
}

function isValidRoleAssignees(data: unknown): data is GeoconRoleAssigneesFile {
  if (!data || typeof data !== "object") return false;
  const d = data as GeoconRoleAssigneesFile;
  return Array.isArray(d.projectDirectors) && Array.isArray(d.projectManagers);
}

/** Load PM/director roster from Postgres site_config (no local JSON files). */
export async function loadRoleAssigneesJson(): Promise<GeoconRoleAssigneesFile | null> {
  if (cached !== undefined) return cached;

  const admin = await readAdminSiteConfig();
  if (admin?.roleAssignees && isValidRoleAssignees(admin.roleAssignees)) {
    cached = admin.roleAssignees;
    return cached;
  }

  cached = null;
  return null;
}

/**
 * Ensures everyone listed as project manager or director (with an email) exists in storage.
 * Idempotent; safe to call on login.
 */
export async function syncRoleAssigneeUsersIntoStorage(): Promise<void> {
  const data = await loadRoleAssigneesJson();
  if (!data) return;

  const seen = new Set<string>();
  const people: { name: string; email: string }[] = [];

  for (const d of data.projectDirectors) {
    const e = d.email?.trim().toLowerCase();
    if (!e || seen.has(e)) continue;
    seen.add(e);
    people.push({ name: d.name, email: d.email.trim() });
  }
  for (const p of data.projectManagers) {
    const e = p.email?.trim().toLowerCase();
    if (!e || seen.has(e)) continue;
    seen.add(e);
    people.push({ name: p.name, email: p.email.trim() });
  }

  const BATCH = 8;
  for (let i = 0; i < people.length; i += BATCH) {
    await Promise.all(
      people.slice(i, i + BATCH).map((person) =>
        storage.upsertUser({
          email: person.email,
          name: person.name,
          initials: initialsFromName(person.name)
        })
      )
    );
  }
}
