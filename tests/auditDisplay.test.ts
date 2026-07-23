import { describe, it, expect } from "vitest";
import { resolveAuditEntityName } from "@/lib/server/auditDisplay";

describe("resolveAuditEntityName", () => {
  it("prefers live project name, then code, then payload snapshot", () => {
    const names = new Map([["p1", "Harbor"]]);
    const codes = new Map([["p1", "SD-1"]]);
    expect(
      resolveAuditEntityName({
        entityType: "project",
        entityId: "p1",
        payload: {},
        projectNameById: names,
        projectCodeById: codes
      })
    ).toBe("Harbor");

    expect(
      resolveAuditEntityName({
        entityType: "project",
        entityId: "gone",
        payload: { name: "Deleted Proj", code: "X-1" },
        projectNameById: names,
        projectCodeById: codes
      })
    ).toBe("Deleted Proj");
  });

  it("uses subitem / file payload snapshots after hard delete", () => {
    expect(
      resolveAuditEntityName({
        entityType: "subitem",
        entityId: "s1",
        payload: { name: "DAS 140 & Confirmation" }
      })
    ).toBe("DAS 140 & Confirmation");

    expect(
      resolveAuditEntityName({
        entityType: "file",
        entityId: "f1",
        payload: { filename: "plans.kmz" }
      })
    ).toBe("plans.kmz");
  });

  it("falls back to a short id when nothing else is available", () => {
    expect(
      resolveAuditEntityName({
        entityType: "subitem",
        entityId: "abcdef12-3456-7890",
        payload: {}
      })
    ).toBe("abcdef12");
  });
});
