import { promises as fs } from "node:fs";
import path from "node:path";
import { Client } from "pg";

const MIGRATIONS = [
  "0001_init.sql",
  "0002_project_manager_director.sql",
  "0003_notification_prefs_global.sql",
  "0004_drop_notification_prefs.sql"
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const client = new Client({ connectionString: url });
  await client.connect();
  const dir = path.join(process.cwd(), "lib/db/migrations");
  for (const name of MIGRATIONS) {
    const sql = await fs.readFile(path.join(dir, name), "utf8");
    await client.query(sql);
    console.log("Applied:", name);
  }
  await client.end();
  console.log("Migrations finished.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
