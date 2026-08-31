import { z } from "zod";
import type { PayrollCycle, PrevailingWageType, SubitemStatus } from "@/lib/types";

/** Values GMS currently sends for DAS setup completion. */
export const GMS_DAS_STATUSES = ["not_completed", "completed"] as const;
export type GmsDasStatus = (typeof GMS_DAS_STATUSES)[number];

export const gmsDasStatusSchema = z.enum(GMS_DAS_STATUSES);

export const PAYROLL_CYCLES = ["weekly", "biweekly"] as const;
export const DEFAULT_PAYROLL_CYCLE: PayrollCycle = "biweekly";

export const PREVAILING_WAGE_TYPES = ["no", "yes", "union"] as const;

export const DAS_SETUP_SHEET_NAME = "DAS Setup Sheet";
export const DAS_140_NAME = "DAS 140 & Confirmation";
export const DAS_142_NAME = "DAS 142 & Confirmation";

/** Checklist items whose status / dateCompleted are driven only by GMS. */
export const GMS_MANAGED_SUBITEM_NAMES = new Set<string>([
  DAS_SETUP_SHEET_NAME,
  DAS_140_NAME,
  DAS_142_NAME
]);

export function isGmsManagedSubitemName(name: string): boolean {
  return GMS_MANAGED_SUBITEM_NAMES.has(name);
}

/**
 * Project fields owned by GMS — never writable from the Timeline board/API.
 * (Payroll cycle stays Timeline-owned.)
 */
export const GMS_OWNED_PROJECT_FIELDS = [
  "dirNumber",
  "dirContractNumber",
  "union",
  "prevailingWage",
  "prevailingWageType",
  "pwCategory",
  "dasRequired",
  "dasStatus",
  "dasCompletedAt",
  "gmsProposalId"
] as const;

export type GmsOwnedProjectField = (typeof GMS_OWNED_PROJECT_FIELDS)[number];

/** Extra fields locked once a project was imported from GMS (has gmsProposalId). */
export const GMS_IMPORT_LOCKED_PROJECT_FIELDS = [
  "code",
  "name",
  "projectManagerId",
  "projectDirectorId",
  "startDate",
  "notes"
] as const;

export function gmsOwnedFieldsInPatch(patch: Record<string, unknown>): string[] {
  return GMS_OWNED_PROJECT_FIELDS.filter((k) => k in patch);
}

export function gmsImportLockedFieldsInPatch(
  patch: Record<string, unknown>,
  project: { gmsProposalId?: string | null }
): string[] {
  if (!project.gmsProposalId) return [];
  return GMS_IMPORT_LOCKED_PROJECT_FIELDS.filter((k) => k in patch);
}

/** Subitem fields that GMS owns for DAS Setup / 140 / 142. */
export const GMS_OWNED_SUBITEM_FIELDS = ["status", "dateCompleted"] as const;

export function gmsOwnedSubitemFieldsInPatch(
  subitemName: string,
  patch: Record<string, unknown>
): string[] {
  if (!isGmsManagedSubitemName(subitemName)) return [];
  return GMS_OWNED_SUBITEM_FIELDS.filter((k) => k in patch);
}

/** Coerce common GMS boolean wire forms (bool, 0/1, yes/no, true/false strings). */
export function coerceGmsBoolean(value: unknown): unknown {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "yes" || normalized === "1") return true;
    if (normalized === "false" || normalized === "no" || normalized === "0") return false;
  }
  return value;
}

const gmsBoolean = z.preprocess(coerceGmsBoolean, z.boolean().optional());

/**
 * Optional DAS / prevailing-wage fields that GMS includes on project push
 * (and on the daily das-status pull). All optional so older GMS callers keep working.
 *
 * William (Aug 2026): prevailingWageType, union, dirNumber, dirContractNumber,
 * das140Status/FiledAt, das142Status/FiledAt. Legacy prevailingWage boolean still accepted.
 */
export const gmsDasFieldsSchema = z.object({
  prevailingWage: gmsBoolean,
  prevailingWageType: z.string().nullable().optional(),
  union: gmsBoolean,
  pwCategory: z.string().nullable().optional(),
  dirNumber: z.string().nullable().optional(),
  dirContractNumber: z.string().nullable().optional(),
  dasRequired: gmsBoolean,
  dasStatus: z.string().nullable().optional(),
  dasCompletedAt: z.string().nullable().optional(),
  das140Status: z.string().nullable().optional(),
  das140FiledAt: z.string().nullable().optional(),
  das142Status: z.string().nullable().optional(),
  das142FiledAt: z.string().nullable().optional(),
  payrollCycle: z.string().nullable().optional()
});

export type GmsDasFields = z.infer<typeof gmsDasFieldsSchema>;

/** Normalize a GMS dasStatus string; unknown values are kept as trimmed text. */
export function normalizeDasStatus(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (lower === "completed") return "completed";
  if (lower === "not_completed" || lower === "not-completed" || lower === "incomplete") {
    return "not_completed";
  }
  return trimmed;
}

export function isDasCompleted(status: string | null | undefined): boolean {
  return normalizeDasStatus(status) === "completed";
}

export function normalizePrevailingWageType(
  value: string | null | undefined
): PrevailingWageType | null {
  if (value == null) return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  if (trimmed === "no" || trimmed === "none" || trimmed === "false" || trimmed === "0") return "no";
  if (trimmed === "yes" || trimmed === "true" || trimmed === "1" || trimmed === "pw") return "yes";
  if (trimmed === "union") return "union";
  return null;
}

