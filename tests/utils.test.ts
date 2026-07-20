import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { initialsFromName, debounce, isoDateDaysAgo, formatRelativeTime, cn } from "@/lib/utils";

describe("initialsFromName", () => {
  it("returns first + last initials, uppercased", () => {
    expect(initialsFromName("Jane Doe")).toBe("JD");
    expect(initialsFromName("jane doe")).toBe("JD");
  });
  it("handles single names", () => {
    expect(initialsFromName("Cher")).toBe("C");
  });
  it("handles multi-part names using first and last", () => {
    expect(initialsFromName("Mary Anne Smith")).toBe("MS");
  });
  it("collapses extra whitespace", () => {
    expect(initialsFromName("  John   Roe  ")).toBe("JR");
  });
  it("returns ? for empty input", () => {
    expect(initialsFromName("")).toBe("?");
  });
});

describe("cn", () => {
  it("merges class names and dedupes tailwind conflicts", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-sm", false && "hidden", "font-bold")).toBe("text-sm font-bold");
  });
});

describe("isoDateDaysAgo", () => {
  it("returns a YYYY-MM-DD string", () => {
    expect(isoDateDaysAgo(0)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it("returns an earlier date for a positive offset", () => {
    expect(isoDateDaysAgo(7) < isoDateDaysAgo(0)).toBe(true);
  });
});

describe("debounce", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("invokes once after rapid calls", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);
    debounced();
    debounced();
    debounced();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("formatRelativeTime", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("formats recent and older times", () => {
    vi.setSystemTime(new Date("2026-01-01T12:00:00.000Z"));
    expect(formatRelativeTime("2026-01-01T11:59:30.000Z")).toBe("just now");
    expect(formatRelativeTime("2026-01-01T11:00:00.000Z")).toBe("1 hour ago");
    expect(formatRelativeTime("2025-12-30T12:00:00.000Z")).toBe("2 days ago");
  });
});
