import { escapeHtml } from "./dispatch";
import { SUBITEM_ASSIGNMENT_SNIPPET } from "./subitemAssignmentSnippets";

/** Shared merge fields for all new-project assignment emails. */
export interface ProjectCreationMailContext {
  projectCode: string;
  projectName: string;
  office: string;
  creatorName: string;
}

function esc(s: string): string {
  return escapeHtml(s);
}

/** Project manager: DAS 140 responsibility + DAS Setup Sheet when that subitem is assigned to them. */
export function buildProjectManagerCreationEmail(
  ctx: ProjectCreationMailContext,
  pmFirstNameOrName: string,
  assignedSubitemNames: string[]
): { subject: string; message: string; html: string } {
  const c = esc(ctx.projectCode);
  const n = esc(ctx.projectName);
  const o = esc(ctx.office);
  const who = esc(ctx.creatorName);
  const pm = esc(pmFirstNameOrName);
  const hasSetup = assignedSubitemNames.includes("DAS Setup Sheet");
  const setupHtml = hasSetup
    ? "<p>You are listed on the <strong>DAS Setup Sheet</strong> subitem — please complete your setup steps in the Geocon Project Timeline.</p>"
    : "<p>Your office may assign the DAS Setup Sheet to another contact; you remain accountable for <strong>DAS 140</strong> coordination as project manager.</p>";

  const subject = `Action needed: DAS 140 for ${ctx.projectCode} — ${ctx.projectName}`;
  const message = `${ctx.creatorName} created project ${ctx.projectCode} (${ctx.projectName}) for office ${ctx.office} and assigned you as project manager. Please ensure the DAS 140 form is completed. ${hasSetup ? "You are also assigned the DAS Setup Sheet subitem." : ""}`;

  const bullets = assignedSubitemNames
    .map((t) => {
      const hint = esc(SUBITEM_ASSIGNMENT_SNIPPET[t] ?? "Complete this item in the Geocon Project Timeline.");
      return `<li><strong>${esc(t)}</strong><br/><small style="color:#64748b">${hint}</small></li>`;
    })
    .join("");
  const listHtml = bullets
    ? `<p><strong>Your assigned checklist items:</strong></p><ul>${bullets}</ul>`
    : "";

  const html = `<p>Hi ${pm},</p>
<p>${who} created project <strong>${c}</strong> — <strong>${n}</strong> (<strong>${o}</strong>) and assigned you as <strong>project manager</strong>.</p>
<p><strong>DAS 140:</strong> Please ensure the <strong>DAS 140</strong> form is set up and completed for this project. If it is not done yet, you are the accountable contact.</p>
${setupHtml}
${listHtml}
<p>Open the Geocon Project Timeline to update statuses and attach files.</p>`;

  return { subject, message, html };
}

/** Accounting / payroll contacts: digest of checklist items they own on the new project. */
export function buildAssigneeDigestEmail(
  ctx: ProjectCreationMailContext,
  recipientFirstNameOrName: string,
  taskNames: string[]
): { subject: string; message: string; html: string } {
  const c = esc(ctx.projectCode);
  const n = esc(ctx.projectName);
  const o = esc(ctx.office);
  const who = esc(ctx.creatorName);
  const r = esc(recipientFirstNameOrName);
  const bullets = taskNames
    .map((t) => {
      const hint = esc(SUBITEM_ASSIGNMENT_SNIPPET[t] ?? "Complete this item in the Geocon Project Timeline.");
      return `<li><strong>${esc(t)}</strong><br/><small style="color:#64748b">${hint}</small></li>`;
    })
    .join("");
  const subject = `New project ${ctx.projectCode}: your tasks (${ctx.office})`;
  const message = `${ctx.creatorName} created ${ctx.projectCode} — ${ctx.projectName} (${ctx.office}). You are assigned: ${taskNames.join("; ")}. Please complete your items in the Geocon Project Timeline.`;

  const html = `<p>Hi ${r},</p>
<p>${who} created a new project in the Geocon Project Timeline:</p>
<ul>
<li><strong>Code:</strong> ${c}</li>
<li><strong>Name:</strong> ${n}</li>
<li><strong>Office:</strong> ${o}</li>
</ul>
<p><strong>You are assigned the following checklist items</strong> (complete them in the app when ready):</p>
<ul>${bullets}</ul>
<p>If you have questions, contact the project manager listed on the board.</p>`;

  return { subject, message, html };
}
