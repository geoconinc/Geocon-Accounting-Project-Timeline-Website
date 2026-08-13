import { describe, it, expect } from "vitest";
import {
  completionDays,
  computeWorkStats,
  daysUntilDue,
  formatDaysMetric,
  formatPctMetric,
  projectsForUser,
  subitemsForUser
} from "@/lib/domain/workStats";
import type { Project, Subitem } from "@/lib/types";

function sub(overrides: Partial<Subitem> = {}): Subitem {
  return {
    id: "s1",
    projectId: "p1",
    name: "Task",
    ownerId: "u1",
    status: "NotStarted",
    dueDate: null,
    dateCompleted: null,
    notes: null,
    position: 0,
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

describe("completionDays", () => {
  it("returns calendar days from created to completed", () => {
    expect(
      completionDays(
        sub({
          status: "Completed",
          createdAt: "2026-01-01T12:00:00.000Z",
          dateCompleted: "2026-01-11"
        })
      )
    ).toBe(10);
  });

  it("returns null when not completed or missing dates", () => {
    expect(completionDays(sub({ status: "InProgress", dateCompleted: "2026-01-11" }))).toBeNull();
    expect(completionDays(sub({ status: "Completed", dateCompleted: null }))).toBeNull();
  });
});

describe("daysUntilDue", () => {
  const today = new Date("2026-03-15T12:00:00.000Z");

  it("counts overdue as negative", () => {
    expect(daysUntilDue(sub({ dueDate: "2026-03-10", status: "InProgress" }), today)).toBe(-5);
  });

  it("ignores completed and NA", () => {
    expect(daysUntilDue(sub({ dueDate: "2026-03-10", status: "Completed" }), today)).toBeNull();
    expect(daysUntilDue(sub({ dueDate: "2026-03-10", status: "NA" }), today)).toBeNull();
  });
});

describe("computeWorkStats", () => {
  const today = new Date("2026-03-15T12:00:00.000Z");

  it("computes completion, overdue, avg days, and on-time rate", () => {
    const stats = computeWorkStats(
      [
        sub({
          id: "a",
          status: "Completed",
          createdAt: "2026-01-01T00:00:00.000Z",
          dateCompleted: "2026-01-11",
          dueDate: "2026-01-15"
        }),
        sub({
          id: "b",
          status: "Completed",
          createdAt: "2026-02-01T00:00:00.000Z",
          dateCompleted: "2026-02-20",
          dueDate: "2026-02-10"
        }),
        sub({ id: "c", status: "InProgress", dueDate: "2026-03-10" }),
        sub({ id: "d", status: "NotStarted", dueDate: "2026-03-20" }),
        sub({ id: "e", status: "NA" })
      ],
      today
    );

    expect(stats.assignedCount).toBe(5);
    expect(stats.completedCount).toBe(2);
    expect(stats.openCount).toBe(2);
    expect(stats.naCount).toBe(1);
    expect(stats.completionPct).toBe(50); // 2/4 non-NA
    expect(stats.overdueCount).toBe(1);
    expect(stats.dueSoonCount).toBe(1); // due in 5 days
    expect(stats.avgCompletionDays).toBe(14.5); // (10 + 19) / 2
    expect(stats.medianCompletionDays).toBe(14.5);
    expect(stats.onTimePct).toBe(50); // 1 of 2 with due dates
    expect(stats.lateCompletedCount).toBe(1);
  });

  it("returns null advanced metrics when no completed work", () => {
    const stats = computeWorkStats([sub({ status: "NotStarted" })], today);
    expect(stats.avgCompletionDays).toBeNull();
    expect(stats.onTimePct).toBeNull();
    expect(stats.completionPct).toBe(0);
  });
});

describe("scoping helpers", () => {
  it("filters subitems and related projects for a user", () => {
    const mine = sub({ id: "mine", ownerId: "u1", projectId: "p1" });
    const theirs = sub({ id: "theirs", ownerId: "u2", projectId: "p2" });
    const led = project({ id: "p3", projectManagerId: "u1" });
    const linked = project({ id: "p1" });
    const other = project({ id: "p2" });

    expect(subitemsForUser([mine, theirs], "u1").map((s) => s.id)).toEqual(["mine"]);
    expect(
      projectsForUser([linked, other, led], "u1", [mine]).map((p) => p.id).sort()
    ).toEqual(["p1", "p3"]);
  });
});

describe("formatters", () => {
  it("formats days and percents", () => {
    expect(formatDaysMetric(null)).toBe("—");
    expect(formatDaysMetric(3)).toBe("3d");
    expect(formatDaysMetric(3.5)).toBe("3.5d");
    expect(formatPctMetric(null)).toBe("—");
    expect(formatPctMetric(80)).toBe("80%");
  });
});
