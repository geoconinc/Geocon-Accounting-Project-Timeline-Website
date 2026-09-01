import { describe, it, expect } from "vitest";
import {
  gmsDasProjectPatch,
  gmsImportLockedFieldsInPatch,
  gmsOwnedFieldsInPatch,
  gmsOwnedSubitemFieldsInPatch,
  isDasCompleted,
  isGmsManagedSubitemName,
  mapGmsDasFormToSubitemPatch,
  normalizeDasStatus,
  normalizePayrollCycle,
  normalizePrevailingWageType,
  resolvePrevailingWageFromGms,
  resolveUnionFromGms,
  isTimelineTrackedJobFromGms
} from "@/lib/domain/gmsDas";
import { gmsProjectPayloadSchema } from "@/lib/domain/gmsProjectPayload";
import { gmsDasStatusResponseSchema } from "@/lib/server/integrations/gmsDasStatusClient";

describe("normalizeDasStatus", () => {
  it("normalizes known values", () => {
    expect(normalizeDasStatus("completed")).toBe("completed");
    expect(normalizeDasStatus("Completed")).toBe("completed");
    expect(normalizeDasStatus("not_completed")).toBe("not_completed");
    expect(normalizeDasStatus("not-completed")).toBe("not_completed");
  });

  it("returns null for blank", () => {
    expect(normalizeDasStatus(null)).toBeNull();
    expect(normalizeDasStatus("  ")).toBeNull();
  });
});

describe("isDasCompleted", () => {
  it("is true only for completed", () => {
    expect(isDasCompleted("completed")).toBe(true);
    expect(isDasCompleted("not_completed")).toBe(false);
    expect(isDasCompleted(undefined)).toBe(false);
  });
});

describe("prevailingWageType / union mapping", () => {
  it("maps yes/union/no", () => {
    expect(normalizePrevailingWageType("yes")).toBe("yes");
    expect(normalizePrevailingWageType("UNION")).toBe("union");
    expect(normalizePrevailingWageType("no")).toBe("no");
  });

  it("resolves PW checkbox (non-union only)", () => {
    expect(resolvePrevailingWageFromGms({ prevailingWageType: "yes" })).toBe(true);
    expect(resolvePrevailingWageFromGms({ prevailingWageType: "union" })).toBe(false);
    expect(resolvePrevailingWageFromGms({ prevailingWageType: "no" })).toBe(false);
    expect(resolvePrevailingWageFromGms({ prevailingWage: true })).toBe(true);
    expect(resolvePrevailingWageFromGms({ union: true })).toBe(false);
    expect(resolvePrevailingWageFromGms({})).toBeUndefined();
  });

  it("tracks board jobs for PW or union", () => {
    expect(isTimelineTrackedJobFromGms({ prevailingWageType: "yes" })).toBe(true);
    expect(isTimelineTrackedJobFromGms({ prevailingWageType: "union" })).toBe(true);
    expect(isTimelineTrackedJobFromGms({ prevailingWageType: "no" })).toBe(false);
    expect(isTimelineTrackedJobFromGms({ union: true })).toBe(true);
    expect(isTimelineTrackedJobFromGms({ prevailingWage: true })).toBe(true);
  });

  it("resolves union from type or boolean", () => {
    expect(resolveUnionFromGms({ prevailingWageType: "union" })).toBe(true);
    expect(resolveUnionFromGms({ prevailingWageType: "yes" })).toBe(false);
    expect(resolveUnionFromGms({ union: true })).toBe(true);
    expect(resolveUnionFromGms({ prevailingWageType: "yes", union: true })).toBe(true);
  });
});

describe("payroll cycle", () => {
  it("normalizes weekly / biweekly variants", () => {
    expect(normalizePayrollCycle("weekly")).toBe("weekly");
    expect(normalizePayrollCycle("Bi-Weekly")).toBe("biweekly");
    expect(normalizePayrollCycle("bi_weekly")).toBe("biweekly");
    expect(normalizePayrollCycle("nope")).toBeNull();
  });
});

describe("mapGmsDasFormToSubitemPatch", () => {
  it("maps filed/completed with filedAt", () => {
    expect(mapGmsDasFormToSubitemPatch("filed", "2026-08-15T12:00:00Z")).toEqual({
      status: "Completed",
      dateCompleted: "2026-08-15"
    });
  });

  it("maps not_completed / in_progress / missing / na", () => {
    expect(mapGmsDasFormToSubitemPatch("not_completed", null)?.status).toBe("NotStarted");
    expect(mapGmsDasFormToSubitemPatch("in_progress", null)?.status).toBe("InProgress");
    expect(mapGmsDasFormToSubitemPatch("missing", null)?.status).toBe("Missing");
    expect(mapGmsDasFormToSubitemPatch("n/a", null)?.status).toBe("NA");
  });

  it("returns null when status is blank", () => {
    expect(mapGmsDasFormToSubitemPatch(null, null)).toBeNull();
    expect(mapGmsDasFormToSubitemPatch("  ", null)).toBeNull();
  });
});

