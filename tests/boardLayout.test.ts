import { describe, expect, it } from "vitest";
import { compareByLastName, lastNameSortKey } from "@/lib/domain/userSort";
import { companyForOffice } from "@/lib/domain/companies";
import { OFFICES } from "@/lib/domain/offices";
import {
  DEFAULT_EXPANSION,
  isProjectExpanded,
  parseStoredExpansionMode,
  setAllExpanded,
  toggleProject
} from "@/lib/domain/boardExpansion";

describe("lastNameSortKey / compareByLastName", () => {
  it("handles roster 'Last, First' and display 'First Last' names", () => {
    expect(lastNameSortKey("Aguilar, Jeff D.")).toBe("Aguilar");
    expect(lastNameSortKey("Siddharth Mundra")).toBe("Mundra");
    expect(lastNameSortKey("Cher")).toBe("Cher");
  });

  it("orders mixed name formats by last name", () => {
    const names = ["Siddharth Mundra", "Zorne, Jeremy J.", "Bill Lydon", "Adams, Rupert S.", "kailua mizejewski"];
    expect(names.map((name) => ({ name })).sort(compareByLastName).map((u) => u.name)).toEqual([
      "Adams, Rupert S.",
      "Bill Lydon",
      "kailua mizejewski",
      "Siddharth Mundra",
      "Zorne, Jeremy J."
    ]);
  });

  it("breaks last-name ties by full name", () => {
    const names = ["Rupert Adams", "Jelisa Adams"];
    expect(names.map((name) => ({ name })).sort(compareByLastName).map((u) => u.name)).toEqual([
      "Jelisa Adams",
      "Rupert Adams"
    ]);
  });
});

describe("companyForOffice", () => {
  it("maps every board office to a company", () => {
    for (const office of OFFICES) expect(companyForOffice(office)).not.toBeNull();
  });

  it("follows the GMS office → company list", () => {
    expect(companyForOffice("San Diego")).toBe("INC");
    expect(companyForOffice("Livermore")).toBe("CONSULTANTS");
    expect(companyForOffice("Orange County")).toBe("WEST");
  });

  it("returns null for missing or unknown offices", () => {
    expect(companyForOffice(null)).toBeNull();
    expect(companyForOffice("Atlantis")).toBeNull();
  });
});

describe("board expansion", () => {
  const current = { id: "p1", group: "Current" };
  const completed = { id: "p2", group: "Completed" };

  it("defaults to open except for completed projects", () => {
    expect(isProjectExpanded(DEFAULT_EXPANSION, current)).toBe(true);
    expect(isProjectExpanded(DEFAULT_EXPANSION, completed)).toBe(false);
  });

  it("collapse all / expand all apply to every project", () => {
    expect(isProjectExpanded(setAllExpanded(false), current)).toBe(false);
    expect(isProjectExpanded(setAllExpanded(true), completed)).toBe(true);
  });

  it("toggling one row overrides the board-wide mode until the next collapse/expand all", () => {
    const collapsed = setAllExpanded(false);
    const oneOpen = toggleProject(collapsed, current);
    expect(isProjectExpanded(oneOpen, current)).toBe(true);
    expect(isProjectExpanded(oneOpen, completed)).toBe(false);
    expect(isProjectExpanded(toggleProject(oneOpen, current), current)).toBe(false);
    expect(setAllExpanded(false).overrides).toEqual({});
  });

  it("ignores unknown stored modes", () => {
    expect(parseStoredExpansionMode("allCollapsed")).toBe("allCollapsed");
    expect(parseStoredExpansionMode("bogus")).toBe("default");
    expect(parseStoredExpansionMode(null)).toBe("default");
  });
});
