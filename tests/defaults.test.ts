import { describe, it, expect } from "vitest";
import { DEFAULT_FILTERS, type BoardFilters } from "@/lib/domain/boardFilters";
import { DEFAULT_SUBITEM_NAMES, CPR_SUBITEM_NAME } from "@/lib/domain/projectDefaults";
import { SESSION_COOKIE } from "@/lib/auth/constants";

describe("DEFAULT_FILTERS", () => {
  it("starts with mineOnly on and sort by position", () => {
    expect(DEFAULT_FILTERS.mineOnly).toBe(true);
    expect(DEFAULT_FILTERS.sort).toBe("position");
    expect(DEFAULT_FILTERS.search).toBe("");
    expect(DEFAULT_FILTERS.statuses).toEqual([]);
    expect(DEFAULT_FILTERS.hideCompleted).toBe(false);
  });

  it("has empty array filters for owners and subitems", () => {
    const keys: (keyof BoardFilters)[] = [
      "ownerIds",
      "projectManagerIds",
      "projectDirectorIds",
      "subitemStatuses",
      "subitemNames",
      "subitemOwnerIds"
    ];
    for (const key of keys) {
      expect(DEFAULT_FILTERS[key]).toEqual([]);
    }
  });
});

describe("DEFAULT_SUBITEM_NAMES", () => {
  it("includes the CPR subitem and DAS setup sheet", () => {
    expect(DEFAULT_SUBITEM_NAMES).toContain(CPR_SUBITEM_NAME);
    expect(DEFAULT_SUBITEM_NAMES).toContain("DAS Setup Sheet");
    expect(DEFAULT_SUBITEM_NAMES).toContain("DAS 140 & Confirmation");
  });

  it("has unique names", () => {
    expect(new Set(DEFAULT_SUBITEM_NAMES).size).toBe(DEFAULT_SUBITEM_NAMES.length);
  });
});

describe("SESSION_COOKIE", () => {
  it("is the expected cookie name used by middleware", () => {
    expect(SESSION_COOKIE).toBe("session_token");
  });
});
