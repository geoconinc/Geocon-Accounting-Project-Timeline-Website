import { z } from "zod";
import {
  gmsDasFieldsSchema,
  isTimelineTrackedJobFromGms,
  resolvePrevailingWageFromGms,
  resolveUnionFromGms
} from "@/lib/domain/gmsDas";

const ALLOWED_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN ?? "geoconinc.com").toLowerCase();

export const personSchema = z.object({
  name: z.string().min(1),
  email: z.string().email()
});

export const gmsProjectPayloadSchema = z
  .object({
    projectNumber: z.string().min(1),
    projectName: z.string().min(1),
    gmsProposalId: z.string().min(1).optional(),
    proposalNumber: z.string().optional(),
    clientName: z.string().optional(),
    officeCode: z.string().min(1),
    officeName: z.string().optional(),
    company: z.string().optional(),
    projectManager: personSchema,
    projectDirector: personSchema,
    feeEstimate: z.number().optional(),
    wonDate: z.string().optional(),
    dueDate: z.string().optional()
  })
  .merge(gmsDasFieldsSchema);

export type GmsProjectPayload = z.infer<typeof gmsProjectPayloadSchema>;

/** True when the email is on the allowed Geocon domain (case-insensitive). */
export function geoconEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith("@" + ALLOWED_DOMAIN);
}

/** Normalize a date-ish string to YYYY-MM-DD, or null if unusable. */
export function dateOnly(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

/** Notes block stamped onto projects imported from GMS. */
export function buildGmsNotes(payload: GmsProjectPayload): string {
  const lines: string[] = ["Imported from GMS."];
  if (payload.proposalNumber) lines.push(`Proposal #: ${payload.proposalNumber}`);
  if (payload.gmsProposalId) lines.push(`GMS proposal ID: ${payload.gmsProposalId}`);
  if (payload.clientName) lines.push(`Client: ${payload.clientName}`);
  if (payload.company) lines.push(`Company: ${payload.company}`);
  if (payload.feeEstimate != null) {
    lines.push(`Fee estimate: $${payload.feeEstimate.toLocaleString("en-US")}`);
  }
  if (payload.prevailingWageType) {
    lines.push(`PW type: ${payload.prevailingWageType}`);
  }
  const unionJob = resolveUnionFromGms(payload) === true;
  const pwJob = resolvePrevailingWageFromGms(payload) === true;
  if (unionJob) {
    lines.push("Union: yes");
  } else if (pwJob || isTimelineTrackedJobFromGms(payload) === true) {
    lines.push("Prevailing wage: yes");
  } else if (payload.prevailingWage != null || payload.union != null) {
    lines.push("Prevailing wage: no");
  }
  if (payload.pwCategory) lines.push(`PW category: ${payload.pwCategory}`);
  if (payload.dirNumber) lines.push(`DIR #: ${payload.dirNumber}`);
  if (payload.dirContractNumber) lines.push(`DIR contract #: ${payload.dirContractNumber}`);
  if (payload.dasRequired != null) {
    lines.push(`DAS required: ${payload.dasRequired ? "yes" : "no"}`);
  }
  if (payload.dasStatus) lines.push(`DAS status: ${payload.dasStatus}`);
  if (payload.das140Status) lines.push(`DAS 140: ${payload.das140Status}`);
  if (payload.das142Status) lines.push(`DAS 142: ${payload.das142Status}`);
  if (payload.payrollCycle) lines.push(`Payroll cycle: ${payload.payrollCycle}`);
  return lines.join("\n");
}
