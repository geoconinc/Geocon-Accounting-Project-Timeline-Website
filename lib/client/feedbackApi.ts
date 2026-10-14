"use client";

import type { Feedback } from "@/lib/types";
import type { AdminFeedbackEntry, FeedbackSubmission } from "@/lib/domain/feedback";

async function feedbackFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) }
  });
  if (!res.ok) {
    let message = "";
    try {
      message = ((await res.json()) as { message?: string }).message ?? "";
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message || `Request failed (${res.status}). Please try again.`);
  }
  return (await res.json()) as T;
}

export const feedbackApi = {
  submit: (body: FeedbackSubmission) =>
    feedbackFetch<{ feedback: Feedback }>("/api/feedback", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  listForAdmin: () => feedbackFetch<{ feedback: AdminFeedbackEntry[] }>("/api/admin/feedback"),
  setResolved: (id: string, resolved: boolean) =>
    feedbackFetch<{ feedback: AdminFeedbackEntry }>(`/api/admin/feedback/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ resolved })
    })
};
