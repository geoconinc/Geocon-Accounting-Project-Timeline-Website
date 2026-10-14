import { z } from "zod";
import type { Feedback, FeedbackCategory } from "@/lib/types";

export const FEEDBACK_CATEGORIES = ["idea", "bug", "general"] as const satisfies readonly FeedbackCategory[];

export const FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  idea: "Idea / request",
  bug: "Something's broken",
  general: "General comment"
};

export const FEEDBACK_MESSAGE_MAX_LENGTH = 5000;
const PAGE_PATH_MAX_LENGTH = 500;

export const feedbackSubmissionSchema = z.object({
  category: z.enum(FEEDBACK_CATEGORIES),
  message: z
    .string()
    .trim()
    .min(1, "Please enter some feedback.")
    .max(FEEDBACK_MESSAGE_MAX_LENGTH, `Feedback must be ${FEEDBACK_MESSAGE_MAX_LENGTH} characters or fewer.`),
  pagePath: z
    .preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? null : v),
      z.string().trim().max(PAGE_PATH_MAX_LENGTH).startsWith("/").nullish()
    )
    .transform((v) => v ?? null)
});

export type FeedbackSubmission = z.infer<typeof feedbackSubmissionSchema>;

export const feedbackResolveSchema = z.object({ resolved: z.boolean() });

/** Feedback as returned to the admin panel, with the submitter resolved for display. */
export interface AdminFeedbackEntry extends Feedback {
  submitterName: string;
  submitterEmail: string | null;
}

/** Rows written by older or newer builds may carry a category this build doesn't know. */
export function normalizeFeedbackCategory(raw: string | null | undefined): FeedbackCategory {
  return FEEDBACK_CATEGORIES.find((c) => c === raw) ?? "general";
}
