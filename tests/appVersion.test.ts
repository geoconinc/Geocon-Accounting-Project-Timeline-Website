import { describe, it, expect } from "vitest";
import {
  APP_VERSION,
  formatAppVersion,
  formatAppVersionLabel
} from "@/lib/config/appVersion";

describe("appVersion helpers", () => {
  it("APP_VERSION is a non-empty semver-like string", () => {
    expect(APP_VERSION.length).toBeGreaterThan(0);
    expect(APP_VERSION).toMatch(/^\d+\.\d+/);
  });

  it("formatAppVersion always prefixes a single v", () => {
    expect(formatAppVersion("1.2.3")).toBe("v1.2.3");
    expect(formatAppVersion("v1.2.3")).toBe("v1.2.3");
    expect(formatAppVersion("")).toBe("v0.0.0");
  });

  it("formatAppVersionLabel matches the sidebar / help-menu format", () => {
    expect(formatAppVersionLabel("1.0.0")).toBe("Geocon · v1.0.0");
    expect(formatAppVersionLabel("v2.3.0")).toBe("Geocon · v2.3.0");
  });

  it("default helpers agree with each other", () => {
    expect(formatAppVersionLabel()).toBe(`Geocon · ${formatAppVersion()}`);
    expect(formatAppVersion()).toBe(formatAppVersion(APP_VERSION));
  });
});
