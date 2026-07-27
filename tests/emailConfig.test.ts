import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/server/site-data/emailConfigStore", () => ({
  readStoredNotificationConfig: vi.fn()
}));

import { readStoredNotificationConfig } from "@/lib/server/site-data/emailConfigStore";
import {
  getEffectiveNotificationConfig,
  isCategoryEnabled,
  type ResolvedNotificationConfig
} from "@/lib/notifications/emailConfig";
import { renderEmailTemplate } from "@/lib/notifications/templateEngine";
import { defaultEventToggles, defaultTemplates } from "@/lib/notifications/emailConfigTypes";

const mockRead = vi.mocked(readStoredNotificationConfig);

beforeEach(() => {
  mockRead.mockReset();
  mockRead.mockResolvedValue(null);
});

describe("getEffectiveNotificationConfig", () => {
  it("returns all-enabled toggles and default templates when nothing is stored", async () => {
    const cfg = await getEffectiveNotificationConfig();
    expect(cfg.emailEnabled).toBe(true);
    expect(cfg.eventToggles.projectCreated).toBe(true);
    expect(cfg.templates.subitemAssigned.subject).toBe(defaultTemplates().subitemAssigned.subject);
  });

  it("defaults emailEnabled to true and respects an explicit false", async () => {
    expect((await getEffectiveNotificationConfig()).emailEnabled).toBe(true);
    mockRead.mockResolvedValue({ emailEnabled: false });
    expect((await getEffectiveNotificationConfig()).emailEnabled).toBe(false);
  });

  it("merges stored event toggles over the all-enabled defaults", async () => {
    mockRead.mockResolvedValue({ eventToggles: { manualMessage: false } });
    const cfg = await getEffectiveNotificationConfig();
    expect(cfg.eventToggles.manualMessage).toBe(false);
    expect(cfg.eventToggles.projectCreated).toBe(true);
  });

  it("defaults test mode off with a single fallback recipient", async () => {
    const cfg = await getEffectiveNotificationConfig();
    expect(cfg.testMode).toBe(false);
    expect(cfg.testRecipients).toHaveLength(1);
  });

  it("reads test mode and cleans/dedupes stored test recipients", async () => {
    mockRead.mockResolvedValue({
      testMode: true,
      testRecipients: ["  Test@Geoconinc.com ", "test@geoconinc.com", ""]
    });
    const cfg = await getEffectiveNotificationConfig();
    expect(cfg.testMode).toBe(true);
    expect(cfg.testRecipients).toEqual(["test@geoconinc.com"]);
  });

  it("falls back to the owner when test mode is on but no recipient is set", async () => {
    mockRead.mockResolvedValue({ testMode: true, testRecipients: [] });
    const cfg = await getEffectiveNotificationConfig();
    expect(cfg.testRecipients).toHaveLength(1);
  });

  it("overrides only the provided template fields and keeps defaults otherwise", async () => {
    mockRead.mockResolvedValue({
      templates: { subitemAssigned: { subject: "Custom: {{subitemName}}" } }
    });
    const cfg = await getEffectiveNotificationConfig();
    expect(cfg.templates.subitemAssigned.subject).toBe("Custom: {{subitemName}}");
    expect(cfg.templates.subitemAssigned.body).toBe(defaultTemplates().subitemAssigned.body);
  });

  it("ignores blank template overrides and falls back to the default", async () => {
    mockRead.mockResolvedValue({
      templates: { subitemAssigned: { subject: "   ", body: "" } }
    });
    const cfg = await getEffectiveNotificationConfig();
    expect(cfg.templates.subitemAssigned.subject).toBe(defaultTemplates().subitemAssigned.subject);
    expect(cfg.templates.subitemAssigned.body).toBe(defaultTemplates().subitemAssigned.body);
  });
});

describe("isCategoryEnabled", () => {
  function cfg(overrides: Partial<ResolvedNotificationConfig> = {}): ResolvedNotificationConfig {
    return {
      emailEnabled: true,
      testMode: false,
      testRecipients: ["owner@example.com"],
      eventToggles: defaultEventToggles(),
      templates: defaultTemplates(),
      ...overrides
    };
  }

  it("is false when email is globally disabled", () => {
    expect(isCategoryEnabled(cfg({ emailEnabled: false }), "manualMessage")).toBe(false);
  });

  it("is false when the specific category is disabled", () => {
    expect(
      isCategoryEnabled(cfg({ eventToggles: { ...defaultEventToggles(), manualMessage: false } }), "manualMessage")
    ).toBe(false);
  });

  it("is true for an enabled category and for an undefined category", () => {
    expect(isCategoryEnabled(cfg(), "manualMessage")).toBe(true);
    expect(isCategoryEnabled(cfg(), undefined)).toBe(true);
  });
});

describe("renderEmailTemplate", () => {
  it("substitutes tokens, leaving the subject raw and escaping the body", async () => {
    const mail = await renderEmailTemplate(
      "subitemAssigned",
      { headline: "Task", ctaLabel: "Open" },
      {
        text: {
          firstName: "Jane",
          actorName: "A&B",
          subitemName: "<x>",
          projectCode: "P-1",
          projectName: "Proj"
        }
      }
    );
    expect(mail.subject).toContain("P-1");
    expect(mail.subject).toContain("<x>");
    expect(mail.html).toContain("&lt;x&gt;");
    expect(mail.html).toContain("A&amp;B");
    expect(mail.message).toContain("Jane");
  });

  it("applies a stored subject override", async () => {
    mockRead.mockResolvedValue({
      templates: { subitemAssigned: { subject: "Hey {{firstName}}" } }
    });
    const mail = await renderEmailTemplate(
      "subitemAssigned",
      { headline: "T", ctaLabel: "O" },
      { text: { firstName: "Jane" } }
    );
    expect(mail.subject).toBe("Hey Jane");
  });

  it("expands HTML tokens verbatim in the body but plain text in the in-app message", async () => {
    const mail = await renderEmailTemplate(
      "assigneeDigest",
      { headline: "T", ctaLabel: "O" },
      {
        text: {
          firstName: "Jane",
          creatorName: "C",
          projectCode: "P",
          projectName: "N",
          office: "SD"
        },
        html: { taskList: "<ul><li>Item</li></ul>" },
        plain: { taskList: "Item" }
      }
    );
    expect(mail.html).toContain("<ul><li>Item</li></ul>");
    expect(mail.message).toContain("Item");
    expect(mail.message).not.toContain("<ul>");
  });
});
