import { differenceInCalendarDays, isValid, parse, parseISO } from "date-fns";
import type { Project, Subitem, SubitemStatus } from "@/lib/types";

/** Subitem fields needed for personal / company work metrics. */
export type WorkStatSubitem = Pick<
  Subitem,
  "id" | "projectId" | "ownerId" | "status" | "dueDate" | "dateCompleted" | "createdAt"
>;

export type WorkStatProject = Pick<
  Project,
  "id" | "ownerId" | "projectManagerId" | "projectDirectorId" | "status" | "lastUpdatedAt"
>;

export interface StatusCount<T extends string> {
  status: T;
  count: number;
}

export interface WorkStatsSummary {
  assignedCount: number;
  openCount: number;
  completedCount: number;
  naCount: number;
  /** Completed / (assigned − NA), 0–100. */
  completionPct: number;
  overdueCount: number;
  dueSoonCount: number;
  /** Mean calendar days from createdAt → dateCompleted; null if none completed with dates. */
  avgCompletionDays: number | null;
  /** Median calendar days createdAt → dateCompleted; null if none. */
  medianCompletionDays: number | null;
  /**
   * Share of completed items with a due date that finished on or before due date (0–100).
   * Null when no completed items have both dates.
   */
  onTimePct: number | null;
  /** Completed with due date that finished after due. */
  lateCompletedCount: number;
  byStatus: StatusCount<SubitemStatus>[];
}

const SUB_STATUSES: SubitemStatus[] = [
  "Completed",
  "InProgress",
  "Missing",
  "NotStarted",
  "NA"
];

export function parseWorkDate(value: string): Date | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = parse(value, "yyyy-MM-dd", new Date());
    return isValid(d) ? d : null;
  }
  const d = parseISO(value);
  return isValid(d) ? d : null;
}

/** Stable YYYY-MM-DD from ISO or date-only strings (avoids TZ off-by-one). */
export function calendarDateKey(value: string): string | null {
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1]!;
  const d = parseWorkDate(value);
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

/** Calendar days from created → completed; null if either date missing/invalid or negative. */
export function completionDays(subitem: WorkStatSubitem): number | null {
  if (subitem.status !== "Completed" || !subitem.dateCompleted) return null;
  const createdKey = calendarDateKey(subitem.createdAt);
  const completedKey = calendarDateKey(subitem.dateCompleted);
  if (!createdKey || !completedKey) return null;
  const created = parse(createdKey, "yyyy-MM-dd", new Date());
  const completed = parse(completedKey, "yyyy-MM-dd", new Date());
  if (!isValid(created) || !isValid(completed)) return null;
  const days = differenceInCalendarDays(completed, created);
  return days >= 0 ? days : null;
}

export function isOpenWork(subitem: WorkStatSubitem): boolean {
  return subitem.status !== "Completed" && subitem.status !== "NA";
}

/** Days until due (negative = overdue). Null if no due date or not open work. */
export function daysUntilDue(subitem: WorkStatSubitem, today: Date = new Date()): number | null {
  if (!subitem.dueDate || !isOpenWork(subitem)) return null;
  const due = parseWorkDate(subitem.dueDate);
  if (!due) return null;
  return differenceInCalendarDays(due, today);
}

function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round(((sorted[mid - 1]! + sorted[mid]!) / 2) * 10) / 10;
  }
  return sorted[mid]!;
}

/** Aggregate checklist metrics for a set of subitems (already scoped to a user or company). */
export function computeWorkStats(
  subitems: WorkStatSubitem[],
  today: Date = new Date()
): WorkStatsSummary {
  const assignedCount = subitems.length;
  const naCount = subitems.filter((s) => s.status === "NA").length;
  const completedCount = subitems.filter((s) => s.status === "Completed").length;
  const openCount = subitems.filter(isOpenWork).length;
  const counted = assignedCount - naCount;
  const completionPct = counted ? Math.round((completedCount / counted) * 100) : 0;

  let overdueCount = 0;
  let dueSoonCount = 0;
  for (const s of subitems) {
    const days = daysUntilDue(s, today);
    if (days === null) continue;
    if (days < 0) overdueCount += 1;
    else if (days <= 7) dueSoonCount += 1;
  }

  const durations = subitems
    .map(completionDays)
    .filter((d): d is number => d !== null);

  let onTimeEligible = 0;
  let onTimeHit = 0;
  let lateCompletedCount = 0;
  for (const s of subitems) {
    if (s.status !== "Completed" || !s.dateCompleted || !s.dueDate) continue;
    const completedKey = calendarDateKey(s.dateCompleted);
    const dueKey = calendarDateKey(s.dueDate);
    if (!completedKey || !dueKey) continue;
    const completed = parse(completedKey, "yyyy-MM-dd", new Date());
    const due = parse(dueKey, "yyyy-MM-dd", new Date());
    if (!isValid(completed) || !isValid(due)) continue;
    onTimeEligible += 1;
    if (differenceInCalendarDays(completed, due) <= 0) onTimeHit += 1;
    else lateCompletedCount += 1;
  }

  const byStatus = SUB_STATUSES.map((status) => ({
    status,
    count: subitems.filter((s) => s.status === status).length
  }));

  return {
    assignedCount,
    openCount,
    completedCount,
    naCount,
    completionPct,
    overdueCount,
    dueSoonCount,
    avgCompletionDays: average(durations),
    medianCompletionDays: median(durations),
    onTimePct: onTimeEligible ? Math.round((onTimeHit / onTimeEligible) * 100) : null,
    lateCompletedCount,
    byStatus
  };
}

/** Subitems owned by this user. */
export function subitemsForUser<T extends WorkStatSubitem>(subitems: T[], userId: string): T[] {
  return subitems.filter((s) => s.ownerId === userId);
}

/** Projects the user leads or that contain at least one of their assigned subitems. */
export function projectsForUser<T extends WorkStatProject>(
  projects: T[],
  userId: string,
  ownedSubitems: WorkStatSubitem[]
): T[] {
  const linked = new Set(ownedSubitems.map((s) => s.projectId));
  return projects.filter(
    (p) =>
      linked.has(p.id) ||
      p.ownerId === userId ||
      p.projectManagerId === userId ||
      p.projectDirectorId === userId
  );
}

export function formatDaysMetric(days: number | null, empty = "—"): string {
  if (days === null) return empty;
  if (Number.isInteger(days)) return `${days}d`;
  return `${days.toFixed(1)}d`;
}

export function formatPctMetric(pct: number | null, empty = "—"): string {
  if (pct === null) return empty;
  return `${pct}%`;
}
