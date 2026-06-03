import { escapeHtml, firstNameFromDisplayName } from "../html";
import { wrapEmailLayout } from "../layout";

export interface EmailPayload {
  subject: string;
  message: string;
  html: string;
}

function esc(s: string): string {
  return escapeHtml(s);
}

function projectSummary(code: string, name: string): string {
  return `<ul style="margin:12px 0;padding-left:20px;color:#475569">
    <li><strong>Code:</strong> ${esc(code)}</li>
    <li><strong>Name:</strong> ${esc(name)}</li>
  </ul>`;
}

/** Cron: subitem due date is today. */
export function buildDueTodayEmail(opts: {
  recipientName: string;
  subitemName: string;
  projectCode: string;
  projectName: string;
  dueDate: string;
}): EmailPayload {
  const hi = esc(firstNameFromDisplayName(opts.recipientName));
  const subject = `Due today: ${opts.subitemName} · ${opts.projectCode}`;
  const message = `Reminder: "${opts.subitemName}" on project ${opts.projectCode} ${opts.projectName} is due today (${opts.dueDate}).`;

  const body = `<p>Hi ${hi},</p>
<p>This is a reminder that the following checklist item is <strong>due today</strong>:</p>
<ul style="margin:12px 0;padding-left:20px">
  <li><strong>Item:</strong> ${esc(opts.subitemName)}</li>
  <li><strong>Due date:</strong> ${esc(opts.dueDate)}</li>
</ul>
${projectSummary(opts.projectCode, opts.projectName)}
<p>Please complete the item or update its status in the timeline.</p>`;

  return {
    subject,
    message,
    html: wrapEmailLayout({
      headline: "Due today",
      bodyHtml: body,
      ctaLabel: "Open Project Timeline"
    })
  };
}

/** Project owner changed on an existing project. */
export function buildProjectOwnerAssignedEmail(opts: {
  recipientName: string;
  actorName: string;
  projectCode: string;
  projectName: string;
}): EmailPayload {
  const hi = esc(firstNameFromDisplayName(opts.recipientName));
  const subject = `You were assigned to ${opts.projectCode} — ${opts.projectName}`;
  const message = `${opts.actorName} assigned you as owner of project ${opts.projectCode} — ${opts.projectName}.`;

  const body = `<p>Hi ${hi},</p>
<p><strong>${esc(opts.actorName)}</strong> assigned you as <strong>project owner</strong> on:</p>
${projectSummary(opts.projectCode, opts.projectName)}
<p>Open the board to review subitems and update statuses.</p>`;

  return {
    subject,
    message,
    html: wrapEmailLayout({
      headline: "Project assignment",
      bodyHtml: body,
      ctaLabel: "View project"
    })
  };
}

/** Project status changed (notifies project owner). */
export function buildProjectStatusChangedEmail(opts: {
  recipientName: string;
  actorName: string;
  projectCode: string;
  projectName: string;
  newStatus: string;
}): EmailPayload {
  const hi = esc(firstNameFromDisplayName(opts.recipientName));
  const statusLabel = esc(opts.newStatus);
  const subject = `${opts.projectCode} status updated to ${opts.newStatus}`;
  const message = `${opts.actorName} changed the status of ${opts.projectCode} — ${opts.projectName} to ${opts.newStatus}.`;

  const body = `<p>Hi ${hi},</p>
<p><strong>${esc(opts.actorName)}</strong> updated the project status to
   <strong style="color:#0A5D6B">${statusLabel}</strong>:</p>
${projectSummary(opts.projectCode, opts.projectName)}`;

  return {
    subject,
    message,
    html: wrapEmailLayout({
      headline: "Status update",
      bodyHtml: body,
      ctaLabel: "Open Project Timeline"
    })
  };
}

/** Subitem owner changed. */
export function buildSubitemAssignedEmail(opts: {
  recipientName: string;
  actorName: string;
  subitemName: string;
  projectCode: string;
  projectName: string;
}): EmailPayload {
  const hi = esc(firstNameFromDisplayName(opts.recipientName));
  const subject = `Assigned: ${opts.subitemName} · ${opts.projectCode}`;
  const message = `${opts.actorName} assigned you to "${opts.subitemName}" on ${opts.projectCode} — ${opts.projectName}.`;

  const body = `<p>Hi ${hi},</p>
<p><strong>${esc(opts.actorName)}</strong> assigned you to the checklist item
   <strong>${esc(opts.subitemName)}</strong> on:</p>
${projectSummary(opts.projectCode, opts.projectName)}
<p>Please complete this item when ready and mark the status in the app.</p>`;

  return {
    subject,
    message,
    html: wrapEmailLayout({
      headline: "Task assignment",
      bodyHtml: body,
      ctaLabel: "Open checklist"
    })
  };
}

/** Manual message from the board notification button. */
export function buildManualProjectUpdateEmail(opts: {
  recipientName: string;
  actorName: string;
  projectCode: string;
  projectName: string;
  messageBody: string;
}): EmailPayload {
  const hi = esc(firstNameFromDisplayName(opts.recipientName));
  const subject = `Project update: ${opts.projectCode} — ${opts.projectName}`;
  const plain = opts.messageBody.trim();
  const message = `${opts.actorName} sent a message about ${opts.projectCode}: ${plain}`;

  const body = `<p>Hi ${hi},</p>
<p><strong>${esc(opts.actorName)}</strong> sent you a message about
   <strong>${esc(opts.projectCode)}</strong> — <strong>${esc(opts.projectName)}</strong>:</p>
<div style="margin:16px 0;padding:14px 16px;background:#f8fafc;border-left:4px solid #0A5D6B;
            border-radius:4px;color:#334155;white-space:pre-wrap">${esc(plain)}</div>`;

  return {
    subject,
    message,
    html: wrapEmailLayout({
      headline: "Project message",
      bodyHtml: body,
      ctaLabel: "Open Project Timeline"
    })
  };
}
