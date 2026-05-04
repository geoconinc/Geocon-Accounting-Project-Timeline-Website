import { promises as fs } from "node:fs";
import path from "node:path";
import { Client } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const client = new Client({ connectionString: url });
  await client.connect();
  const sql = await fs.readFile(path.join(process.cwd(), "lib/db/migrations/0001_init.sql"), "utf8");
  await client.query(sql);
  await client.end();
  console.log("Migration applied.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
