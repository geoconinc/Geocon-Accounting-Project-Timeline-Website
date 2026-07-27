import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/server/routeAuth";
import { isOwnerUser } from "@/lib/auth/superAdmin";
import { isAdminAsync } from "@/lib/server/access";
import { encryptSecret, isSecretEncryptionAvailable } from "@/lib/server/crypto/secretBox";
import {
  readStoredEmailConfig,
  writeStoredEmailConfig,
  type StoredEmailConfig
} from "@/lib/server/site-data/emailConfigStore";
import {
  defaultEventToggles,
  type EmailConfigAdminView,
  type EmailDriver,
  type NotificationCategory
} from "@/lib/notifications/emailConfigTypes";

export const dynamic = "force-dynamic";

const DRIVERS: EmailDriver[] = ["auto", "smtp", "graph"];
const CATEGORY_KEYS = Object.keys(defaultEventToggles()) as NotificationCategory[];

function str(value: string | undefined, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

/** Builds the admin-facing view: current effective non-secret values, secrets masked. */
function buildAdminView(stored: StoredEmailConfig | null): EmailConfigAdminView {
  const driver =
    stored?.driver ??
    ((process.env.EMAIL_DRIVER?.toLowerCase() as EmailDriver | undefined) &&
    DRIVERS.includes(process.env.EMAIL_DRIVER!.toLowerCase() as EmailDriver)
      ? (process.env.EMAIL_DRIVER!.toLowerCase() as EmailDriver)
      : "auto");

  return {
    driver,
    smtpHost: str(stored?.smtpHost, process.env.SMTP_HOST ?? ""),
    smtpPort: stored?.smtpPort ?? (process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587),
    smtpSecure:
      typeof stored?.smtpSecure === "boolean"
        ? stored.smtpSecure
        : process.env.SMTP_SECURE === "true",
    smtpUser: str(stored?.smtpUser, process.env.SMTP_USER ?? ""),
    fromAddress: str(stored?.fromAddress, process.env.NOTIFY_FROM_ADDRESS ?? ""),
    fromName: str(stored?.fromName, process.env.NOTIFY_FROM_NAME ?? "Geocon Project Management"),
    graphTenantId: str(stored?.graphTenantId, process.env.GRAPH_APP_TENANT_ID ?? ""),
    graphClientId: str(stored?.graphClientId, process.env.GRAPH_APP_CLIENT_ID ?? ""),
    emailEnabled: stored?.emailEnabled !== false,
    eventToggles: { ...defaultEventToggles(), ...(stored?.eventToggles ?? {}) },
    smtpPasswordSet: Boolean(stored?.smtpPasswordEnc) || Boolean(process.env.SMTP_PASSWORD),
    graphClientSecretSet:
      Boolean(stored?.graphClientSecretEnc) || Boolean(process.env.GRAPH_APP_CLIENT_SECRET),
    encryptionAvailable: isSecretEncryptionAvailable(),
    source: { hasDbConfig: stored !== null },
    meta: {
      updatedAt: stored?.updatedAt ?? null,
      updatedByEmail: stored?.updatedByEmail ?? null
    }
  };
}

export async function GET() {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;
  if (!(await isAdminAsync(user))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const stored = await readStoredEmailConfig();
  return NextResponse.json(buildAdminView(stored));
}

interface EmailConfigPutBody {
  driver?: EmailDriver;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  fromAddress?: string;
  fromName?: string;
  graphTenantId?: string;
  graphClientId?: string;
  emailEnabled?: boolean;
  eventToggles?: Partial<Record<NotificationCategory, boolean>>;
  // Write-only plaintext secrets. Absent = keep existing; "" = clear; non-empty = replace.
  smtpPassword?: string;
  graphClientSecret?: string;
}

/**
 * Encrypts a write-only secret field into the merged config. Returns an error string when
 * a non-empty secret is supplied but no encryption key is configured.
 */
function applySecret(
  next: StoredEmailConfig,
  encKey: "smtpPasswordEnc" | "graphClientSecretEnc",
  incoming: string | undefined
): string | null {
  if (incoming === undefined) return null;
  if (incoming === "") {
    delete next[encKey];
    return null;
  }
  if (!isSecretEncryptionAvailable()) return "encryption_unavailable";
  next[encKey] = encryptSecret(incoming);
  return null;
}

export async function PUT(req: Request) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;
  if (!isOwnerUser(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: EmailConfigPutBody;
  try {
    body = (await req.json()) as EmailConfigPutBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (body.driver !== undefined && !DRIVERS.includes(body.driver)) {
    return NextResponse.json({ error: "invalid_driver" }, { status: 400 });
  }
  if (body.smtpPort !== undefined && (!Number.isInteger(body.smtpPort) || body.smtpPort <= 0)) {
    return NextResponse.json({ error: "invalid_smtp_port" }, { status: 400 });
  }

  const existing = (await readStoredEmailConfig()) ?? {};
  const next: StoredEmailConfig = { ...existing };

  if (body.driver !== undefined) next.driver = body.driver;
  if (body.smtpHost !== undefined) next.smtpHost = body.smtpHost.trim();
  if (body.smtpPort !== undefined) next.smtpPort = body.smtpPort;
  if (body.smtpSecure !== undefined) next.smtpSecure = Boolean(body.smtpSecure);
  if (body.smtpUser !== undefined) next.smtpUser = body.smtpUser.trim();
  if (body.fromAddress !== undefined) next.fromAddress = body.fromAddress.trim();
  if (body.fromName !== undefined) next.fromName = body.fromName.trim();
  if (body.graphTenantId !== undefined) next.graphTenantId = body.graphTenantId.trim();
  if (body.graphClientId !== undefined) next.graphClientId = body.graphClientId.trim();
  if (body.emailEnabled !== undefined) next.emailEnabled = Boolean(body.emailEnabled);

  if (body.eventToggles !== undefined) {
    const toggles: Partial<Record<NotificationCategory, boolean>> = { ...existing.eventToggles };
    for (const key of CATEGORY_KEYS) {
      if (typeof body.eventToggles[key] === "boolean") toggles[key] = body.eventToggles[key];
    }
    next.eventToggles = toggles;
  }

  const secretError =
    applySecret(next, "smtpPasswordEnc", body.smtpPassword) ??
    applySecret(next, "graphClientSecretEnc", body.graphClientSecret);
  if (secretError) {
    return NextResponse.json({ error: secretError }, { status: 400 });
  }

  await writeStoredEmailConfig(next, user.email);

  const stored = await readStoredEmailConfig();
  return NextResponse.json(buildAdminView(stored));
}
