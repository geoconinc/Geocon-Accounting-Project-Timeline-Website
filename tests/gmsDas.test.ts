import { describe, it, expect } from "vitest";
import {
  gmsDasProjectPatch,
  isDasCompleted,
  normalizeDasStatus
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
      pwCategory: "Public works",
      dasRequired: true,
      dasStatus: "completed",
      dasCompletedAt: "2026-08-01T12:00:00.000Z"
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

describe("gmsDasStatusResponseSchema", () => {
  it("parses the daily pull shape", () => {
    const result = gmsDasStatusResponseSchema.safeParse({
      generatedAt: "2026-08-03T12:00:00Z",
      count: 1,
      projects: [
        {
          projectNumber: "SD-26-0123",
          projectName: "Bridge",
          officeCode: "SD",
          prevailingWage: true,
          pwCategory: "PW",
          dasRequired: true,
          dasStatus: "completed",
          dasCompletedAt: "2026-08-02T18:00:00Z",
          updatedAt: "2026-08-02T18:00:00Z",
          projectManager: { name: "Jane", email: "jane@geoconinc.com" }
        }
      ]
    });
    expect(result.success).toBe(true);
  });
});
