import type { User } from "@/lib/types";
import roster from "@/data/geoconRoleAssignees.json";

function normEmail(e: string | undefined | null): string | null {
  const t = (e ?? "").trim().toLowerCase();
  return t || null;
}

/** PMs from geoconRoleAssignees.json, matched to board users by email (order preserved). */
export function rosterPmPickerUsers(allUsers: User[]): User[] {
  const byEmail = new Map(allUsers.map((u) => [u.email.toLowerCase(), u]));
  const out: User[] = [];
  const seen = new Set<string>();
  for (const p of roster.projectManagers) {
    const email = normEmail(p.email);
    if (!email || seen.has(email)) continue;
    seen.add(email);
    const matched = byEmail.get(email);
    if (matched) out.push(matched);
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** Directors from JSON with email, matched to board users by email. */
export function rosterDirectorPickerUsers(allUsers: User[]): User[] {
  const byEmail = new Map(allUsers.map((u) => [u.email.toLowerCase(), u]));
  const out: User[] = [];
  const seen = new Set<string>();
  for (const d of roster.projectDirectors) {
    const email = normEmail(d.email);
    if (!email || seen.has(email)) continue;
    seen.add(email);
    const matched = byEmail.get(email);
    if (matched) out.push(matched);
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export function rosterDirectorEmails(): Set<string> {
  return new Set(
    roster.projectDirectors.map((d) => normEmail(d.email)).filter((e): e is string => Boolean(e))
  );
}

export function rosterPmEmails(): Set<string> {
  return new Set(
    roster.projectManagers.map((p) => normEmail(p.email)).filter((e): e is string => Boolean(e))
  );
}

/** @deprecated Use rosterPmPickerUsers — kept for filters */
export function usersMatchingPmRoster(allUsers: User[]): User[] {
  return rosterPmPickerUsers(allUsers);
}

/** @deprecated Use rosterDirectorPickerUsers */
export function usersMatchingDirectorRoster(allUsers: User[]): User[] {
  return rosterDirectorPickerUsers(allUsers);
}

export function pmOptionLabel(u: User): string {
  const job = roster.projectManagers.find(
    (p) => normEmail(p.email) === u.email.toLowerCase()
  )?.job;
  return job ? `${u.name} — ${u.email} — ${job}` : `${u.name} — ${u.email}`;
}

export function directorOptionLabel(u: User): string {
  const d = roster.projectDirectors.find(
    (x) => normEmail(x.email) === u.email.toLowerCase()
  );
  return d?.chartLabel ? `${d.chartLabel} — ${u.email}` : `${u.name} — ${u.email}`;
}

export function directorsNotInEmployeeList() {
  return roster.projectDirectors.filter((d) => !d.inEmployeeList);
}

/** Labels for PM/director rows in JSON (for display when user row missing). */
export function rosterPmEntries() {
  return roster.projectManagers.filter((p) => normEmail(p.email));
}

export function rosterDirectorEntries() {
  return roster.projectDirectors.filter((d) => normEmail(d.email));
}
