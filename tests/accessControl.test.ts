import { describe, it, expect, afterEach, vi } from "vitest";
import {
  canViewProject,
  canManageProject,
  canViewSubitem,
  canManageSubitem,
  canAdminSubitem,
  invalidateAccessCache
} from "@/lib/server/access";
import {
  isDasOnlyAssignee,
  isDasTrackingSubitemName
} from "@/lib/domain/projectDefaults";
import type { Project, Subitem, User } from "@/lib/types";

const { listAllSubitemsMock } = vi.hoisted(() => ({
  listAllSubitemsMock: vi.fn(async () => [] as Subitem[])
}));

vi.mock("@/lib/storage", () => ({
  storage: {
    listAllSubitems: listAllSubitemsMock,
    getUserById: vi.fn(async () => null),
    getSubitemById: vi.fn(async () => null),
    getProject: vi.fn(async () => null),
    getFileById: vi.fn(async () => null)
  }
}));

function user(overrides: Partial<User> = {}): User {
  return {
    id: "u1",
    email: "worker@geoconinc.com",
    name: "Worker",
    initials: "W",
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
    prevailingWage: true,
    ...overrides
  };
}

function subitem(overrides: Partial<Subitem> = {}): Subitem {
  return {
    id: "s1",
    projectId: "p1",
    name: "Task",
    ownerId: null,
    status: "NotStarted",
    dueDate: null,
    dateCompleted: null,
    notes: null,
    position: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

const ORIGINAL_ADMINS = process.env.BOARD_ADMIN_EMAILS;

afterEach(() => {
  if (ORIGINAL_ADMINS === undefined) delete process.env.BOARD_ADMIN_EMAILS;
  else process.env.BOARD_ADMIN_EMAILS = ORIGINAL_ADMINS;
  invalidateAccessCache();
  listAllSubitemsMock.mockReset();
  listAllSubitemsMock.mockResolvedValue([]);
});

describe("DAS tracking helpers", () => {
  it("recognizes DAS 140/142 names only", () => {
    expect(isDasTrackingSubitemName("DAS 140 & Confirmation")).toBe(true);
    expect(isDasTrackingSubitemName("DAS 142 & Confirmation")).toBe(true);
    expect(isDasTrackingSubitemName("DAS Setup Sheet")).toBe(false);
    expect(isDasTrackingSubitemName("Training Fund")).toBe(false);
  });

  it("isDasOnlyAssignee when owned items are DAS 140/142 (and optional Setup Sheet)", () => {
    expect(
      isDasOnlyAssignee([
        { name: "DAS 140 & Confirmation" },
        { name: "DAS 142 & Confirmation" }
      ])
    ).toBe(true);
    expect(
      isDasOnlyAssignee([
        { name: "DAS Setup Sheet" },
        { name: "DAS 140 & Confirmation" }
      ])
    ).toBe(true);
    expect(isDasOnlyAssignee([{ name: "DAS Setup Sheet" }])).toBe(false);
    expect(
      isDasOnlyAssignee([{ name: "DAS 140 & Confirmation" }, { name: "Training Fund" }])
    ).toBe(false);
    expect(isDasOnlyAssignee([])).toBe(false);
  });
});

describe("canViewProject", () => {
  it("denies an unrelated user with no assigned subitems", async () => {
    delete process.env.BOARD_ADMIN_EMAILS;
    invalidateAccessCache();
    expect(await canViewProject(user(), project(), [])).toBe(false);
  });

  it("allows the project lead", async () => {
    delete process.env.BOARD_ADMIN_EMAILS;
    invalidateAccessCache();
    expect(await canViewProject(user({ id: "u1" }), project({ ownerId: "u1" }), [])).toBe(true);
  });

  it("allows a user who owns a subitem in the project", async () => {
    delete process.env.BOARD_ADMIN_EMAILS;
    invalidateAccessCache();
    const subs = [subitem({ ownerId: "u1" })];
    expect(await canViewProject(user({ id: "u1" }), project(), subs)).toBe(true);
  });

  it("allows any board admin", async () => {
    process.env.BOARD_ADMIN_EMAILS = "worker@geoconinc.com";
    invalidateAccessCache();
    expect(await canViewProject(user(), project(), [])).toBe(true);
  });
});

describe("canManageProject", () => {
  it("is admin-only — project leads cannot edit project fields", async () => {
    delete process.env.BOARD_ADMIN_EMAILS;
    invalidateAccessCache();
    expect(await canManageProject(user(), project())).toBe(false);
    expect(await canManageProject(user({ id: "pm" }), project({ projectManagerId: "pm" }))).toBe(
      false
    );
  });

  it("allows board admins", async () => {
    process.env.BOARD_ADMIN_EMAILS = "worker@geoconinc.com";
    invalidateAccessCache();
    expect(await canManageProject(user(), project())).toBe(true);
  });
});

describe("canViewSubitem / canManageSubitem", () => {
  it("allows the subitem owner even when not a project lead", async () => {
    delete process.env.BOARD_ADMIN_EMAILS;
    invalidateAccessCache();
    const s = subitem({ ownerId: "u1" });
    expect(await canViewSubitem(user({ id: "u1" }), project(), s)).toBe(true);
    expect(await canManageSubitem(user({ id: "u1" }), project(), s)).toBe(true);
  });

  it("denies a user who is neither admin nor owner", async () => {
    delete process.env.BOARD_ADMIN_EMAILS;
    invalidateAccessCache();
    const s = subitem({ ownerId: "someone-else" });
    expect(await canViewSubitem(user({ id: "u1" }), project(), s)).toBe(false);
    expect(await canManageSubitem(user({ id: "u1" }), project(), s)).toBe(false);
  });

  it("does not let a project lead manage someone else's subitem", async () => {
    delete process.env.BOARD_ADMIN_EMAILS;
    invalidateAccessCache();
    const s = subitem({ ownerId: "other" });
    expect(
      await canManageSubitem(user({ id: "pm" }), project({ projectManagerId: "pm" }), s)
    ).toBe(false);
  });

  it("does not let a non-DAS user manage an unowned DAS tracking row", async () => {
    delete process.env.BOARD_ADMIN_EMAILS;
    invalidateAccessCache();
    listAllSubitemsMock.mockResolvedValue([
      subitem({ id: "mine", name: "Training Fund", ownerId: "u1" })
    ]);
    const s = subitem({ name: "DAS 140 & Confirmation", ownerId: "other" });
    expect(await canManageSubitem(user({ id: "u1" }), project(), s)).toBe(false);
  });

  it("does not let a DAS-only assignee see or manage someone else's DAS 140/142 row", async () => {
    delete process.env.BOARD_ADMIN_EMAILS;
    invalidateAccessCache();
    listAllSubitemsMock.mockResolvedValue([
      subitem({ id: "owned-140", name: "DAS 140 & Confirmation", ownerId: "u1" }),
      subitem({ id: "owned-142", name: "DAS 142 & Confirmation", ownerId: "u1" })
    ]);
    const otherOffice = subitem({
      id: "other-140",
      name: "DAS 140 & Confirmation",
      ownerId: "someone-else"
    });
    expect(await canViewSubitem(user({ id: "u1" }), project(), otherOffice)).toBe(false);
    expect(await canManageSubitem(user({ id: "u1" }), project(), otherOffice)).toBe(false);
  });
});

describe("canAdminSubitem", () => {
  it("is true only for board admins", async () => {
    delete process.env.BOARD_ADMIN_EMAILS;
    invalidateAccessCache();
    expect(await canAdminSubitem(user())).toBe(false);
    process.env.BOARD_ADMIN_EMAILS = "worker@geoconinc.com";
    invalidateAccessCache();
    expect(await canAdminSubitem(user())).toBe(true);
  });
});
