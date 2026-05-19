import type { User } from "@/lib/types";
import type { GeoconRoleAssigneesFile } from "@/lib/types/roleAssigneeData";

function normEmail(e: string | undefined | null): string | null {
  const t = (e ?? "").trim().toLowerCase();
  return t || null;
}

export function rosterDirectorEmails(roster: GeoconRoleAssigneesFile | null): Set<string> {
  const s = new Set<string>();
  if (!roster) return s;
  for (const d of roster.projectDirectors) {
    const n = normEmail(d.email);
    if (n) s.add(n);
  }
  return s;
}

export function rosterPmEmails(roster: GeoconRoleAssigneesFile | null): Set<string> {
  const s = new Set<string>();
  if (!roster) return s;
  for (const p of roster.projectManagers) {
    const n = normEmail(p.email);
    if (n) s.add(n);
  }
  return s;
}

export function usersMatchingDirectorRoster(
  allUsers: User[],
  roster: GeoconRoleAssigneesFile | null
): User[] {
  const emails = rosterDirectorEmails(roster);
  return allUsers
    .filter((u) => emails.has(u.email.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function usersMatchingPmRoster(
  allUsers: User[],
  roster: GeoconRoleAssigneesFile | null
): User[] {
  const emails = rosterPmEmails(roster);
  return allUsers
    .filter((u) => emails.has(u.email.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));
}
