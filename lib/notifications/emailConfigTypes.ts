// Shared, client-safe types for the admin-configurable notification system. No server
// imports here so both the API/store and the admin UI can use them.
//
// Two things are configurable from the admin panel:
//   1. Toggles  — a global email kill-switch plus a per-event on/off (NotificationCategory).
//   2. Templates — the subject line and body copy of each email, with {{token}} merge
//      fields. Templates are keyed by EmailTemplateKey (finer-grained than categories,
//      e.g. the single "projectCreated" category has separate PM and assignee templates).

/** Each outgoing email is tagged with one category for the global/per-event toggles. */
export type NotificationCategory =
  | "projectCreated"
  | "ownerAssigned"
  | "subitemAssigned"
  | "statusChanged"
  | "manualMessage"
  | "dueDateReminder"
  | "dasFollowup"
  | "incompleteWeek";

export const NOTIFICATION_CATEGORIES: {
  key: NotificationCategory;
  label: string;
  description: string;
}[] = [
  { key: "projectCreated", label: "Project created", description: "PM and assignees are emailed when a project is created." },
  { key: "ownerAssigned", label: "Project owner assigned", description: "The new owner is emailed when assigned a project." },
  { key: "subitemAssigned", label: "Task assigned", description: "The owner is emailed when assigned a task." },
  { key: "statusChanged", label: "Project status changed", description: "The owner is emailed when a project status changes." },
  { key: "manualMessage", label: "Manual board messages", description: "Messages sent manually from the board." },
  { key: "dueDateReminder", label: "Due-today reminders", description: "Daily reminder for tasks due today." },
  { key: "dasFollowup", label: "Weekly DAS digest", description: "Weekly DAS follow-up digest." },
  { key: "incompleteWeek", label: "One-week incomplete digest", description: "Digest of items still incomplete after a week." }
];

/** All categories default to enabled. */
export function defaultEventToggles(): Record<NotificationCategory, boolean> {
  return {
    projectCreated: true,
    ownerAssigned: true,
    subitemAssigned: true,
    statusChanged: true,
    manualMessage: true,
    dueDateReminder: true,
    dasFollowup: true,
    incompleteWeek: true
  };
}

/** Editable content for one email type. */
export interface EmailTemplate {
  subject: string;
  body: string;
}

export type EmailTemplateKey =
  | "projectManagerCreated"
  | "assigneeDigest"
  | "ownerAssigned"
  | "statusChanged"
  | "subitemAssigned"
  | "manualMessage"
  | "dueDateReminder"
  | "dasFollowup"
  | "incompleteWeek";

export interface EmailTemplateToken {
  name: string;
  description: string;
}

export interface EmailTemplateDef {
  key: EmailTemplateKey;
  label: string;
  description: string;
  tokens: EmailTemplateToken[];
  default: EmailTemplate;
}

const RECIPIENT_TOKEN: EmailTemplateToken = {
  name: "firstName",
  description: "Recipient's first name"
};

/**
 * Default subject/body for every email type. `{{token}}` fields are replaced at send
 * time; body text is rendered with line breaks preserved and wrapped in the branded
 * layout. Tokens like {{taskList}} / {{itemTable}} expand to a formatted list/table.
 */
