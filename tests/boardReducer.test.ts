import { describe, it, expect } from "vitest";
import { boardReducer, type BoardData } from "@/components/features/board/state";
import type { FileRef, Project, Subitem, User } from "@/lib/types";

function empty(): BoardData {
  return { projects: [], subitems: [], users: [], files: [], me: "u1" };
}

function project(id: string, overrides: Partial<Project> = {}): Project {
  return {
    id,
    code: id,
    name: `Project ${id}`,
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

function subitem(id: string, projectId: string): Subitem {
  return {
    id,
    projectId,
    name: "Task",
    ownerId: null,
    status: "NotStarted",
    dueDate: null,
    dateCompleted: null,
    notes: null,
    position: 0,
    createdAt: "2026-01-01T00:00:00.000Z"
  };
}

function file(id: string, parentType: FileRef["parentType"], parentId: string): FileRef {
  return {
    id,
    parentType,
    parentId,
    filename: "a.pdf",
    contentType: "application/pdf",
    size: 10,
    uploadedBy: "u1",
    uploadedAt: "2026-01-01T00:00:00.000Z"
  };
}

function user(id: string): User {
  return {
    id,
    email: `${id}@geoconinc.com`,
    name: id,
    initials: "X",
    createdAt: "2026-01-01T00:00:00.000Z"
  };
}

describe("boardReducer", () => {
  it("set replaces the whole board", () => {
    const next = boardReducer(empty(), {
      type: "set",
      data: { ...empty(), me: "u2", projects: [project("p1")] }
    });
    expect(next.me).toBe("u2");
    expect(next.projects).toHaveLength(1);
  });

  it("upsertProject inserts then updates in place", () => {
    let state = boardReducer(empty(), { type: "upsertProject", project: project("p1") });
    expect(state.projects).toHaveLength(1);
    state = boardReducer(state, {
      type: "upsertProject",
      project: project("p1", { name: "Renamed" })
    });
    expect(state.projects).toHaveLength(1);
    expect(state.projects[0].name).toBe("Renamed");
  });

  it("deleteProject cascades to subitems and related files", () => {
    const state: BoardData = {
      ...empty(),
      projects: [project("p1"), project("p2")],
      subitems: [subitem("s1", "p1"), subitem("s2", "p2")],
      files: [
        file("f1", "project", "p1"),
        file("f2", "subitem", "s1"),
        file("f3", "project", "p2")
      ]
    };
    const next = boardReducer(state, { type: "deleteProject", id: "p1" });
    expect(next.projects.map((p) => p.id)).toEqual(["p2"]);
    expect(next.subitems.map((s) => s.id)).toEqual(["s2"]);
    expect(next.files.map((f) => f.id)).toEqual(["f3"]);
  });

  it("upsertSubitem inserts and updates", () => {
    let state = boardReducer(empty(), { type: "upsertSubitem", subitem: subitem("s1", "p1") });
    state = boardReducer(state, {
      type: "upsertSubitem",
      subitem: { ...subitem("s1", "p1"), name: "Updated" }
    });
    expect(state.subitems).toHaveLength(1);
    expect(state.subitems[0].name).toBe("Updated");
  });

  it("deleteSubitem removes the subitem and its files", () => {
    const state: BoardData = {
      ...empty(),
      subitems: [subitem("s1", "p1"), subitem("s2", "p1")],
      files: [file("f1", "subitem", "s1"), file("f2", "subitem", "s2")]
    };
    const next = boardReducer(state, { type: "deleteSubitem", id: "s1" });
    expect(next.subitems.map((s) => s.id)).toEqual(["s2"]);
    expect(next.files.map((f) => f.id)).toEqual(["f2"]);
  });

  it("setSubitems replaces only that project's subitems", () => {
    const state: BoardData = {
      ...empty(),
      subitems: [subitem("s1", "p1"), subitem("s2", "p2")]
    };
    const next = boardReducer(state, {
      type: "setSubitems",
      projectId: "p1",
      subitems: [subitem("s3", "p1")]
    });
    expect(next.subitems.map((s) => s.id).sort()).toEqual(["s2", "s3"]);
  });

  it("addFile / deleteFile manage the files list", () => {
    let state = boardReducer(empty(), { type: "addFile", file: file("f1", "project", "p1") });
    expect(state.files).toHaveLength(1);
    state = boardReducer(state, { type: "deleteFile", id: "f1" });
    expect(state.files).toHaveLength(0);
  });

  it("addUser is idempotent by id", () => {
    let state = boardReducer(empty(), { type: "addUser", user: user("u1") });
    state = boardReducer(state, { type: "addUser", user: user("u1") });
    expect(state.users).toHaveLength(1);
    state = boardReducer(state, { type: "addUser", user: user("u2") });
    expect(state.users).toHaveLength(2);
  });
});
