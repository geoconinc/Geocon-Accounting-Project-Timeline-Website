import path from "node:path";
import { promises as fs } from "node:fs";
import { sql } from "drizzle-orm";
import type { GeoconRoleAssigneesFile } from "@/lib/types/roleAssigneeData";
import type { OfficeAssigneeRow } from "@/lib/domain/officeAssigneeResolve";
import { invalidateRoleAssigneesCache } from "./syncRoleAssignees";

export interface AdminSiteConfigFile {
  officeAssignees?: OfficeAssigneeRow[];
  roleAssignees?: GeoconRoleAssigneesFile | null;
  updatedAt?: string;
  updatedByEmail?: string;
}

const CONFIG_KEY = "admin_site_config";

function isPostgresDriver(): boolean {
  return (process.env.STORAGE_DRIVER ?? "json") === "postgres";
}

async function pgDb() {
  const { getDb } = await import("@/lib/db/client");
  return getDb();
}

export async function readAdminSiteConfig(): Promise<AdminSiteConfigFile | null> {
  if (isPostgresDriver()) {
    const db = await pgDb();
    const rows = await db.execute<{
      value: unknown;
      updated_at: string | null;
      updated_by: string | null;
    }>(sql`SELECT value, updated_at, updated_by FROM site_config WHERE key = ${CONFIG_KEY} LIMIT 1`);
    const row = rows.rows[0];
    if (!row) return null;
    const value = row.value as AdminSiteConfigFile;
    return {
      ...value,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
      updatedByEmail: row.updated_by ?? undefined
    };
  }

  try {
    const file = path.join(process.cwd(), "data", "admin-site-config.json");
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as AdminSiteConfigFile;
  } catch {
    return null;
  }
}

export async function writeAdminSiteConfig(
  patch: { officeAssignees: OfficeAssigneeRow[]; roleAssignees: GeoconRoleAssigneesFile | null },
  actorEmail: string
): Promise<void> {
  if (isPostgresDriver()) {
    const db = await pgDb();
    const value = { officeAssignees: patch.officeAssignees, roleAssignees: patch.roleAssignees };
    await db.execute(sql`
      INSERT INTO site_config (key, value, updated_at, updated_by)
      VALUES (${CONFIG_KEY}, ${JSON.stringify(value)}::jsonb, now(), ${actorEmail})
      ON CONFLICT (key) DO UPDATE
        SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at, updated_by = EXCLUDED.updated_by
    `);
    invalidateRoleAssigneesCache();
    return;
  }

  const DATA_DIR = path.join(process.cwd(), "data");
  await fs.mkdir(DATA_DIR, { recursive: true });
  const FILE = path.join(DATA_DIR, "admin-site-config.json");
  const next: AdminSiteConfigFile = {
    officeAssignees: patch.officeAssignees,
    roleAssignees: patch.roleAssignees,
    updatedAt: new Date().toISOString(),
    updatedByEmail: actorEmail
  };
  const tmp = FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(next, null, 2), "utf8");
  await fs.rename(tmp, FILE);
}

const ADMIN_EMAILS_KEY = "board_admin_emails";

let cachedAdminEmails: string[] | null = null;

export function invalidateAdminEmailsCache(): void {
  cachedAdminEmails = null;
}

export async function getStoredBoardAdminEmails(): Promise<string[]> {
  if (cachedAdminEmails) return cachedAdminEmails;

  if (isPostgresDriver()) {
    const db = await pgDb();
    const rows = await db.execute<{ value: unknown }>(
      sql`SELECT value FROM site_config WHERE key = ${ADMIN_EMAILS_KEY} LIMIT 1`
    );
    const row = rows.rows[0];
    if (row && Array.isArray((row.value as { emails?: string[] }).emails)) {
      cachedAdminEmails = (row.value as { emails: string[] }).emails;
      return cachedAdminEmails;
    }
  }

  cachedAdminEmails = [];
  return cachedAdminEmails;
}

export async function setStoredBoardAdminEmails(
  emails: string[],
  actorEmail: string
): Promise<void> {
  if (isPostgresDriver()) {
    const db = await pgDb();
    const value = { emails };
    await db.execute(sql`
      INSERT INTO site_config (key, value, updated_at, updated_by)
      VALUES (${ADMIN_EMAILS_KEY}, ${JSON.stringify(value)}::jsonb, now(), ${actorEmail})
      ON CONFLICT (key) DO UPDATE
        SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at, updated_by = EXCLUDED.updated_by
    `);
  }
  cachedAdminEmails = emails;
}

/** Admin Postgres override when set; otherwise bundled data/officeAssigneeDirectory.json. */
export async function getEffectiveOfficeAssigneeRows(): Promise<OfficeAssigneeRow[]> {
  const admin = await readAdminSiteConfig();
  if (admin?.officeAssignees && admin.officeAssignees.length > 0) {
    return admin.officeAssignees;
  }

  try {
    const bundledPath = path.join(process.cwd(), "data", "officeAssigneeDirectory.json");
    const raw = await fs.readFile(bundledPath, "utf8");
    const parsed = JSON.parse(raw) as { assignees: OfficeAssigneeRow[] };
    return parsed.assignees ?? [];
  } catch {
    return [];
  }
}
