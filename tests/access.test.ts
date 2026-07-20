import { describe, it, expect } from "vitest";
import { isSuperAdminEmail, isSuperAdminUser } from "@/lib/auth/superAdmin";

// NEXT_PUBLIC_SUPER_ADMIN_EMAIL is unset in the test env, so the module falls
// back to its default (mundra@geoconinc.com).
describe("isSuperAdminEmail", () => {
  it("matches the configured super admin, case-insensitively", () => {
    expect(isSuperAdminEmail("mundra@geoconinc.com")).toBe(true);
    expect(isSuperAdminEmail("MUNDRA@GEOCONINC.COM")).toBe(true);
  });
  it("rejects other emails and empties", () => {
    expect(isSuperAdminEmail("someone@geoconinc.com")).toBe(false);
    expect(isSuperAdminEmail(null)).toBe(false);
    expect(isSuperAdminEmail(undefined)).toBe(false);
  });
});

describe("isSuperAdminUser", () => {
  it("reads the user's email", () => {
    expect(isSuperAdminUser({ email: "mundra@geoconinc.com" })).toBe(true);
    expect(isSuperAdminUser({ email: "nope@geoconinc.com" })).toBe(false);
    expect(isSuperAdminUser(null)).toBe(false);
  });
});
