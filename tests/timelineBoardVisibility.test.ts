import { describe, it, expect } from "vitest";
import {
  isGmsImportedProject,
  isVisibleOnTimelineBoard
} from "@/lib/domain/timelineBoardVisibility";
import type { Project } from "@/lib/types";

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

describe("isGmsImportedProject", () => {
  it("detects gmsProposalId", () => {
    expect(isGmsImportedProject(project({ gmsProposalId: "g-1" }))).toBe(true);
  });

  it("detects Imported from GMS notes banner", () => {
    expect(isGmsImportedProject(project({ notes: "Imported from GMS.\nClient: Acme" }))).toBe(
      true
    );
  });

  it("is false for manual projects", () => {
    expect(isGmsImportedProject(project({ notes: "Hand entered" }))).toBe(false);
  });
});

describe("isVisibleOnTimelineBoard", () => {
  it("shows PW or union jobs (mutually exclusive flags)", () => {
    expect(isVisibleOnTimelineBoard(project({ prevailingWage: true, union: false }))).toBe(true);
    expect(isVisibleOnTimelineBoard(project({ prevailingWage: false, union: true }))).toBe(true);
    expect(isVisibleOnTimelineBoard(project({ prevailingWage: false, union: false }))).toBe(false);
    expect(isVisibleOnTimelineBoard(project({ prevailingWage: undefined, union: false }))).toBe(
      false
    );
  });

  it("hides non-PW GMS imports and shows PW or union GMS imports", () => {
    expect(
      isVisibleOnTimelineBoard(
        project({ gmsProposalId: "g-1", prevailingWage: true, notes: "Imported from GMS." })
      )
    ).toBe(true);
    expect(
      isVisibleOnTimelineBoard(
        project({
          gmsProposalId: "g-1",
          prevailingWage: false,
          union: true,
          notes: "Imported from GMS."
        })
      )
    ).toBe(true);
    expect(
      isVisibleOnTimelineBoard(
        project({ gmsProposalId: "g-1", prevailingWage: false, union: false, notes: "Imported from GMS." })
      )
    ).toBe(false);
  });
});
