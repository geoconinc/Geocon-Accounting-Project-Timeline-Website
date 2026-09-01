import { describe, expect, it } from "vitest";
import { formatCalendarDateShort } from "@/lib/utils";

describe("formatCalendarDateShort", () => {
  it("formats YYYY-MM-DD without UTC day shift", () => {
    expect(formatCalendarDateShort("2026-08-20")).toBe("Aug 20");
    expect(formatCalendarDateShort("2026-08-25")).toBe("Aug 25");
  });
});
