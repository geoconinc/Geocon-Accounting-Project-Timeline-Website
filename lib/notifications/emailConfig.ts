import { decryptSecret } from "@/lib/server/crypto/secretBox";
import { readStoredEmailConfig, type StoredEmailConfig } from "@/lib/server/site-data/emailConfigStore";
import {
  defaultEventToggles,
  type NotificationCategory
} from "./emailConfigTypes";

// Resolves effective email settings by layering the admin DB config over environment
// variables over built-in defaults. Every send path reads through here, so admins can
// change email behaviour from the panel without a redeploy, while env vars remain the
// safe fallback when nothing is stored.

/** Fully resolved config with decrypted secrets, ready for the send path. */
export interface ResolvedEmailConfig {
  driver: "smtp" | "graph";
  smtpHost: string | null;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string | null;
  smtpPassword: string | null;
  fromAddress: string | null;
  fromName: string;
  graphTenantId: string | null;
  graphClientId: string | null;
  graphClientSecret: string | null;
  emailEnabled: boolean;
  eventToggles: Record<NotificationCategory, boolean>;
}

const DEFAULT_FROM_NAME = "Geocon Project Management";
const DEFAULT_SMTP_PORT = 587;

function firstNonEmpty(...values: (string | undefined | null)[]): string | null {
  for (const v of values) {
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return null;
}

function resolveDriver(stored: StoredEmailConfig | null, smtpReady: boolean): "smtp" | "graph" {
  const candidate =
    (stored?.driver && stored.driver !== "auto" ? stored.driver : undefined) ??
    (process.env.EMAIL_DRIVER?.toLowerCase() as "smtp" | "graph" | undefined);
  if (candidate === "smtp" || candidate === "graph") return candidate;
  return smtpReady ? "smtp" : "graph";
}

export async function getEffectiveEmailConfig(): Promise<ResolvedEmailConfig> {
  const stored = await readStoredEmailConfig();

  const smtpHost = firstNonEmpty(stored?.smtpHost, process.env.SMTP_HOST);
  const smtpUser = firstNonEmpty(stored?.smtpUser, process.env.SMTP_USER);
  const smtpPassword =
    (stored?.smtpPasswordEnc ? decryptSecret(stored.smtpPasswordEnc) : null) ??
    firstNonEmpty(process.env.SMTP_PASSWORD);

  const smtpPort =
    stored?.smtpPort ?? (process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : DEFAULT_SMTP_PORT);
  const smtpSecure =
    typeof stored?.smtpSecure === "boolean"
      ? stored.smtpSecure
      : process.env.SMTP_SECURE === "true";

  const smtpReady = Boolean(smtpHost && smtpUser && smtpPassword);

  const graphClientSecret =
    (stored?.graphClientSecretEnc ? decryptSecret(stored.graphClientSecretEnc) : null) ??
    firstNonEmpty(process.env.GRAPH_APP_CLIENT_SECRET);

  return {
    driver: resolveDriver(stored, smtpReady),
    smtpHost,
    smtpPort: Number.isFinite(smtpPort) ? smtpPort : DEFAULT_SMTP_PORT,
    smtpSecure,
    smtpUser,
    smtpPassword,
    fromAddress: firstNonEmpty(stored?.fromAddress, process.env.NOTIFY_FROM_ADDRESS),
    fromName: firstNonEmpty(stored?.fromName, process.env.NOTIFY_FROM_NAME) ?? DEFAULT_FROM_NAME,
    graphTenantId: firstNonEmpty(stored?.graphTenantId, process.env.GRAPH_APP_TENANT_ID),
    graphClientId: firstNonEmpty(stored?.graphClientId, process.env.GRAPH_APP_CLIENT_ID),
    graphClientSecret,
    emailEnabled: stored?.emailEnabled !== false,
    eventToggles: { ...defaultEventToggles(), ...(stored?.eventToggles ?? {}) }
  };
}

/** True when email is globally on and the given category is enabled. */
export function isCategoryEnabled(
  config: ResolvedEmailConfig,
  category: NotificationCategory | undefined
): boolean {
  if (!config.emailEnabled) return false;
  if (!category) return true;
  return config.eventToggles[category] !== false;
}
