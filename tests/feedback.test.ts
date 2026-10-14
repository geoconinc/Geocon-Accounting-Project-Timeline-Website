import { afterAll, describe, expect, it, vi } from "vitest";
import { promises as fs } from "node:fs";

const { tempDataDir } = vi.hoisted(() => {
  const dir = `${process.env.TMPDIR ?? process.env.TEMP ?? "/tmp"}/feedback-test-${Date.now()}`;
  process.env.DATA_DIR = dir;
  return { tempDataDir: dir };
});

import { jsonStore } from "@/lib/storage/jsonStore";
import {
  FEEDBACK_MESSAGE_MAX_LENGTH,
  feedbackResolveSchema,
  feedbackSubmissionSchema,
  normalizeFeedbackCategory
} from "@/lib/domain/feedback";

afterAll(async () => {
  await fs.rm(tempDataDir, { recursive: true, force: true });
});

describe("feedbackSubmissionSchema", () => {
  it("accepts a valid submission and trims the message", () => {
    const result = feedbackSubmissionSchema.parse({
      category: "idea",
      message: "  Add an export button  ",
      pagePath: "/timeline"
    });
    expect(result).toEqual({ category: "idea", message: "Add an export button", pagePath: "/timeline" });
  });

  it("treats a missing or empty page path as null", () => {
    expect(feedbackSubmissionSchema.parse({ category: "bug", message: "x" }).pagePath).toBeNull();
    expect(feedbackSubmissionSchema.parse({ category: "bug", message: "x", pagePath: "" }).pagePath).toBeNull();
  });

  it("rejects blank messages", () => {
    const result = feedbackSubmissionSchema.safeParse({ category: "general", message: "   " });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/enter some feedback/i);
  });

  it("rejects messages over the length limit", () => {
    const result = feedbackSubmissionSchema.safeParse({
      category: "general",
      message: "a".repeat(FEEDBACK_MESSAGE_MAX_LENGTH + 1)
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown categories and non-path page values", () => {
    expect(feedbackSubmissionSchema.safeParse({ category: "praise", message: "x" }).success).toBe(false);
    expect(
      feedbackSubmissionSchema.safeParse({ category: "bug", message: "x", pagePath: "https://evil.example" }).success
    ).toBe(false);
  });

  it("rejects a null body", () => {
    expect(feedbackSubmissionSchema.safeParse(null).success).toBe(false);
  });
});

describe("feedbackResolveSchema", () => {
  it("requires a boolean resolved flag", () => {
    expect(feedbackResolveSchema.safeParse({ resolved: true }).success).toBe(true);
    expect(feedbackResolveSchema.safeParse({ resolved: "yes" }).success).toBe(false);
    expect(feedbackResolveSchema.safeParse({}).success).toBe(false);
  });
});

describe("normalizeFeedbackCategory", () => {
  it("keeps known categories and falls back to general", () => {
    expect(normalizeFeedbackCategory("bug")).toBe("bug");
    expect(normalizeFeedbackCategory("praise")).toBe("general");
    expect(normalizeFeedbackCategory(null)).toBe("general");
  });
});

describe("jsonStore feedback", () => {
  it("creates, lists newest first, and toggles resolved", async () => {
    const first = await jsonStore.createFeedback({
      userId: "u1",
      category: "idea",
      message: "first",
      pagePath: "/"
    });
    await new Promise((r) => setTimeout(r, 5));
    const second = await jsonStore.createFeedback({
      userId: null,
      category: "bug",
      message: "second",
      pagePath: null
    });

    expect(first.resolvedAt).toBeNull();
    expect((await jsonStore.listFeedback()).map((f) => f.id)).toEqual([second.id, first.id]);

    const resolved = await jsonStore.setFeedbackResolved(first.id, true);
    expect(resolved?.resolvedAt).toEqual(expect.any(String));

    const reopened = await jsonStore.setFeedbackResolved(first.id, false);
    expect(reopened?.resolvedAt).toBeNull();

    expect(await jsonStore.setFeedbackResolved("missing", true)).toBeNull();
  });
});
