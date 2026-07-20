import { describe, it, expect, afterEach } from "vitest";
import {
  geoconEmail,
  dateOnly,
  buildGmsNotes,
  gmsProjectPayloadSchema,
  type GmsProjectPayload
} from "@/lib/domain/gmsProjectPayload";

const ORIGINAL = process.env.ALLOWED_EMAIL_DOMAIN;
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.ALLOWED_EMAIL_DOMAIN;
  else process.env.ALLOWED_EMAIL_DOMAIN = ORIGINAL;
});

function validPayload(overrides: Partial<GmsProjectPayload> = {}): GmsProjectPayload {
  return {
    projectNumber: "SD-100",
    projectName: "Harbor",
    officeCode: "SD",
    projectManager: { name: "PM", email: "pm@geoconinc.com" },
    projectDirector: { name: "PD", email: "pd@geoconinc.com" },
    ...overrides
  };
}

describe("geoconEmail", () => {
  it("accepts emails on the default geoconinc.com domain", () => {
    expect(geoconEmail("pm@geoconinc.com")).toBe(true);
    expect(geoconEmail("  PM@GEOCONINC.COM  ")).toBe(true);
  });

  it("rejects other domains", () => {
    expect(geoconEmail("pm@gmail.com")).toBe(false);
    expect(geoconEmail("not-an-email")).toBe(false);
  });
});

describe("dateOnly", () => {
  it("returns null for empty/undefined", () => {
    expect(dateOnly(undefined)).toBeNull();
    expect(dateOnly("")).toBeNull();
  });

  it("extracts YYYY-MM-DD from an ISO-ish prefix", () => {
    expect(dateOnly("2026-07-20T12:00:00Z")).toBe("2026-07-20");
    expect(dateOnly("2026-07-20")).toBe("2026-07-20");
  });

  it("returns null for unparseable strings", () => {
    expect(dateOnly("not-a-date")).toBeNull();
  });
});

describe("buildGmsNotes", () => {
  it("always starts with the import banner", () => {
    expect(buildGmsNotes(validPayload())).toBe("Imported from GMS.");
  });

  it("includes optional fields when present", () => {
    const notes = buildGmsNotes(
      validPayload({
        proposalNumber: "P-9",
        gmsProposalId: "g-1",
        clientName: "Acme",
        company: "Geocon",
        feeEstimate: 1500
      })
    );
    expect(notes).toContain("Proposal #: P-9");
    expect(notes).toContain("GMS proposal ID: g-1");
    expect(notes).toContain("Client: Acme");
    expect(notes).toContain("Company: Geocon");
    expect(notes).toContain("Fee estimate: $");
  });
});

describe("gmsProjectPayloadSchema", () => {
  it("accepts a minimal valid payload", () => {
    const result = gmsProjectPayloadSchema.safeParse(validPayload());
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const result = gmsProjectPayloadSchema.safeParse({ projectNumber: "X" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid person emails", () => {
    const result = gmsProjectPayloadSchema.safeParse(
      validPayload({
        projectManager: { name: "PM", email: "not-an-email" }
      })
    );
    expect(result.success).toBe(false);
  });

  it("rejects empty projectNumber / projectName / officeCode", () => {
    expect(gmsProjectPayloadSchema.safeParse(validPayload({ projectNumber: "" })).success).toBe(
      false
    );
    expect(gmsProjectPayloadSchema.safeParse(validPayload({ projectName: "" })).success).toBe(
      false
    );
    expect(gmsProjectPayloadSchema.safeParse(validPayload({ officeCode: "" })).success).toBe(
      false
    );
  });
});