/**
 * Resolve whether a GMS payload is a prevailing-wage job.
 * Prefer prevailingWageType; fall back to legacy prevailingWage boolean.
 */
export function resolvePrevailingWageFromGms(fields: GmsDasFields): boolean | undefined {
  const type = normalizePrevailingWageType(fields.prevailingWageType ?? null);
  if (type === "yes" || type === "union") return true;
  if (type === "no") return false;
  if (fields.prevailingWage !== undefined) return fields.prevailingWage;
  return undefined;
}

/** Resolve Union checkbox from prevailingWageType and/or explicit union boolean. */
export function resolveUnionFromGms(fields: GmsDasFields): boolean | undefined {
  const type = normalizePrevailingWageType(fields.prevailingWageType ?? null);
  if (type === "union") return true;
  if (fields.union !== undefined) return fields.union;
  if (type === "yes" || type === "no") return false;
  return undefined;
}

export function normalizePayrollCycle(value: string | null | undefined): PayrollCycle | null {
  if (value == null) return null;
  const trimmed = value.trim().toLowerCase().replace(/[_\s-]+/g, "");
  if (!trimmed) return null;
  if (trimmed === "weekly" || trimmed === "week") return "weekly";
  if (
    trimmed === "biweekly" ||
    trimmed === "biweek" ||
    trimmed === "biweeklycycle" ||
    trimmed === "fortnightly"
  ) {
    return "biweekly";
  }
  return null;
}

function trimOrNull(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value == null) return null;
  const t = value.trim();
  return t || null;
}

function isoOrNull(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value == null || !String(value).trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function dateOnlyOrNull(value: string | null | undefined): string | null {
  if (value == null || !String(value).trim()) return null;
  const trimmed = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Map a GMS per-form DAS status (+ optional filedAt) onto a board subitem status.
 * Returns null when GMS did not send a usable status (leave the checklist alone).
 */
export function mapGmsDasFormToSubitemPatch(
  status: string | null | undefined,
  filedAt: string | null | undefined
): { status: SubitemStatus; dateCompleted: string | null } | null {
  if (status == null) return null;
  const trimmed = status.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase().replace(/[_\s-]+/g, "");

  const filedDate = dateOnlyOrNull(filedAt);
  const today = new Date().toISOString().slice(0, 10);

  if (
    lower === "completed" ||
    lower === "filed" ||
    lower === "submitted" ||
    lower === "done" ||
    lower === "yes"
  ) {
    return { status: "Completed", dateCompleted: filedDate ?? today };
  }
  if (lower === "inprogress" || lower === "pending" || lower === "started") {
    return { status: "InProgress", dateCompleted: null };
  }
  if (lower === "missing" || lower === "overdue" || lower === "late") {
    return { status: "Missing", dateCompleted: null };
  }
  if (lower === "na" || lower === "n/a" || lower === "notapplicable") {
    return { status: "NA", dateCompleted: null };
  }
  if (
    lower === "notcompleted" ||
    lower === "notstarted" ||
    lower === "incomplete" ||
    lower === "open" ||
    lower === "no"
  ) {
    return { status: "NotStarted", dateCompleted: null };
  }

  // Unknown but non-empty — keep as InProgress so the board shows activity without inventing Completed.
  return { status: "InProgress", dateCompleted: null };
}

/** Project patch derived from GMS DAS/PW fields (only defined keys are set). */
export function gmsDasProjectPatch(fields: GmsDasFields): {
  prevailingWage?: boolean;
  prevailingWageType?: PrevailingWageType | null;
  union?: boolean;
  pwCategory?: string | null;
  dirNumber?: string | null;
  dirContractNumber?: string | null;
  dasRequired?: boolean;
  dasStatus?: string | null;
  dasCompletedAt?: string | null;
  payrollCycle?: PayrollCycle;
} {
  const patch: {
    prevailingWage?: boolean;
    prevailingWageType?: PrevailingWageType | null;
    union?: boolean;
    pwCategory?: string | null;
    dirNumber?: string | null;
    dirContractNumber?: string | null;
    dasRequired?: boolean;
    dasStatus?: string | null;
    dasCompletedAt?: string | null;
    payrollCycle?: PayrollCycle;
  } = {};

  const pw = resolvePrevailingWageFromGms(fields);
  if (pw !== undefined) patch.prevailingWage = pw;

  if (fields.prevailingWageType !== undefined) {
    patch.prevailingWageType = normalizePrevailingWageType(fields.prevailingWageType);
  }

  const unionVal = resolveUnionFromGms(fields);
  if (unionVal !== undefined) patch.union = unionVal;

  if (fields.pwCategory !== undefined) {
    patch.pwCategory =
      typeof fields.pwCategory === "string" && fields.pwCategory.trim()
        ? fields.pwCategory.trim()
        : null;
  }
  if (fields.dirNumber !== undefined) patch.dirNumber = trimOrNull(fields.dirNumber) ?? null;
  if (fields.dirContractNumber !== undefined) {
    patch.dirContractNumber = trimOrNull(fields.dirContractNumber) ?? null;
  }
  if (fields.dasRequired !== undefined) patch.dasRequired = fields.dasRequired;
  if (fields.dasStatus !== undefined) patch.dasStatus = normalizeDasStatus(fields.dasStatus);
  if (fields.dasCompletedAt !== undefined) {
    patch.dasCompletedAt = isoOrNull(fields.dasCompletedAt) ?? null;
  }
  if (fields.payrollCycle !== undefined) {
    const cycle = normalizePayrollCycle(fields.payrollCycle);
    if (cycle) patch.payrollCycle = cycle;
  }
  return patch;
}
