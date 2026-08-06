import { describe, it, expect } from "vitest";
import { mapGmsOfficeToTimeline, GMS_OFFICE_CODE_MAP } from "@/lib/domain/gmsOfficeMap";
import { OFFICES } from "@/lib/domain/offices";
import gmsCodes from "@/data/gms-code-list-for-sid.json";

describe("mapGmsOfficeToTimeline", () => {
  it("maps every GMS production office code from the Sid reference list", () => {
    expect(mapGmsOfficeToTimeline("SD")).toBe("San Diego");
    expect(mapGmsOfficeToTimeline("SA")).toBe("Sacramento");
    expect(mapGmsOfficeToTimeline("EB")).toBe("Livermore");
    expect(mapGmsOfficeToTimeline("NB")).toBe("Suisun");
    expect(mapGmsOfficeToTimeline("SJ")).toBe("Stockton");
    expect(mapGmsOfficeToTimeline("RK")).toBe("Rocklin");
    expect(mapGmsOfficeToTimeline("RV")).toBe("Murrieta");
    expect(mapGmsOfficeToTimeline("LA")).toBe("Burbank");
    expect(mapGmsOfficeToTimeline("OC")).toBe("Orange County");
    expect(mapGmsOfficeToTimeline("SB")).toBe("Redlands");
  });

  it("covers every office code in data/gms-code-list-for-sid.json", () => {
    const codes = gmsCodes.offices.map((o) => o.code);
    expect(codes.sort()).toEqual(Object.keys(GMS_OFFICE_CODE_MAP).sort());
    for (const code of codes) {
      expect(mapGmsOfficeToTimeline(code)).not.toBeNull();
    }
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(mapGmsOfficeToTimeline(" sd ")).toBe("San Diego");
    expect(mapGmsOfficeToTimeline("nb")).toBe("Suisun");
  });

  it("returns null for an unmapped code with no usable name", () => {
    expect(mapGmsOfficeToTimeline("ZZ")).toBeNull();
  });

  it("falls back to officeName when it is a valid office", () => {
    expect(mapGmsOfficeToTimeline("ZZ", "San Diego")).toBe("San Diego");
  });

  it("returns null when officeName is not a valid office", () => {
    expect(mapGmsOfficeToTimeline("ZZ", "Nowhere")).toBeNull();
  });

  it("every mapped value is a known timeline office", () => {
    for (const value of Object.values(GMS_OFFICE_CODE_MAP)) {
      expect(OFFICES).toContain(value);
    }
  });
});
