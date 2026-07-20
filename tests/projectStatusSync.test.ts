import { describe, it, expect } from "vitest";
import {
  deriveProjectStatusPatch,
  deriveProjectActivityPatch
} from "@/lib/domain/projectStatusSync";
import type { Subitem } from "@/lib/types";

function sub(status: Subitem["status"], id = Math.random().toString()): Subitem {
  return {
    id,
    projectId: "p1",
    name: "task",
    ownerId: null,
    status,
    dueDate: null,
    dateCompleted: null,
    notes: null,
    position: 0,
    createdAt: "2026-01-01T00:00:00.000Z"
  };
}

describe("deriveProjectStatusPatch", () => {
  it("returns null for an in-progress project with no subitems", () => {
    expect(deriveProjectStatusPatch({ status: "InProgress", group: "Current" }, [])).toBeNull();
  });

  it("promotes a New project with no subitems to InProgress", () => {
    expect(deriveProjectStatusPatch({ status: "New", group: "Current" }, [])).toEqual({
      status: "InProgress"
    });
  });

  it("marks project Completed when all counted subitems are Completed", () => {
    const patch = deriveProjectStatusPatch({ status: "InProgress", group: "Current" }, [
      sub("Completed"),
      sub("Completed")
    ]);
    expect(patch).toEqual({ status: "Completed", group: "Completed" });
  });

  it("ignores NA subitems when deciding completion", () => {
    const patch = deriveProjectStatusPatch({ status: "InProgress", group: "Current" }, [
      sub("Completed"),
      sub("NA")
    ]);
    expect(patch).toEqual({ status: "Completed", group: "Completed" });
  });

  it("returns null if already Completed and in Completed group", () => {
    expect(
      deriveProjectStatusPatch({ status: "Completed", group: "Completed" }, [sub("Completed")])
    ).toBeNull();
  });

  it("reopens a Completed project when a subitem is no longer complete", () => {
    const patch = deriveProjectStatusPatch({ status: "Completed", group: "Completed" }, [
      sub("Completed"),
      sub("InProgress")
    ]);
    expect(patch).toEqual({ status: "InProgress", group: "Current" });
  });

  it("promotes a New project to InProgress when subitems are not all done", () => {
    const patch = deriveProjectStatusPatch({ status: "New", group: "Current" }, [sub("NotStarted")]);
    expect(patch).toEqual({ status: "InProgress" });
  });

  it("returns null for an all-NA project (nothing counted)", () => {
    expect(
      deriveProjectStatusPatch({ status: "InProgress", group: "Current" }, [sub("NA"), sub("NA")])
    ).toBeNull();
  });
});

describe("deriveProjectActivityPatch", () => {
  it("promotes New → InProgress when non-status fields are edited", () => {
    expect(deriveProjectActivityPatch({ status: "New" }, { notes: "hi" })).toEqual({
      status: "InProgress"
    });
  });

  it("returns null when the project is not New", () => {
    expect(deriveProjectActivityPatch({ status: "InProgress" }, { notes: "hi" })).toBeNull();
  });

  it("returns null when the patch itself sets status", () => {
    expect(deriveProjectActivityPatch({ status: "New" }, { status: "Completed" })).toBeNull();
  });

  it("returns null for an empty patch", () => {
    expect(deriveProjectActivityPatch({ status: "New" }, {})).toBeNull();
  });
});