export const EMAIL_TEMPLATE_DEFS: EmailTemplateDef[] = [
  {
    key: "dueDateReminder",
    label: "Due-today reminder",
    description: "Sent to a task owner when their checklist item is due today.",
    tokens: [
      RECIPIENT_TOKEN,
      { name: "subitemName", description: "Name of the checklist item" },
      { name: "projectCode", description: "Project code" },
      { name: "projectName", description: "Project name" },
      { name: "dueDate", description: "Due date (YYYY-MM-DD)" }
    ],
    default: {
      subject: "Due today: {{subitemName}} · {{projectCode}}",
      body:
        "Hi {{firstName}},\n\n" +
        "This is a reminder that the checklist item \"{{subitemName}}\" on project {{projectCode}} — {{projectName}} is due today ({{dueDate}}).\n\n" +
        "Please complete the item or update its status in the timeline."
    }
  },
  {
    key: "subitemAssigned",
    label: "Task assigned",
    description: "Sent when a user is assigned to a checklist item.",
    tokens: [
      RECIPIENT_TOKEN,
      { name: "actorName", description: "Person who made the assignment" },
      { name: "subitemName", description: "Name of the checklist item" },
      { name: "projectCode", description: "Project code" },
      { name: "projectName", description: "Project name" }
    ],
    default: {
      subject: "Assigned: {{subitemName}} · {{projectCode}}",
      body:
        "Hi {{firstName}},\n\n" +
        "{{actorName}} assigned you to the checklist item \"{{subitemName}}\" on {{projectCode}} — {{projectName}}.\n\n" +
        "Please complete this item when ready and mark the status in the app."
    }
  },
  {
    key: "ownerAssigned",
    label: "Project owner assigned",
    description: "Sent to the new project owner.",
    tokens: [
      RECIPIENT_TOKEN,
      { name: "actorName", description: "Person who made the assignment" },
      { name: "projectCode", description: "Project code" },
      { name: "projectName", description: "Project name" }
    ],
    default: {
      subject: "You were assigned to {{projectCode}} — {{projectName}}",
      body:
        "Hi {{firstName}},\n\n" +
        "{{actorName}} assigned you as project owner on {{projectCode}} — {{projectName}}.\n\n" +
        "Open the board to review subitems and update statuses."
    }
  },
  {
    key: "statusChanged",
    label: "Project status changed",
    description: "Sent to the project owner when the status changes.",
    tokens: [
      RECIPIENT_TOKEN,
      { name: "actorName", description: "Person who changed the status" },
      { name: "projectCode", description: "Project code" },
      { name: "projectName", description: "Project name" },
      { name: "newStatus", description: "The new project status" }
    ],
    default: {
      subject: "{{projectCode}} status updated to {{newStatus}}",
      body:
        "Hi {{firstName}},\n\n" +
        "{{actorName}} updated the status of {{projectCode}} — {{projectName}} to {{newStatus}}."
    }
  },
  {
    key: "manualMessage",
    label: "Manual board message",
    description: "Sent when someone messages a user from the board notification button.",
    tokens: [
      RECIPIENT_TOKEN,
      { name: "actorName", description: "Person who sent the message" },
      { name: "projectCode", description: "Project code" },
      { name: "projectName", description: "Project name" },
      { name: "messageBody", description: "The typed message" }
    ],
    default: {
      subject: "Project update: {{projectCode}} — {{projectName}}",
      body:
        "Hi {{firstName}},\n\n" +
        "{{actorName}} sent you a message about {{projectCode}} — {{projectName}}:\n\n" +
        "{{messageBody}}"
    }
  },
  {
    key: "projectManagerCreated",
    label: "New project — Project Manager",
    description: "Sent to the project manager when a project is created.",
    tokens: [
      RECIPIENT_TOKEN,
      { name: "creatorName", description: "Person who created the project" },
      { name: "projectCode", description: "Project code" },
      { name: "projectName", description: "Project name" },
      { name: "office", description: "Project office" },
      { name: "setupNote", description: "DAS Setup Sheet note (varies by assignment)" },
      { name: "taskList", description: "Formatted list of assigned checklist items" }
    ],
    default: {
      subject: "Action needed: DAS 140 for {{projectCode}} — {{projectName}}",
      body:
        "Hi {{firstName}},\n\n" +
        "{{creatorName}} created project {{projectCode}} — {{projectName}} ({{office}}) and assigned you as project manager.\n\n" +
        "DAS 140: Please ensure the DAS 140 form is set up and completed for this project. If it is not done yet, you are the accountable contact.\n\n" +
        "{{setupNote}}\n\n" +
        "{{taskList}}\n\n" +
        "Update statuses and attach files in the timeline when each step is complete."
    }
  },
  {
    key: "assigneeDigest",
    label: "New project — Assignee tasks",
    description: "Sent to accounting/payroll contacts with the tasks they own on a new project.",
    tokens: [
      RECIPIENT_TOKEN,
      { name: "creatorName", description: "Person who created the project" },
      { name: "projectCode", description: "Project code" },
      { name: "projectName", description: "Project name" },
      { name: "office", description: "Project office" },
      { name: "taskList", description: "Formatted list of assigned checklist items" }
    ],
    default: {
      subject: "New project {{projectCode}}: your tasks ({{office}})",
      body:
        "Hi {{firstName}},\n\n" +
        "{{creatorName}} created a new project in the Geocon Project Timeline: {{projectCode}} — {{projectName}} ({{office}}).\n\n" +
        "You are assigned the following checklist items (complete them in the app when ready):\n\n" +
        "{{taskList}}\n\n" +
        "If you have questions, contact the project manager listed on the board."
    }
  },
  {
    key: "dasFollowup",
    label: "Weekly DAS digest",
    description: "Weekly reminder of incomplete DAS items.",
    tokens: [
      RECIPIENT_TOKEN,
      { name: "itemCount", description: "Number of incomplete items" },
      { name: "itemLabel", description: "\"item\" or \"items\" (auto-pluralized)" },
      { name: "itemTable", description: "Formatted table of incomplete items" }
    ],
    default: {
      subject: "Weekly reminder: {{itemCount}} incomplete DAS {{itemLabel}}",
      body:
        "Hi {{firstName}},\n\n" +
        "This is your weekly reminder that you have {{itemCount}} incomplete DAS {{itemLabel}} assigned to you:\n\n" +
        "{{itemTable}}\n\n" +
        "Please complete these items or update their status in the app."
    }
  },
  {
    key: "incompleteWeek",
    label: "One-week incomplete digest",
    description: "Sent when assigned items are still incomplete a week after creation.",
    tokens: [
      RECIPIENT_TOKEN,
      { name: "itemCount", description: "Number of incomplete items" },
      { name: "itemLabel", description: "\"item\" or \"items\" (auto-pluralized)" },
      { name: "itemTable", description: "Formatted table of incomplete items" }
    ],
    default: {
      subject: "Action needed: {{itemCount}} {{itemLabel}} incomplete after 1 week",
      body:
        "Hi {{firstName}},\n\n" +
        "The following checklist {{itemLabel}} ({{itemCount}}) were assigned about a week ago and are still not marked complete:\n\n" +
        "{{itemTable}}\n\n" +
        "Please complete these items or update their status in the app."
    }
  }
];

