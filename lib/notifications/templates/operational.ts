import { firstNameFromDisplayName } from "../html";
import { renderEmailTemplate, type RenderedEmail } from "../templateEngine";

export type EmailPayload = RenderedEmail;

/** Cron: subitem due date is today. */
export function buildDueTodayEmail(opts: {
  recipientName: string;
  subitemName: string;
  projectCode: string;
  projectName: string;
  dueDate: string;
}): Promise<EmailPayload> {
  return renderEmailTemplate(
    "dueDateReminder",
    { headline: "Due today", ctaLabel: "Open Project Timeline" },
    {
      text: {
        firstName: firstNameFromDisplayName(opts.recipientName),
        subitemName: opts.subitemName,
        projectCode: opts.projectCode,
        projectName: opts.projectName,
        dueDate: opts.dueDate
      }
    }
  );
}

/** Project owner changed on an existing project. */
export function buildProjectOwnerAssignedEmail(opts: {
  recipientName: string;
  actorName: string;
  projectCode: string;
  projectName: string;
}): Promise<EmailPayload> {
  return renderEmailTemplate(
    "ownerAssigned",
    { headline: "Project assignment", ctaLabel: "View project" },
    {
      text: {
        firstName: firstNameFromDisplayName(opts.recipientName),
        actorName: opts.actorName,
        projectCode: opts.projectCode,
        projectName: opts.projectName
      }
    }
  );
}

/** Project status changed (notifies project owner). */
export function buildProjectStatusChangedEmail(opts: {
  recipientName: string;
  actorName: string;
  projectCode: string;
  projectName: string;
  newStatus: string;
}): Promise<EmailPayload> {
  return renderEmailTemplate(
    "statusChanged",
    { headline: "Status update", ctaLabel: "Open Project Timeline" },
    {
      text: {
        firstName: firstNameFromDisplayName(opts.recipientName),
        actorName: opts.actorName,
        projectCode: opts.projectCode,
        projectName: opts.projectName,
        newStatus: opts.newStatus
      }
    }
  );
}

/** Subitem owner changed. */
export function buildSubitemAssignedEmail(opts: {
  recipientName: string;
  actorName: string;
  subitemName: string;
  projectCode: string;
  projectName: string;
}): Promise<EmailPayload> {
  return renderEmailTemplate(
    "subitemAssigned",
    { headline: "Task assignment", ctaLabel: "Open checklist" },
    {
      text: {
        firstName: firstNameFromDisplayName(opts.recipientName),
        actorName: opts.actorName,
        subitemName: opts.subitemName,
        projectCode: opts.projectCode,
        projectName: opts.projectName
      }
    }
  );
}

/** Manual message from the board notification button. */
export function buildManualProjectUpdateEmail(opts: {
  recipientName: string;
  actorName: string;
  projectCode: string;
  projectName: string;
  messageBody: string;
}): Promise<EmailPayload> {
  return renderEmailTemplate(
    "manualMessage",
    { headline: "Project message", ctaLabel: "Open Project Timeline" },
    {
      text: {
        firstName: firstNameFromDisplayName(opts.recipientName),
        actorName: opts.actorName,
        projectCode: opts.projectCode,
        projectName: opts.projectName,
        messageBody: opts.messageBody.trim()
      }
    }
  );
}
