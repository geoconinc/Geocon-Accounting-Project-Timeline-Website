"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Mail, MessageSquare, RefreshCw, RotateCcw } from "lucide-react";
import type { FeedbackCategory } from "@/lib/types";
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_CATEGORY_LABELS,
  type AdminFeedbackEntry
} from "@/lib/domain/feedback";
import { feedbackApi } from "@/lib/client/feedbackApi";
import { formatRelativeTime } from "@/lib/utils";

type StatusFilter = "open" | "resolved" | "all";

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  open: "Open",
  resolved: "Resolved",
  all: "All"
};

const CATEGORY_BADGE_CLASSES: Record<FeedbackCategory, string> = {
  idea: "bg-sky-50 text-sky-700 border-sky-200",
  bug: "bg-red-50 text-red-700 border-red-200",
  general: "bg-slate-100 text-slate-700 border-slate-200"
};

function matchesStatus(entry: AdminFeedbackEntry, filter: StatusFilter): boolean {
  switch (filter) {
    case "open":
      return !entry.resolvedAt;
    case "resolved":
      return Boolean(entry.resolvedAt);
    case "all":
      return true;
    default: {
      const unhandled: never = filter;
      throw new Error(`Unhandled status filter: ${unhandled}`);
    }
  }
}

export function AdminFeedbackView() {
  const [entries, setEntries] = useState<AdminFeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [categoryFilter, setCategoryFilter] = useState<FeedbackCategory | "all">("all");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setEntries((await feedbackApi.listForAdmin()).feedback);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Couldn't load feedback.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCount = useMemo(() => entries.filter((e) => !e.resolvedAt).length, [entries]);

  const visibleEntries = useMemo(
    () =>
      entries.filter(
        (e) => matchesStatus(e, statusFilter) && (categoryFilter === "all" || e.category === categoryFilter)
      ),
    [entries, statusFilter, categoryFilter]
  );

  async function toggleResolved(entry: AdminFeedbackEntry) {
    setPendingId(entry.id);
    setActionError(null);
    try {
      const { feedback: updated } = await feedbackApi.setResolved(entry.id, !entry.resolvedAt);
      setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't update feedback.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">User feedback</h2>
        <p className="text-sm text-slate-500">
          Submitted from the Give feedback button. {openCount} open of {entries.length} total.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1 bg-slate-100 rounded-md p-0.5">
          {(Object.keys(STATUS_FILTER_LABELS) as StatusFilter[]).map((key) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                statusFilter === key ? "bg-white text-brand shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {STATUS_FILTER_LABELS[key]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Type:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as FeedbackCategory | "all")}
            className="border border-slate-200 rounded-md text-sm px-2 py-1.5 outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="all">All types</option>
            {FEEDBACK_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {FEEDBACK_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <button onClick={() => void load()} disabled={loading} className="btn-primary text-xs ml-auto disabled:opacity-50">
          <RefreshCw size={14} className={loading ? "animate-spin" : undefined} /> Refresh
        </button>
      </div>

      {actionError && <p className="text-sm text-red-600">{actionError}</p>}

      {loadError ? (
        <div className="p-8 text-sm text-red-600">{loadError}</div>
      ) : loading && entries.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
      ) : visibleEntries.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-12 flex flex-col items-center gap-2 text-sm text-slate-400">
          <MessageSquare size={24} />
          {entries.length === 0 ? "No feedback yet." : "No feedback matches the current filters."}
        </div>
      ) : (
        <ul className="space-y-3">
          {visibleEntries.map((entry) => (
            <FeedbackCard
              key={entry.id}
              entry={entry}
              pending={pendingId === entry.id}
              onToggleResolved={() => void toggleResolved(entry)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function FeedbackCard({
  entry,
  pending,
  onToggleResolved
}: {
  entry: AdminFeedbackEntry;
  pending: boolean;
  onToggleResolved: () => void;
}) {
  const resolved = Boolean(entry.resolvedAt);

  return (
    <li
      className={`bg-white rounded-xl border p-5 ${resolved ? "border-slate-100 opacity-70" : "border-slate-200"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">{entry.submitterName}</span>
            <span
              className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border ${CATEGORY_BADGE_CLASSES[entry.category]}`}
            >
              {FEEDBACK_CATEGORY_LABELS[entry.category]}
            </span>
            {resolved && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700">
                <CheckCircle2 size={12} /> Resolved
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            <span title={new Date(entry.createdAt).toLocaleString()}>{formatRelativeTime(entry.createdAt)}</span>
            {entry.pagePath && <> · from {entry.pagePath}</>}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {entry.submitterEmail && (
            <a
              href={`mailto:${entry.submitterEmail}?subject=${encodeURIComponent("Re: your Project Timeline feedback")}`}
              className="btn-ghost text-xs inline-flex items-center gap-1"
              title={entry.submitterEmail}
            >
              <Mail size={14} /> Reply
            </a>
          )}
          <button
            onClick={onToggleResolved}
            disabled={pending}
            className="btn text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
          >
            {resolved ? (
              <>
                <RotateCcw size={14} /> Reopen
              </>
            ) : (
              <>
                <CheckCircle2 size={14} /> Mark resolved
              </>
            )}
          </button>
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-700 whitespace-pre-wrap break-words">{entry.message}</p>
    </li>
  );
}
