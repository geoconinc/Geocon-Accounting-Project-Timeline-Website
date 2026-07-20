import { describe, it, expect } from "vitest";
import {
  rosterPmPickerUsers,
  rosterDirectorPickerUsers,
  rosterPmEmails,
  rosterDirectorEmails,
  pmOptionLabel,
  directorOptionLabel,
  rosterPmEntries,
  rosterDirectorEntries,
  directorsNotInEmployeeList
} from "@/lib/domain/roleAssigneeRoster";
import type { User } from "@/lib/types";

function user(id: string, name: string, email: string): User {
  return { id, name, email, initials: "X", createdAt: "2026-01-01T00:00:00.000Z" };
}

describe("roleAssigneeRoster", () => {
  it("rosterPmEmails and rosterDirectorEmails are non-empty sets of lowercase emails", () => {
    const pms = rosterPmEmails();
    const dirs = rosterDirectorEmails();
    expect(pms.size).toBeGreaterThan(0);
    expect(dirs.size).toBeGreaterThan(0);
    for (const e of [...pms, ...dirs]) {
      expect(e).toBe(e.toLowerCase());
      expect(e).toContain("@");
    }
  });

  it("rosterPmPickerUsers returns only matched users, sorted by name", () => {
    const emails = [...rosterPmEmails()];
    if (emails.length < 2) return;
    const users = [
      user("b", "Zed Person", emails[0]),
      user("a", "Amy Person", emails[1]),
      user("x", "Not On Roster", "outsider@geoconinc.com")
    ];
    const picked = rosterPmPickerUsers(users);
    expect(picked.map((u) => u.id)).not.toContain("x");
    expect(picked.map((u) => u.name)).toEqual([...picked.map((u) => u.name)].sort((a, b) => a.localeCompare(b)));
  });

  it("rosterDirectorPickerUsers returns only matched users", () => {
    const emails = [...rosterDirectorEmails()];
    if (emails.length === 0) return;
    const users = [
      user("d1", "Director One", emails[0]),
      user("x", "Outsider", "outsider@geoconinc.com")
    ];
    const picked = rosterDirectorPickerUsers(users);
    expect(picked.every((u) => emails.includes(u.email.toLowerCase()))).toBe(true);
    expect(picked.map((u) => u.id)).not.toContain("x");
  });

  it("pmOptionLabel includes name and email", () => {
    const emails = [...rosterPmEmails()];
    const email = emails[0] ?? "pm@geoconinc.com";
    const u = user("1", "Test PM", email);
    const label = pmOptionLabel(u);
    expect(label).toContain("Test PM");
    expect(label).toContain(email);
  });

  it("directorOptionLabel includes email", () => {
    const emails = [...rosterDirectorEmails()];
    const email = emails[0] ?? "pd@geoconinc.com";
    const u = user("1", "Test Director", email);
    expect(directorOptionLabel(u)).toContain(email);
  });

  it("roster entries only include rows with emails", () => {
    for (const p of rosterPmEntries()) expect(p.email.trim()).toBeTruthy();
    for (const d of rosterDirectorEntries()) expect(d.email.trim()).toBeTruthy();
  });

  it("directorsNotInEmployeeList only returns directors flagged out of the employee list", () => {
    for (const d of directorsNotInEmployeeList()) {
      expect(d.inEmployeeList).toBe(false);
    }
  });
});
