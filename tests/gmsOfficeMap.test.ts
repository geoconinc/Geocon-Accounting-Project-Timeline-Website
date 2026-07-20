import { describe, it, expect } from "vitest";
import { mapGmsOfficeToTimeline, GMS_OFFICE_CODE_MAP } from "@/lib/domain/gmsOfficeMap";

describe("mapGmsOfficeToTimeline", () => {
  it("maps every known GMS code to a timeline office", () => {
    expect(mapGmsOfficeToTimeline("SD")).toBe("San Diego");
    expect(mapGmsOfficeToTimeline("LA")).toBe("Burbank");
    expect(mapGmsOfficeToTimeline("OC")).toBe("Orange County");
    expect(mapGmsOfficeToTimeline("EB")).toBe("Livermore");
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(mapGmsOfficeToTimeline(" sd ")).toBe("San Diego");
    expect(mapGmsOfficeToTimeline("la")).toBe("Burbank");
  });

  it("returns null for an unmapped code with no usable name", () => {
    expect(mapGmsOfficeToTimeline("SJ")).toBeNull();
    expect(mapGmsOfficeToTimeline("ZZ")).toBeNull();
  });

  it("falls back to officeName when it is a valid office", () => {
    expect(mapGmsOfficeToTimeline("ZZ", "San Diego")).toBe("San Diego");
  });

  it("returns null when officeName is not a valid office", () => {
    expect(mapGmsOfficeToTimeline("ZZ", "Nowhere")).toBeNull();
  });

  it("every mapped value is a non-empty string", () => {
    for (const value of Object.values(GMS_OFFICE_CODE_MAP)) {
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0);
    }
  });
});
