import { describe, it, expect } from "vitest";
import { isOwnerEmail, isOwnerUser, isSuperAdminUser } from "@/lib/auth/superAdmin";

// NEXT_PUBLIC_SUPER_ADMIN_EMAIL is unset in the test env, so the module falls
// back to its default (mundra@geoconinc.com).
describe("isOwnerEmail", () => {
  it("matches the configured owner, case-insensitively", () => {
    expect(isOwnerEmail("mundra@geoconinc.com")).toBe(true);
    expect(isOwnerEmail("MUNDRA@GEOCONINC.COM")).toBe(true);
  });
  it("rejects other emails and empties", () => {
    expect(isOwnerEmail("someone@geoconinc.com")).toBe(false);
    expect(isOwnerEmail(null)).toBe(false);
    expect(isOwnerEmail(undefined)).toBe(false);
  });
});

describe("isOwnerUser", () => {
  it("reads the user's email", () => {
    expect(isOwnerUser({ email: "mundra@geoconinc.com" })).toBe(true);
    expect(isOwnerUser({ email: "nope@geoconinc.com" })).toBe(false);
    expect(isOwnerUser(null)).toBe(false);
  });
});

describe("isSuperAdminUser (deprecated alias)", () => {
  it("still resolves to the owner check", () => {
    expect(isSuperAdminUser({ email: "mundra@geoconinc.com" })).toBe(true);
    expect(isSuperAdminUser({ email: "nope@geoconinc.com" })).toBe(false);
  });
});
