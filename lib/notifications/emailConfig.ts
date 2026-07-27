import { OWNER_EMAIL } from "@/lib/auth/superAdmin";
import {
  readStoredNotificationConfig,
  type StoredNotificationConfig
} from "@/lib/server/site-data/emailConfigStore";
import {
  defaultEventToggles,
  defaultTemplates,
  type EmailTemplate,
  type EmailTemplateKey,
  type NotificationCategory
} from "./emailConfigTypes";

// Resolves the effective notification config by layering the admin DB config over the
// built-in defaults. Every send/gate path reads through here, so admins can change email
// content and toggles from the panel without a redeploy.

export interface ResolvedNotificationConfig {
  emailEnabled: boolean;
  testMode: boolean;
  testRecipients: string[];
  eventToggles: Record<NotificationCategory, boolean>;
  templates: Record<EmailTemplateKey, EmailTemplate>;
}

/**
 * Cleans a stored recipient list to lowercased, non-empty, de-duplicated addresses.
 * Falls back to the app owner so enabling test mode without a recipient still routes to
 * a safe address rather than accidentally emailing employees or silently dropping mail.
 */
function resolveTestRecipients(stored: StoredNotificationConfig | null): string[] {
  const cleaned = (stored?.testRecipients ?? [])
    .map((r) => r.trim().toLowerCase())
    .filter((r) => r.length > 0);
  const unique = Array.from(new Set(cleaned));
  return unique.length > 0 ? unique : [OWNER_EMAIL];
}

function mergeTemplates(
  stored: StoredNotificationConfig | null
): Record<EmailTemplateKey, EmailTemplate> {
  const templates = defaultTemplates();
  const overrides = stored?.templates ?? {};
  for (const key of Object.keys(templates) as EmailTemplateKey[]) {
    const override = overrides[key];
    if (!override) continue;
    templates[key] = {
      subject: override.subject?.trim() ? override.subject : templates[key].subject,
      body: override.body?.trim() ? override.body : templates[key].body
    };
  }
  return templates;
}

export async function getEffectiveNotificationConfig(): Promise<ResolvedNotificationConfig> {
  const stored = await readStoredNotificationConfig();
  return {
    emailEnabled: stored?.emailEnabled !== false,
    testMode: stored?.testMode === true,
    testRecipients: resolveTestRecipients(stored),
    eventToggles: { ...defaultEventToggles(), ...(stored?.eventToggles ?? {}) },
    templates: mergeTemplates(stored)
  };
}

/** True when email is globally on and the given category is enabled. */
export function isCategoryEnabled(
  config: ResolvedNotificationConfig,
  category: NotificationCategory | undefined
): boolean {
  if (!config.emailEnabled) return false;
  if (!category) return true;
  return config.eventToggles[category] !== false;
}
