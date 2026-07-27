// Shared, client-safe types for the admin-configurable email system. No secrets or
// server-only imports here so both the API/store and the admin UI can use them.

export type EmailDriver = "auto" | "smtp" | "graph";

/** Each outgoing email is tagged with one category so it can be toggled independently. */
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

/** Non-secret email settings, editable from the admin panel. */
export interface EmailConfigPublicFields {
  driver: EmailDriver;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  fromAddress: string;
  fromName: string;
  graphTenantId: string;
  graphClientId: string;
  emailEnabled: boolean;
  eventToggles: Record<NotificationCategory, boolean>;
}

/**
 * Shape returned by GET /api/admin/email-config. Secrets are never included; instead
 * boolean "set" flags tell the UI whether a value already exists.
 */
export interface EmailConfigAdminView extends EmailConfigPublicFields {
  smtpPasswordSet: boolean;
  graphClientSecretSet: boolean;
  encryptionAvailable: boolean;
  source: {
    hasDbConfig: boolean;
  };
  meta: {
    updatedAt: string | null;
    updatedByEmail: string | null;
  };
}
