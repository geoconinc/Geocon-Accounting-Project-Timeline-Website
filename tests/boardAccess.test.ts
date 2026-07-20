import { describe, it, expect, afterEach } from "vitest";
import {
  isProjectLead,
  hasFullBoardAccess,
  forbidden,
  invalidateAccessCache
} from "@/lib/server/access";
import type { Project, User } from "@/lib/types";

function user(overrides: Partial<User> = {}): User {
  return {
    id: "u1",
    email: "user@geoconinc.com",
    name: "User",
    initials: "U",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: "p1",
    code: "A-1",
    name: "Alpha",
    ownerId: null,
    status: "New",
    group: "Current",
    startDate: null,
    timelineStart: null,
    timelineEnd: null,
    dirNumber: null,
    union: false,
    reportingSystems: null,
    cprContact: null,
    sharepointUrl: null,
    office: null,
    projectManagerId: null,
    projectDirectorId: null,
    notes: null,
    lastUpdatedAt: "2026-01-01T00:00:00.000Z",
    lastUpdatedBy: null,
    position: 0,
    ...overrides
  };
}

const ORIGINAL_ADMINS = process.env.BOARD_ADMIN_EMAILS;

afterEach(() => {
  if (ORIGINAL_ADMINS === undefined) delete process.env.BOARD_ADMIN_EMAILS;
  else process.env.BOARD_ADMIN_EMAILS = ORIGINAL_ADMINS;
  invalidateAccessCache();
});

describe("isProjectLead", () => {
  it("is true for the project owner", () => {
    expect(isProjectLead(user({ id: "u1" }), project({ ownerId: "u1" }))).toBe(true);
  });
  it("is true for the project manager", () => {
    expect(isProjectLead(user({ id: "pm" }), project({ projectManagerId: "pm" }))).toBe(true);
  });
  it("is true for the project director", () => {
    expect(isProjectLead(user({ id: "pd" }), project({ projectDirectorId: "pd" }))).toBe(true);
  });
  it("is false for an unrelated user", () => {
    expect(
      isProjectLead(
        user({ id: "other" }),
        project({ ownerId: "u1", projectManagerId: "pm", projectDirectorId: "pd" })
      )
    ).toBe(false);
  });
});

describe("hasFullBoardAccess", () => {
  it("grants access when the email is listed in BOARD_ADMIN_EMAILS", () => {
    process.env.BOARD_ADMIN_EMAILS = "admin@geoconinc.com, other@geoconinc.com";
    expect(hasFullBoardAccess(user({ email: "admin@geoconinc.com" }))).toBe(true);
    expect(hasFullBoardAccess(user({ email: "ADMIN@GEOCONINC.COM" }))).toBe(true);
  });

  it("denies access when the email is not listed", () => {
    process.env.BOARD_ADMIN_EMAILS = "admin@geoconinc.com";
    expect(hasFullBoardAccess(user({ email: "user@geoconinc.com" }))).toBe(false);
  });

  it("trims whitespace around configured emails", () => {
    process.env.BOARD_ADMIN_EMAILS = "  admin@geoconinc.com  , ";
    expect(hasFullBoardAccess(user({ email: "admin@geoconinc.com" }))).toBe(true);
  });

  it("denies when BOARD_ADMIN_EMAILS is unset", () => {
    delete process.env.BOARD_ADMIN_EMAILS;
    expect(hasFullBoardAccess(user({ email: "admin@geoconinc.com" }))).toBe(false);
  });
});

describe("forbidden", () => {
  it("returns a 403 JSON response", async () => {
    const res = forbidden();
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "forbidden" });
  });

  it("accepts a custom message", async () => {
    const res = forbidden("nope");
    expect(await res.json()).toEqual({ error: "nope" });
  });
});
