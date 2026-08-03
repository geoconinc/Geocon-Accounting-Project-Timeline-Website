import { boardUrl, escapeHtml, firstNameFromDisplayName } from "./html";
import { renderEmailTemplate, type RenderedEmail } from "./templateEngine";
import { SUBITEM_ASSIGNMENT_SNIPPET } from "./subitemAssignmentSnippets";

/** Shared merge fields for all new-project assignment emails. */
export interface ProjectCreationMailContext {
  projectCode: string;
  projectName: string;
  office: string;
  creatorName: string;
  projectId?: string;
}

function esc(s: string): string {
  return escapeHtml(s);
}

/** Trusted HTML fragment: assigned checklist items with per-item hints (no duplicate heading). */
function taskListHtml(taskNames: string[]): string {
  if (taskNames.length === 0) {
    return `<p style="margin:0;color:#64748b;font-size:13px">No checklist items assigned.</p>`;
  }

  const rows = taskNames
    .map((t, i) => {
      const hint = esc(
        SUBITEM_ASSIGNMENT_SNIPPET[t] ?? "Complete this item in the Geocon Project Timeline."
      );
      const border = i === taskNames.length - 1 ? "none" : "1px solid #e2e8f0";
      return `<tr>
        <td style="padding:12px 0;border-bottom:${border};vertical-align:top">
          <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#0f172a">${esc(t)}</p>
          <p style="margin:0;font-size:12px;color:#64748b;line-height:1.5">${hint}</p>
        </td>
      </tr>`;
    })
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
            style="margin:8px 0 4px;border-collapse:collapse">${rows}</table>`;
}

function taskListPlain(taskNames: string[]): string {
  return taskNames.length ? taskNames.join("; ") : "No checklist items assigned.";
}

/** Project manager: DAS 140 responsibility + DAS Setup Sheet when that subitem is assigned to them. */
export function buildProjectManagerCreationEmail(
  ctx: ProjectCreationMailContext,
  pmFirstNameOrName: string,
  assignedSubitemNames: string[]
): Promise<RenderedEmail> {
  const hasSetup = assignedSubitemNames.includes("DAS Setup Sheet");
  const setupNote = hasSetup
    ? "You are listed on the DAS Setup Sheet subitem — please complete your setup steps in the Geocon Project Timeline."
    : "Your office may assign the DAS Setup Sheet to another contact; you remain accountable for DAS 140 coordination as project manager.";

  return renderEmailTemplate(
    "projectManagerCreated",
    {
      headline: "New project — Project Manager",
      ctaLabel: "Open Project Timeline",
      ctaUrl: boardUrl(ctx.projectId)
    },
    {
      text: {
        firstName: firstNameFromDisplayName(pmFirstNameOrName),
        creatorName: ctx.creatorName,
        projectCode: ctx.projectCode,
        projectName: ctx.projectName,
        office: ctx.office,
        setupNote
      },
      html: { taskList: taskListHtml(assignedSubitemNames) },
      plain: { taskList: taskListPlain(assignedSubitemNames) }
    }
  );
}

/** Accounting / payroll contacts: digest of checklist items they own on the new project. */
export function buildAssigneeDigestEmail(
  ctx: ProjectCreationMailContext,
  recipientFirstNameOrName: string,
  taskNames: string[]
): Promise<RenderedEmail> {
  return renderEmailTemplate(
    "assigneeDigest",
    { headline: "New project — Your tasks", ctaLabel: "Open checklist", ctaUrl: boardUrl(ctx.projectId) },
    {
      text: {
        firstName: firstNameFromDisplayName(recipientFirstNameOrName),
        creatorName: ctx.creatorName,
        projectCode: ctx.projectCode,
        projectName: ctx.projectName,
        office: ctx.office
      },
      html: { taskList: taskListHtml(taskNames) },
      plain: { taskList: taskListPlain(taskNames) }
    }
  );
}
