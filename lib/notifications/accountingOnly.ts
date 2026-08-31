import type { Project } from "@/lib/types";

type LeadFields = Pick<Project, "projectManagerId" | "projectDirectorId">;

/**
 * Timeline emails go only to the accounting team (checklist assignees).
 * Project managers and directors do not log into this app and must not be emailed.
 */
export function isProjectLeadUserId(userId: string, project: LeadFields): boolean {
  return userId === project.projectManagerId || userId === project.projectDirectorId;
}

/** True when this userId should receive Timeline emails for the project. */
export function isAccountingEmailRecipient(userId: string, project: LeadFields): boolean {
  return Boolean(userId) && !isProjectLeadUserId(userId, project);
}

/** Distinct checklist owner ids that are accounting (not PM/director). */
export function accountingAssigneeIds(
  project: LeadFields,
  subitemOwnerIds: Array<string | null | undefined>
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of subitemOwnerIds) {
    if (!id || seen.has(id)) continue;
    if (!isAccountingEmailRecipient(id, project)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}
