import path from "node:path";
import { promises as fs } from "node:fs";
import { sql } from "drizzle-orm";
import type {
  EmailTemplate,
  EmailTemplateKey,
  NotificationCategory
} from "@/lib/notifications/emailConfigTypes";

// Persists admin-configured notification settings in the existing `site_config` table
// (key = "email_config") for Postgres, or a JSON file for the file-based driver. Stores
// only non-sensitive settings: the global email switch, per-event toggles, and the
// editable subject/body templates. Email transport (SMTP/Graph) stays in the environment.

/** Raw stored shape. Templates hold per-key subject/body overrides (partial). */
export interface StoredNotificationConfig {
  emailEnabled?: boolean;
  eventToggles?: Partial<Record<NotificationCategory, boolean>>;
  templates?: Partial<Record<EmailTemplateKey, Partial<EmailTemplate>>>;
  updatedAt?: string;
  updatedByEmail?: string;
}

const CONFIG_KEY = "email_config";

function isPostgresDriver(): boolean {
  return (process.env.STORAGE_DRIVER ?? "json") === "postgres";
}

async function pgDb() {
  const { getDb } = await import("@/lib/db/client");
  return getDb();
}

function jsonFilePath(): string {
  return path.join(process.cwd(), "data", "email-config.json");
}

let cached: StoredNotificationConfig | null | undefined;

export function invalidateEmailConfigCache(): void {
  cached = undefined;
}

/** Reads the stored notification config. Cached until invalidated. */
export async function readStoredNotificationConfig(): Promise<StoredNotificationConfig | null> {
  if (cached !== undefined) return cached;

  if (isPostgresDriver()) {
    const db = await pgDb();
    const rows = await db.execute<{
      value: unknown;
      updated_at: string | null;
      updated_by: string | null;
    }>(sql`SELECT value, updated_at, updated_by FROM site_config WHERE key = ${CONFIG_KEY} LIMIT 1`);
    const row = rows.rows[0];
    if (!row) {
      cached = null;
      return cached;
    }
    const value = (row.value ?? {}) as StoredNotificationConfig;
    cached = {
      ...value,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
      updatedByEmail: row.updated_by ?? undefined
    };
    return cached;
  }

  try {
    const raw = await fs.readFile(jsonFilePath(), "utf8");
    cached = JSON.parse(raw) as StoredNotificationConfig;
  } catch {
    cached = null;
  }
  return cached;
}

/** Writes the full stored notification config. */
export async function writeStoredNotificationConfig(
  config: StoredNotificationConfig,
  actorEmail: string
): Promise<void> {
  const { updatedAt: _u, updatedByEmail: _b, ...persistable } = config;

  if (isPostgresDriver()) {
    const db = await pgDb();
    await db.execute(sql`
      INSERT INTO site_config (key, value, updated_at, updated_by)
      VALUES (${CONFIG_KEY}, ${JSON.stringify(persistable)}::jsonb, now(), ${actorEmail})
      ON CONFLICT (key) DO UPDATE
        SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at, updated_by = EXCLUDED.updated_by
    `);
    invalidateEmailConfigCache();
    return;
  }

  const dataDir = path.join(process.cwd(), "data");
  await fs.mkdir(dataDir, { recursive: true });
  const file = jsonFilePath();
  const next: StoredNotificationConfig = {
    ...persistable,
    updatedAt: new Date().toISOString(),
    updatedByEmail: actorEmail
  };
  const tmp = file + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(next, null, 2), "utf8");
  await fs.rename(tmp, file);
  invalidateEmailConfigCache();
}
