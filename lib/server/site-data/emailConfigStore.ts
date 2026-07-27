import path from "node:path";
import { promises as fs } from "node:fs";
import { sql } from "drizzle-orm";
import type { EmailDriver, NotificationCategory } from "@/lib/notifications/emailConfigTypes";

// Persists the admin-configured email settings in the existing `site_config` table
// (key = "email_config") for Postgres, or a JSON file for the file-based driver. Secrets
// are stored already-encrypted (the `*Enc` fields); this module never encrypts/decrypts,
// so plaintext secrets never pass through the persistence layer.

/** Raw stored shape. Secrets are ciphertext blobs from lib/server/crypto/secretBox. */
export interface StoredEmailConfig {
  driver?: EmailDriver;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  fromAddress?: string;
  fromName?: string;
  graphTenantId?: string;
  graphClientId?: string;
  smtpPasswordEnc?: string;
  graphClientSecretEnc?: string;
  emailEnabled?: boolean;
  eventToggles?: Partial<Record<NotificationCategory, boolean>>;
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

let cached: StoredEmailConfig | null | undefined;

export function invalidateEmailConfigCache(): void {
  cached = undefined;
}

/** Reads the stored config (with encrypted secrets). Cached until invalidated. */
export async function readStoredEmailConfig(): Promise<StoredEmailConfig | null> {
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
    const value = (row.value ?? {}) as StoredEmailConfig;
    cached = {
      ...value,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
      updatedByEmail: row.updated_by ?? undefined
    };
    return cached;
  }

  try {
    const raw = await fs.readFile(jsonFilePath(), "utf8");
    cached = JSON.parse(raw) as StoredEmailConfig;
  } catch {
    cached = null;
  }
  return cached;
}

/** Writes the full stored config (secrets must already be encrypted by the caller). */
export async function writeStoredEmailConfig(
  config: StoredEmailConfig,
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
  const next: StoredEmailConfig = {
    ...persistable,
    updatedAt: new Date().toISOString(),
    updatedByEmail: actorEmail
  };
  const tmp = file + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(next, null, 2), "utf8");
  await fs.rename(tmp, file);
  invalidateEmailConfigCache();
}
