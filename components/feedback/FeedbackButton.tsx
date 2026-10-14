"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CheckCircle2, MessageSquarePlus, X } from "lucide-react";
import type { FeedbackCategory } from "@/lib/types";
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_MESSAGE_MAX_LENGTH
} from "@/lib/domain/feedback";
import { feedbackApi } from "@/lib/client/feedbackApi";

const SUCCESS_AUTO_CLOSE_MS = 2000;

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 ring-1 ring-white/20 transition-colors"
        title="Tell us what's working and what isn't"
      >
        <MessageSquarePlus size={14} />
        <span className="hidden sm:inline">Give feedback</span>
      </button>
      {open && <FeedbackDialog onClose={close} />}
    </>
  );
}

function FeedbackDialog({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const [category, setCategory] = useState<FeedbackCategory>("idea");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const hasDraft = message.trim().length > 0 && !submitted;

  const requestClose = useCallback(() => {
    if (submitting) return;
    if (hasDraft && !window.confirm("Discard your feedback?")) return;
    onClose();
  }, [submitting, hasDraft, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [requestClose]);

  useEffect(() => {
    if (!submitted) return;
    const timer = window.setTimeout(onClose, SUCCESS_AUTO_CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [submitted, onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) {
      setError("Please enter some feedback.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await feedbackApi.submit({ category, message, pagePath: pathname });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't send your feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 grid place-items-center p-4" onClick={requestClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-dialog-title"
        className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6 animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 id="feedback-dialog-title" className="text-base font-semibold text-slate-800">
            Give feedback
          </h2>
          <button onClick={requestClose} className="text-slate-400 hover:text-slate-700" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {submitted ? (
          <div className="py-6 flex flex-col items-center text-center gap-2">
            <CheckCircle2 size={32} className="text-emerald-500" />
            <p className="text-sm font-medium text-slate-800">Thanks for the feedback!</p>
            <p className="text-xs text-slate-500">It&apos;s been sent to the site admins.</p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <p className="text-sm text-slate-500 mb-4">
              Ideas, problems, or anything that would make the site work better for you.
            </p>

            <fieldset className="mb-3">
              <legend className="text-xs font-medium text-slate-600 mb-1.5">What kind of feedback?</legend>
              <div className="flex flex-wrap gap-2">
                {FEEDBACK_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    aria-pressed={category === c}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                      category === c
                        ? "bg-brand text-white border-brand"
                        : "bg-white text-slate-600 border-slate-200 hover:border-brand/40"
                    }`}
                  >
                    {FEEDBACK_CATEGORY_LABELS[c]}
                  </button>
                ))}
              </div>
            </fieldset>

            <label htmlFor="feedback-message" className="text-xs font-medium text-slate-600 mb-1.5 block">
              Your feedback
            </label>
            <textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={FEEDBACK_MESSAGE_MAX_LENGTH}
              rows={5}
              autoFocus
              placeholder="e.g. It would help if the timeline showed…"
              className="w-full border border-slate-200 rounded-md text-sm p-2.5 outline-none focus:ring-1 focus:ring-brand resize-y"
            />
            <div className="flex justify-between items-start mt-1 mb-4 gap-2">
              <p className="text-xs text-red-600 min-h-[1rem]">{error}</p>
              <span className="text-[10px] text-slate-400 shrink-0">
                {message.length}/{FEEDBACK_MESSAGE_MAX_LENGTH}
              </span>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={requestClose} disabled={submitting} className="btn-ghost text-sm disabled:opacity-50">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="btn-primary text-sm disabled:opacity-50">
                {submitting ? "Sending…" : "Send feedback"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
