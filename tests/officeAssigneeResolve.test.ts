import { describe, it, expect } from "vitest";
import { resolveMatrixAssigneeId, type OfficeAssigneeRow } from "@/lib/domain/officeAssigneeResolve";

const rows: OfficeAssigneeRow[] = [
  {
    displayName: "Joanne Brightman",
    employeeListName: "Brightman, Joanne",
    email: "jbrightman@geoconinc.com"
  },
  {
    displayName: "Lauren Mason",
    employeeListName: "Mason, Lauren",
    email: "lmason@geoconinc.com"
  }
];

const users = [
  { id: "u-joanne", name: "Brightman, Joanne", email: "jbrightman@geoconinc.com" },
  { id: "u-lauren", name: "Lauren Mason", email: "lmason@geoconinc.com" },
  { id: "u-orphan", name: "Nobody In Directory", email: "nobody@geoconinc.com" }
];

describe("resolveMatrixAssigneeId", () => {
  it("resolves a matrix label via directory email", () => {
    expect(resolveMatrixAssigneeId("Joanne Brightman", users, rows)).toBe("u-joanne");
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(resolveMatrixAssigneeId("  lauren mason  ", users, rows)).toBe("u-lauren");
  });

  it("falls back to matching the user's name when no directory row exists", () => {
    expect(resolveMatrixAssigneeId("Nobody In Directory", users, rows)).toBe("u-orphan");
  });

  it("resolves via Excel/employee list name when email is missing from users", () => {
    const noEmailUsers = [{ id: "u1", name: "Brightman, Joanne", email: "other@geoconinc.com" }];
    expect(resolveMatrixAssigneeId("Joanne Brightman", noEmailUsers, rows)).toBe("u1");
  });

  it("returns null when nothing matches", () => {
    expect(resolveMatrixAssigneeId("Unknown Person", users, rows)).toBeNull();
  });

  it("returns null for an empty user list", () => {
    expect(resolveMatrixAssigneeId("Lauren Mason", [], rows)).toBeNull();
  });
});
