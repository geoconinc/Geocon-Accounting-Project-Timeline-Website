import { describe, it, expect } from "vitest";
import { applyFilters, DEFAULT_FILTERS, type BoardFilters } from "@/lib/domain/boardFilters";
import type { ProjectStatus } from "@/lib/types";

type TestProject = {
  id: string;
  code: string;
  name: string;
  ownerId: string | null;
  projectManagerId: string | null;
  projectDirectorId: string | null;
  status: ProjectStatus;
  group: string;
  lastUpdatedAt: string;
  timelineStart: string | null;
  position: number;
};

function project(overrides: Partial<TestProject> = {}): TestProject {
  return {
    id: overrides.id ?? "p1",
    code: overrides.code ?? "A100",
    name: overrides.name ?? "Alpha",
    ownerId: overrides.ownerId ?? null,
    projectManagerId: overrides.projectManagerId ?? null,
    projectDirectorId: overrides.projectDirectorId ?? null,
    status: overrides.status ?? "New",
    group: overrides.group ?? "Current",
    lastUpdatedAt: overrides.lastUpdatedAt ?? "2026-01-01T00:00:00.000Z",
    timelineStart: overrides.timelineStart ?? null,
    position: overrides.position ?? 0
  };
}

function filters(overrides: Partial<BoardFilters> = {}): BoardFilters {
  return { ...DEFAULT_FILTERS, mineOnly: false, ...overrides };
}

const noSubs: Record<string, { name: string; ownerId: string | null; status: string }[]> = {};

describe("applyFilters — filtering", () => {
  it("returns all projects when no filters active (mineOnly off)", () => {
    const projects = [project({ id: "p1" }), project({ id: "p2" })];
    expect(applyFilters(projects, noSubs, filters(), null)).toHaveLength(2);
  });

  it("mineOnly keeps projects the user owns", () => {
    const projects = [
      project({ id: "mine", ownerId: "u1" }),
      project({ id: "other", ownerId: "u2" })
    ];
    const result = applyFilters(projects, noSubs, filters({ mineOnly: true }), "u1");
    expect(result.map((p) => p.id)).toEqual(["mine"]);
  });

  it("mineOnly keeps projects where the user owns a subitem", () => {
    const projects = [project({ id: "p1", ownerId: "someoneElse" })];
    const subs = { p1: [{ name: "Task", ownerId: "u1", status: "NotStarted" }] };
    const result = applyFilters(projects, subs, filters({ mineOnly: true }), "u1");
    expect(result).toHaveLength(1);
  });

  it("mineOnly is ignored when meId is null", () => {
    const projects = [project({ id: "p1", ownerId: "u1" })];
    expect(applyFilters(projects, noSubs, filters({ mineOnly: true }), null)).toHaveLength(1);
  });

  it("hideCompleted removes Completed group projects", () => {
    const projects = [
      project({ id: "c", group: "Completed" }),
      project({ id: "cur", group: "Current" })
    ];
    const result = applyFilters(projects, noSubs, filters({ hideCompleted: true }), null);
    expect(result.map((p) => p.id)).toEqual(["cur"]);
  });

  it("status filter keeps only matching statuses", () => {
    const projects = [
      project({ id: "new", status: "New" }),
      project({ id: "done", status: "Completed" })
    ];
    const result = applyFilters(projects, noSubs, filters({ statuses: ["Completed"] }), null);
    expect(result.map((p) => p.id)).toEqual(["done"]);
  });

  it("owner filter keeps only matching owners", () => {
    const projects = [
      project({ id: "p1", ownerId: "u1" }),
      project({ id: "p2", ownerId: "u2" })
    ];
    const result = applyFilters(projects, noSubs, filters({ ownerIds: ["u2"] }), null);
    expect(result.map((p) => p.id)).toEqual(["p2"]);
  });

  it("project manager and director filters work", () => {
    const projects = [
      project({ id: "p1", projectManagerId: "pm1", projectDirectorId: "pd1" }),
      project({ id: "p2", projectManagerId: "pm2", projectDirectorId: "pd2" })
    ];
    expect(
      applyFilters(projects, noSubs, filters({ projectManagerIds: ["pm1"] }), null).map((p) => p.id)
    ).toEqual(["p1"]);
    expect(
      applyFilters(projects, noSubs, filters({ projectDirectorIds: ["pd2"] }), null).map((p) => p.id)
    ).toEqual(["p2"]);
  });

  it("subitem status/name/owner filters require a matching subitem", () => {
    const projects = [project({ id: "p1" }), project({ id: "p2" })];
    const subs = {
      p1: [{ name: "DAS 140 & Confirmation", ownerId: "u1", status: "InProgress" }],
      p2: [{ name: "Training Fund", ownerId: "u2", status: "Completed" }]
    };
    expect(
      applyFilters(projects, subs, filters({ subitemStatuses: ["InProgress"] }), null).map((p) => p.id)
    ).toEqual(["p1"]);
    expect(
      applyFilters(projects, subs, filters({ subitemNames: ["Training Fund"] }), null).map((p) => p.id)
    ).toEqual(["p2"]);
    expect(
      applyFilters(projects, subs, filters({ subitemOwnerIds: ["u1"] }), null).map((p) => p.id)
    ).toEqual(["p1"]);
  });

  it("combined subitem filters must all match on the same subitem", () => {
    const projects = [project({ id: "p1" })];
    const subs = {
      p1: [
        { name: "DAS 140 & Confirmation", ownerId: "u1", status: "Completed" },
        { name: "Training Fund", ownerId: "u2", status: "InProgress" }
      ]
    };
    // status InProgress belongs to Training Fund (u2), not DAS 140 — no single subitem matches all
    const result = applyFilters(
      projects,
      subs,
      filters({ subitemStatuses: ["InProgress"], subitemNames: ["DAS 140 & Confirmation"] }),
      null
    );
    expect(result).toHaveLength(0);
  });

  it("search matches project code, name, or subitem name (case-insensitive)", () => {
    const projects = [
      project({ id: "p1", code: "SD-1", name: "Harbor Bridge" }),
      project({ id: "p2", code: "LA-2", name: "Freeway" })
    ];
    const subs = { p2: [{ name: "Special Inspection", ownerId: null, status: "NotStarted" }] };
    expect(applyFilters(projects, subs, filters({ search: "harbor" }), null).map((p) => p.id)).toEqual(["p1"]);
    expect(applyFilters(projects, subs, filters({ search: "la-2" }), null).map((p) => p.id)).toEqual(["p2"]);
    expect(applyFilters(projects, subs, filters({ search: "inspection" }), null).map((p) => p.id)).toEqual(["p2"]);
    expect(applyFilters(projects, subs, filters({ search: "zzz" }), null)).toHaveLength(0);
  });

  it("applies multiple filters together (AND across filter types)", () => {
    const projects = [
      project({ id: "p1", status: "New", ownerId: "u1" }),
      project({ id: "p2", status: "New", ownerId: "u2" }),
      project({ id: "p3", status: "Completed", ownerId: "u1" })
    ];
    const result = applyFilters(
      projects,
      noSubs,
      filters({ statuses: ["New"], ownerIds: ["u1"] }),
      null
    );
    expect(result.map((p) => p.id)).toEqual(["p1"]);
  });

  it("does not mutate the input array", () => {
    const projects = [project({ id: "p2", position: 2 }), project({ id: "p1", position: 1 })];
    const copy = [...projects];
    applyFilters(projects, noSubs, filters({ sort: "position" }), null);
    expect(projects).toEqual(copy);
  });
});

