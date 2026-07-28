import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/server/routeAuth";
import { isOwnerUser } from "@/lib/auth/superAdmin";
import { isAdminAsync } from "@/lib/server/access";
import {
  readStoredNotificationConfig,
  writeStoredNotificationConfig,
  type StoredNotificationConfig
} from "@/lib/server/site-data/emailConfigStore";
import { getEffectiveNotificationConfig } from "@/lib/notifications/emailConfig";
import {
  EMAIL_TEMPLATE_DEFS,
  defaultEventToggles,
  type EmailTemplate,
  type EmailTemplateKey,
  type NotificationCategory,
  type NotificationConfigAdminView
} from "@/lib/notifications/emailConfigTypes";

// Serves and saves the admin-configurable notification settings: the global email
// kill-switch, per-event toggles, and the editable subject/body templates. Email transport
// (SMTP/Graph) is not configured here — it stays in the server environment.

export const dynamic = "force-dynamic";

const CATEGORY_KEYS = Object.keys(defaultEventToggles()) as NotificationCategory[];
const TEMPLATE_KEYS = EMAIL_TEMPLATE_DEFS.map((def) => def.key);
const MAX_FIELD_LENGTH = 5000;

/** Masks an email for admin display: `g***@geoconinc.com`. */
function fromAddressHint(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  const at = value.indexOf("@");
  if (at <= 0) return "***";
  return `${value[0]}***${value.slice(at)}`;
}

function buildDeliveryDiagnostics(): NotificationConfigAdminView["delivery"] {
  const from = process.env.NOTIFY_FROM_ADDRESS?.trim();
  return {
    driver: (process.env.EMAIL_DRIVER ?? "auto").toLowerCase(),
    fromAddressSet: Boolean(from),
    fromAddressHint: fromAddressHint(from),
    graphTenantSet: Boolean(process.env.GRAPH_APP_TENANT_ID?.trim()),
    graphClientIdSet: Boolean(process.env.GRAPH_APP_CLIENT_ID?.trim()),
    graphClientSecretSet: Boolean(process.env.GRAPH_APP_CLIENT_SECRET?.trim())
  };
}

/** Effective (merged with defaults) settings plus who/when last saved. */
async function buildAdminView(): Promise<NotificationConfigAdminView> {
  const [effective, stored] = await Promise.all([
    getEffectiveNotificationConfig(),
    readStoredNotificationConfig()
  ]);
  return {
    emailEnabled: effective.emailEnabled,
    testMode: effective.testMode,
    testRecipients: effective.testRecipients,
    eventToggles: effective.eventToggles,
    templates: effective.templates,
    delivery: buildDeliveryDiagnostics(),
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
  return NextResponse.json(await buildAdminView());
}

interface EmailConfigPutBody {
  emailEnabled?: boolean;
  testMode?: boolean;
  testRecipients?: string[];
  eventToggles?: Partial<Record<NotificationCategory, boolean>>;
  templates?: Partial<Record<EmailTemplateKey, Partial<EmailTemplate>>>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const existing = (await readStoredNotificationConfig()) ?? {};
  const next: StoredNotificationConfig = { ...existing };

  if (body.emailEnabled !== undefined) next.emailEnabled = Boolean(body.emailEnabled);
  if (body.testMode !== undefined) next.testMode = Boolean(body.testMode);

  if (body.testRecipients !== undefined) {
    if (!Array.isArray(body.testRecipients)) {
      return NextResponse.json({ error: "invalid_test_recipients" }, { status: 400 });
    }
    const cleaned = body.testRecipients
      .map((r) => (typeof r === "string" ? r.trim().toLowerCase() : ""))
      .filter((r) => r.length > 0);
    const invalid = cleaned.find((r) => !EMAIL_RE.test(r));
    if (invalid) {
      return NextResponse.json({ error: "invalid_test_recipient_email" }, { status: 400 });
    }
    next.testRecipients = Array.from(new Set(cleaned));
  }

  if (body.eventToggles !== undefined) {
    const toggles: Partial<Record<NotificationCategory, boolean>> = { ...existing.eventToggles };
    for (const key of CATEGORY_KEYS) {
      if (typeof body.eventToggles[key] === "boolean") toggles[key] = body.eventToggles[key];
    }
    next.eventToggles = toggles;
  }

  if (body.templates !== undefined) {
    const templates: Partial<Record<EmailTemplateKey, Partial<EmailTemplate>>> = {
      ...existing.templates
    };
    for (const key of TEMPLATE_KEYS) {
      const incoming = body.templates[key];
      if (!incoming) continue;
      const entry: Partial<EmailTemplate> = { ...templates[key] };
      if (typeof incoming.subject === "string") {
        if (incoming.subject.length > MAX_FIELD_LENGTH) {
          return NextResponse.json({ error: "template_too_long" }, { status: 400 });
        }
        entry.subject = incoming.subject;
      }
      if (typeof incoming.body === "string") {
        if (incoming.body.length > MAX_FIELD_LENGTH) {
          return NextResponse.json({ error: "template_too_long" }, { status: 400 });
        }
        entry.body = incoming.body;
      }
      templates[key] = entry;
    }
    next.templates = templates;
  }

  await writeStoredNotificationConfig(next, user.email);
  return NextResponse.json(await buildAdminView());
}
