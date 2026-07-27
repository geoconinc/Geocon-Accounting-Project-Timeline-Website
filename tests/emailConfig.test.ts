import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/lib/server/site-data/emailConfigStore", () => ({
  readStoredEmailConfig: vi.fn()
}));

import { readStoredEmailConfig } from "@/lib/server/site-data/emailConfigStore";
import { getEffectiveEmailConfig, isCategoryEnabled } from "@/lib/notifications/emailConfig";
import { encryptSecret } from "@/lib/server/crypto/secretBox";
import type { StoredEmailConfig } from "@/lib/server/site-data/emailConfigStore";

const mockRead = vi.mocked(readStoredEmailConfig);

const EMAIL_ENV_KEYS = [
  "EMAIL_DRIVER",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "NOTIFY_FROM_ADDRESS",
  "NOTIFY_FROM_NAME",
  "GRAPH_APP_TENANT_ID",
  "GRAPH_APP_CLIENT_ID",
  "GRAPH_APP_CLIENT_SECRET",
  "CONFIG_ENCRYPTION_KEY"
] as const;

const original: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of EMAIL_ENV_KEYS) {
    original[k] = process.env[k];
    delete process.env[k];
  }
  mockRead.mockReset();
  mockRead.mockResolvedValue(null);
});

afterEach(() => {
  for (const k of EMAIL_ENV_KEYS) {
    if (original[k] === undefined) delete process.env[k];
    else process.env[k] = original[k];
  }
});

describe("getEffectiveEmailConfig — environment fallback", () => {
  it("uses SMTP env vars and picks the smtp driver when auto and SMTP is ready", async () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_USER = "user";
    process.env.SMTP_PASSWORD = "pass";
    process.env.NOTIFY_FROM_ADDRESS = "from@example.com";

    const cfg = await getEffectiveEmailConfig();
    expect(cfg.driver).toBe("smtp");
    expect(cfg.smtpHost).toBe("smtp.example.com");
    expect(cfg.smtpPassword).toBe("pass");
    expect(cfg.smtpPort).toBe(587);
    expect(cfg.fromName).toBe("Geocon Project Management");
  });

  it("falls back to the graph driver when SMTP is not fully configured", async () => {
    process.env.SMTP_HOST = "smtp.example.com"; // missing user/password
    const cfg = await getEffectiveEmailConfig();
    expect(cfg.driver).toBe("graph");
  });

  it("respects an explicit EMAIL_DRIVER even when SMTP is ready", async () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_USER = "user";
    process.env.SMTP_PASSWORD = "pass";
    process.env.EMAIL_DRIVER = "graph";
    const cfg = await getEffectiveEmailConfig();
    expect(cfg.driver).toBe("graph");
  });
});

describe("getEffectiveEmailConfig — stored config overrides", () => {
  it("prefers stored non-secret values over env", async () => {
    process.env.SMTP_HOST = "env-host";
    process.env.NOTIFY_FROM_NAME = "Env Name";
    mockRead.mockResolvedValue({
      smtpHost: "db-host",
      smtpUser: "db-user",
      fromName: "DB Name",
      smtpPort: 2525,
      smtpSecure: true
    } satisfies StoredEmailConfig);

    const cfg = await getEffectiveEmailConfig();
    expect(cfg.smtpHost).toBe("db-host");
    expect(cfg.fromName).toBe("DB Name");
    expect(cfg.smtpPort).toBe(2525);
    expect(cfg.smtpSecure).toBe(true);
  });

  it("decrypts a stored SMTP password", async () => {
    process.env.CONFIG_ENCRYPTION_KEY = "test-key";
    mockRead.mockResolvedValue({
      smtpHost: "db-host",
      smtpUser: "db-user",
      smtpPasswordEnc: encryptSecret("db-secret")
    });

    const cfg = await getEffectiveEmailConfig();
    expect(cfg.smtpPassword).toBe("db-secret");
    expect(cfg.driver).toBe("smtp");
  });

  it("honours an explicit stored driver", async () => {
    mockRead.mockResolvedValue({ driver: "graph" });
    const cfg = await getEffectiveEmailConfig();
    expect(cfg.driver).toBe("graph");
  });

  it("defaults emailEnabled to true and respects an explicit false", async () => {
    expect((await getEffectiveEmailConfig()).emailEnabled).toBe(true);
    mockRead.mockResolvedValue({ emailEnabled: false });
    expect((await getEffectiveEmailConfig()).emailEnabled).toBe(false);
  });

  it("merges stored event toggles over the all-enabled defaults", async () => {
    mockRead.mockResolvedValue({ eventToggles: { manualMessage: false } });
    const cfg = await getEffectiveEmailConfig();
    expect(cfg.eventToggles.manualMessage).toBe(false);
    expect(cfg.eventToggles.projectCreated).toBe(true);
  });
});

describe("isCategoryEnabled", () => {
  const base = {
    driver: "smtp" as const,
    smtpHost: null,
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: null,
    smtpPassword: null,
    fromAddress: null,
    fromName: "x",
    graphTenantId: null,
    graphClientId: null,
    graphClientSecret: null
  };

  it("is false when email is globally disabled", () => {
    const cfg = {
      ...base,
      emailEnabled: false,
      eventToggles: { manualMessage: true } as never
    };
    expect(isCategoryEnabled(cfg as never, "manualMessage")).toBe(false);
  });

  it("is false when the specific category is disabled", () => {
    const cfg = {
      ...base,
      emailEnabled: true,
      eventToggles: { manualMessage: false } as never
    };
    expect(isCategoryEnabled(cfg as never, "manualMessage")).toBe(false);
  });

  it("is true for an enabled category and for an undefined category", () => {
    const cfg = {
      ...base,
      emailEnabled: true,
      eventToggles: { manualMessage: true } as never
    };
    expect(isCategoryEnabled(cfg as never, "manualMessage")).toBe(true);
    expect(isCategoryEnabled(cfg as never, undefined)).toBe(true);
  });
});