describe("applyFilters — sorting", () => {
  it("sorts by position (manual order) by default", () => {
    const projects = [
      project({ id: "b", position: 2 }),
      project({ id: "a", position: 1 }),
      project({ id: "c", position: 3 })
    ];
    expect(applyFilters(projects, noSubs, filters({ sort: "position" }), null).map((p) => p.id)).toEqual([
      "a",
      "b",
      "c"
    ]);
  });

  it("sorts by name A→Z", () => {
    const projects = [
      project({ id: "1", name: "Charlie" }),
      project({ id: "2", name: "alpha" }),
      project({ id: "3", name: "Bravo" })
    ];
    expect(applyFilters(projects, noSubs, filters({ sort: "name" }), null).map((p) => p.name)).toEqual([
      "alpha",
      "Bravo",
      "Charlie"
    ]);
  });

  it("sorts by code A→Z", () => {
    const projects = [
      project({ id: "1", code: "C-3" }),
      project({ id: "2", code: "A-1" }),
      project({ id: "3", code: "B-2" })
    ];
    expect(applyFilters(projects, noSubs, filters({ sort: "code" }), null).map((p) => p.code)).toEqual([
      "A-1",
      "B-2",
      "C-3"
    ]);
  });

  it("sorts by lastUpdated (most recent first)", () => {
    const projects = [
      project({ id: "old", lastUpdatedAt: "2026-01-01T00:00:00.000Z" }),
      project({ id: "new", lastUpdatedAt: "2026-06-01T00:00:00.000Z" }),
      project({ id: "mid", lastUpdatedAt: "2026-03-01T00:00:00.000Z" })
    ];
    expect(applyFilters(projects, noSubs, filters({ sort: "lastUpdated" }), null).map((p) => p.id)).toEqual([
      "new",
      "mid",
      "old"
    ]);
  });

  it("sorts by timeline start, nulls last", () => {
    const projects = [
      project({ id: "none", timelineStart: null }),
      project({ id: "early", timelineStart: "2026-02-01" }),
      project({ id: "late", timelineStart: "2026-08-01" })
    ];
    expect(applyFilters(projects, noSubs, filters({ sort: "timeline" }), null).map((p) => p.id)).toEqual([
      "early",
      "late",
      "none"
    ]);
  });
});
