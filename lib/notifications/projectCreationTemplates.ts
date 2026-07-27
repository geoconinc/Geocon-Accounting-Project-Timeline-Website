import { boardUrl, escapeHtml } from "./html";
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

/** Trusted HTML fragment: the assigned checklist items with per-item hints. */
function taskListHtml(taskNames: string[]): string {
  const bullets = taskNames
    .map((t) => {
      const hint = esc(SUBITEM_ASSIGNMENT_SNIPPET[t] ?? "Complete this item in the Geocon Project Timeline.");
      return `<li style="margin-bottom:10px"><strong>${esc(t)}</strong><br/>
        <span style="font-size:12px;color:#64748b">${hint}</span></li>`;
    })
    .join("");
  return bullets
    ? `<p><strong>Your assigned checklist items:</strong></p><ul style="margin:12px 0;padding-left:20px">${bullets}</ul>`
    : "";
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
        firstName: pmFirstNameOrName,
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
        firstName: recipientFirstNameOrName,
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
