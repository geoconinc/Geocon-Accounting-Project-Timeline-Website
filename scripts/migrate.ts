import { promises as fs } from "node:fs";
import path from "node:path";
import { Client } from "pg";

const MIGRATIONS = [
  "0001_init.sql",
  "0002_project_manager_director.sql",
  "0003_notification_prefs_global.sql",
  "0004_drop_notification_prefs.sql",
  "0005_site_config.sql",
  "0006_subitem_created_at.sql",
  "0007_file_data.sql",
  "0008_users_last_login_at.sql",
  "0009_gms_integration.sql",
  "0010_gms_das_fields.sql"
];

const BASELINE_FOR_EXISTING_DB = MIGRATIONS.slice(0, 5);

async function ensureMigrationsTable(client: Client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function getApplied(client: Client): Promise<Set<string>> {
  const { rows } = await client.query<{ name: string }>("SELECT name FROM schema_migrations");
  return new Set(rows.map((r) => r.name));
}

async function markApplied(client: Client, name: string) {
  await client.query(
    "INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING",
    [name]
  );
}

async function tableExists(client: Client, table: string): Promise<boolean> {
  const { rows } = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    ) AS exists`,
    [table]
  );
  return rows[0]?.exists ?? false;
}

async function columnExists(client: Client, table: string, column: string): Promise<boolean> {
  const { rows } = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
    ) AS exists`,
    [table, column]
  );
  return rows[0]?.exists ?? false;
}

/** Existing deployments that ran migrate before schema_migrations existed. */
async function bootstrapExistingDb(client: Client) {
  const applied = await getApplied(client);
  if (applied.size > 0) return;

  if (!(await tableExists(client, "projects"))) return;

  for (const name of BASELINE_FOR_EXISTING_DB) {
    await markApplied(client, name);
  }
  console.log("Bootstrapped schema_migrations for existing database (0001–0005).");

  if (await columnExists(client, "subitems", "created_at")) {
    await markApplied(client, "0006_subitem_created_at.sql");
  }
  if (await columnExists(client, "files", "data")) {
    await markApplied(client, "0007_file_data.sql");
  }
  if (await columnExists(client, "users", "last_login_at")) {
    await markApplied(client, "0008_users_last_login_at.sql");
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const needsSsl =
    url.includes("azure.com") ||
    url.includes("render.com") ||
    url.includes("sslmode=require");
  const client = new Client({
    connectionString: url,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined
  });
  await client.connect();

  await ensureMigrationsTable(client);
  await bootstrapExistingDb(client);

  const applied = await getApplied(client);
  const dir = path.join(process.cwd(), "lib/db/migrations");
  let ran = 0;

  for (const name of MIGRATIONS) {
    if (applied.has(name)) {
      console.log("Skipped (already applied):", name);
      continue;
    }
    const sql = await fs.readFile(path.join(dir, name), "utf8");
    await client.query(sql);
    await markApplied(client, name);
    console.log("Applied:", name);
    ran++;
  }

  await client.end();
  console.log(ran === 0 ? "Migrations up to date." : "Migrations finished.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