describe("gmsDasProjectPatch", () => {
  it("only includes provided fields and normalizes status/category", () => {
    expect(gmsDasProjectPatch({})).toEqual({});
    expect(
      gmsDasProjectPatch({
        prevailingWage: true,
        pwCategory: "  Public works  ",
        dasRequired: true,
        dasStatus: "Completed",
        dasCompletedAt: "2026-08-01T12:00:00.000Z"
      })
    ).toEqual({
      prevailingWage: true,
      union: false,
      pwCategory: "Public works",
      dasRequired: true,
      dasStatus: "completed",
      dasCompletedAt: "2026-08-01T12:00:00.000Z"
    });
  });

  it("maps William's extended fields", () => {
    expect(
      gmsDasProjectPatch({
        prevailingWageType: "union",
        union: true,
        dirNumber: " 12345 ",
        dirContractNumber: "C-9",
        payrollCycle: "Weekly",
        das140Status: "filed",
        das140FiledAt: "2026-08-10"
      })
    ).toEqual({
      prevailingWage: false,
      prevailingWageType: "union",
      union: true,
      dirNumber: "12345",
      dirContractNumber: "C-9",
      payrollCycle: "weekly"
    });
  });

  it("PW type yes clears union", () => {
    expect(gmsDasProjectPatch({ prevailingWageType: "yes", union: true })).toEqual({
      prevailingWageType: "yes",
      prevailingWage: true,
      union: false
    });
  });
});

describe("gmsProjectPayloadSchema — DAS fields", () => {
  const base = {
    projectNumber: "SD-26-0123",
    projectName: "Test",
    officeCode: "SD",
    projectManager: { name: "PM", email: "pm@geoconinc.com" },
    projectDirector: { name: "PD", email: "pd@geoconinc.com" }
  };

  it("accepts payloads without DAS fields (backward compatible)", () => {
    expect(gmsProjectPayloadSchema.safeParse(base).success).toBe(true);
  });

  it("accepts William's prevailing-wage / DAS fields", () => {
    const result = gmsProjectPayloadSchema.safeParse({
      ...base,
      prevailingWage: true,
      pwCategory: "DIR",
      dasRequired: true,
      dasStatus: "not_completed",
      dasCompletedAt: null
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.prevailingWage).toBe(true);
      expect(result.data.dasStatus).toBe("not_completed");
    }
  });

  it("accepts prevailingWageType, DIR, DAS 140/142, payrollCycle", () => {
    const result = gmsProjectPayloadSchema.safeParse({
      ...base,
      prevailingWageType: "yes",
      union: false,
      dirNumber: "998877",
      dirContractNumber: "DC-1",
      das140Status: "filed",
      das140FiledAt: "2026-08-01T00:00:00Z",
      das142Status: "not_completed",
      das142FiledAt: null,
      payrollCycle: "biweekly"
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.prevailingWageType).toBe("yes");
      expect(result.data.dirNumber).toBe("998877");
      expect(result.data.das140Status).toBe("filed");
      expect(result.data.payrollCycle).toBe("biweekly");
    }
  });

  it("still parses non-prevailing-wage payloads (route skips them)", () => {
    const result = gmsProjectPayloadSchema.safeParse({
      ...base,
      prevailingWage: false
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.prevailingWage).toBe(false);
  });

  it("coerces string/number prevailingWage wire forms from GMS", () => {
    const yes = gmsProjectPayloadSchema.safeParse({ ...base, prevailingWage: "yes" });
    expect(yes.success).toBe(true);
    if (yes.success) expect(yes.data.prevailingWage).toBe(true);

    const no = gmsProjectPayloadSchema.safeParse({ ...base, prevailingWage: "0" });
    expect(no.success).toBe(true);
    if (no.success) expect(no.data.prevailingWage).toBe(false);
  });
});

describe("GMS field locks", () => {
  it("flags GMS-owned project fields in a patch", () => {
    expect(gmsOwnedFieldsInPatch({ notes: "x", union: true, dirNumber: "1" })).toEqual([
      "dirNumber",
      "union"
    ]);
  });

  it("flags import-locked fields only when gmsProposalId is set", () => {
    expect(gmsImportLockedFieldsInPatch({ name: "A", code: "B" }, {})).toEqual([]);
    expect(
      gmsImportLockedFieldsInPatch({ name: "A", code: "B", status: "New" }, { gmsProposalId: "g1" })
    ).toEqual(["code", "name"]);
  });

  it("locks status/dateCompleted on DAS Setup / 140 / 142", () => {
    expect(isGmsManagedSubitemName("DAS 140 & Confirmation")).toBe(true);
    expect(gmsOwnedSubitemFieldsInPatch("DAS 140 & Confirmation", { status: "Completed" })).toEqual([
      "status"
    ]);
    expect(gmsOwnedSubitemFieldsInPatch("Training Fund", { status: "Completed" })).toEqual([]);
  });
});

describe("gmsDasStatusResponseSchema", () => {
  it("parses the daily pull shape including new fields", () => {
    const result = gmsDasStatusResponseSchema.safeParse({
      generatedAt: "2026-08-03T12:00:00Z",
      count: 1,
      projects: [
        {
          projectNumber: "SD-26-0123",
          projectName: "Bridge",
          officeCode: "SD",
          prevailingWage: true,
          prevailingWageType: "yes",
          union: false,
          dirNumber: "111",
          pwCategory: "PW",
          dasRequired: true,
          dasStatus: "completed",
          dasCompletedAt: "2026-08-02T18:00:00Z",
          das140Status: "filed",
          das140FiledAt: "2026-08-01T00:00:00Z",
          das142Status: "not_completed",
          updatedAt: "2026-08-02T18:00:00Z",
          projectManager: { name: "Jane", email: "jane@geoconinc.com" }
        }
      ]
    });
    expect(result.success).toBe(true);
  });
});
