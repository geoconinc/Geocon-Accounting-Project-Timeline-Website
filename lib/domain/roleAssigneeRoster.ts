import type { User } from "@/lib/types";
import roster from "@/data/geoconRoleAssignees.json";

function normEmail(e: string | undefined | null): string | null {
  const t = (e ?? "").trim().toLowerCase();
  return t || null;
}

export function rosterDirectorEmails(): Set<string> {
  const s = new Set<string>();
  for (const d of roster.projectDirectors) {
    const n = normEmail(d.email);
    if (n) s.add(n);
  }
  return s;
}

export function rosterPmEmails(): Set<string> {
  const s = new Set<string>();
  for (const p of roster.projectManagers) {
    const n = normEmail(p.email);
    if (n) s.add(n);
  }
  return s;
}

export function usersMatchingDirectorRoster(allUsers: User[]): User[] {
  const emails = rosterDirectorEmails();
  return allUsers
    .filter((u) => emails.has(u.email.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function usersMatchingPmRoster(allUsers: User[]): User[] {
  const emails = rosterPmEmails();
  return allUsers
    .filter((u) => emails.has(u.email.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));
}
