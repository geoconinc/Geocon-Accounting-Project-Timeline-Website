import { readFileSync } from "node:fs";
import path from "node:path";
import { storage } from "@/lib/storage";
import { initialsFromName } from "@/lib/utils";
import type { GeoconRoleAssigneesFile } from "@/lib/types/roleAssigneeData";
import { readAdminSiteConfig } from "./adminSiteConfigStore";

let cached: GeoconRoleAssigneesFile | null = null;

export function invalidateRoleAssigneesCache(): void {
  cached = null;
}

export async function loadRoleAssigneesJson(): Promise<GeoconRoleAssigneesFile | null> {
  const admin = await readAdminSiteConfig();
  if (
    admin?.roleAssignees &&
    Array.isArray(admin.roleAssignees.projectDirectors) &&
    Array.isArray(admin.roleAssignees.projectManagers)
  ) {
    return admin.roleAssignees;
  }
  if (cached) return cached;
  try {
    const p = path.join(process.cwd(), "data", "geoconRoleAssignees.json");
    const raw = readFileSync(p, "utf8");
    cached = JSON.parse(raw) as GeoconRoleAssigneesFile;
    return cached;
  } catch (e) {
    console.warn("geoconRoleAssignees.json not loaded:", e);
    return null;
  }
}

/** Sync loader for modules that cannot await (use `loadRoleAssigneesJson` when possible). */
export function loadRoleAssigneesJsonSync(): GeoconRoleAssigneesFile | null {
  if (cached) return cached;
  try {
    const p = path.join(process.cwd(), "data", "geoconRoleAssignees.json");
    const raw = readFileSync(p, "utf8");
    cached = JSON.parse(raw) as GeoconRoleAssigneesFile;
    return cached;
  } catch {
    return null;
  }
}

/**
 * Ensures everyone listed as project manager or director (with an email) exists in storage.
 * Idempotent; safe to call on each board load.
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

  for (const person of people) {
    await storage.upsertUser({
      email: person.email,
      name: person.name,
      initials: initialsFromName(person.name)
    });
  }
}