/** Full default template map, keyed by template key. */
export function defaultTemplates(): Record<EmailTemplateKey, EmailTemplate> {
  const out = {} as Record<EmailTemplateKey, EmailTemplate>;
  for (const def of EMAIL_TEMPLATE_DEFS) {
    out[def.key] = { subject: def.default.subject, body: def.default.body };
  }
  return out;
}

/** Shape returned by GET /api/admin/email-config. */
export interface NotificationConfigAdminView {
  emailEnabled: boolean;
  /**
   * Test mode: emails are still generated and sent, but every recipient is replaced with
   * `testRecipients` (the subject is prefixed with the intended recipient). Lets you verify
   * the whole system end-to-end without real employees receiving anything.
   */
  testMode: boolean;
  testRecipients: string[];
  eventToggles: Record<NotificationCategory, boolean>;
  templates: Record<EmailTemplateKey, EmailTemplate>;
  /** Runtime delivery diagnostics (env vars). Secrets are never returned. */
  delivery: {
    driver: string;
    fromAddressSet: boolean;
    fromAddressHint: string | null;
    graphTenantSet: boolean;
    graphClientIdSet: boolean;
    graphClientSecretSet: boolean;
  };
  meta: {
    updatedAt: string | null;
    updatedByEmail: string | null;
  };
}
