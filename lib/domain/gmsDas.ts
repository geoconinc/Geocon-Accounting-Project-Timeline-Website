import { z } from "zod";

/** Values GMS currently sends for DAS setup completion. */
export const GMS_DAS_STATUSES = ["not_completed", "completed"] as const;
export type GmsDasStatus = (typeof GMS_DAS_STATUSES)[number];

export const gmsDasStatusSchema = z.enum(GMS_DAS_STATUSES);

/**
 * Optional DAS / prevailing-wage fields that GMS includes on project push
 * (and on the daily das-status pull). All optional so older GMS callers keep working.
 */
export const gmsDasFieldsSchema = z.object({
  prevailingWage: z.boolean().optional(),
  pwCategory: z.string().nullable().optional(),
  dasRequired: z.boolean().optional(),
  dasStatus: z.string().nullable().optional(),
  dasCompletedAt: z.string().nullable().optional()
});

export type GmsDasFields = z.infer<typeof gmsDasFieldsSchema>;

export const DAS_SETUP_SHEET_NAME = "DAS Setup Sheet";

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

/** Project patch derived from GMS DAS/PW fields (only defined keys are set). */
export function gmsDasProjectPatch(fields: GmsDasFields): {
  prevailingWage?: boolean;
  pwCategory?: string | null;
  dasRequired?: boolean;
  dasStatus?: string | null;
  dasCompletedAt?: string | null;
} {
  const patch: {
    prevailingWage?: boolean;
    pwCategory?: string | null;
    dasRequired?: boolean;
    dasStatus?: string | null;
    dasCompletedAt?: string | null;
  } = {};

  if (fields.prevailingWage !== undefined) patch.prevailingWage = fields.prevailingWage;
  if (fields.pwCategory !== undefined) {
    patch.pwCategory =
      typeof fields.pwCategory === "string" && fields.pwCategory.trim()
        ? fields.pwCategory.trim()
        : null;
  }
  if (fields.dasRequired !== undefined) patch.dasRequired = fields.dasRequired;
  if (fields.dasStatus !== undefined) patch.dasStatus = normalizeDasStatus(fields.dasStatus);
  if (fields.dasCompletedAt !== undefined) {
    const raw = fields.dasCompletedAt;
    if (raw == null || !String(raw).trim()) patch.dasCompletedAt = null;
    else {
      const d = new Date(raw);
      patch.dasCompletedAt = Number.isNaN(d.getTime()) ? null : d.toISOString();
    }
  }
  return patch;
}
