import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const g = globalThis as unknown as {
  __geoconPgPool?: Pool;
  __geoconDb?: ReturnType<typeof drizzle>;
};

function getPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required when STORAGE_DRIVER=postgres");
  if (!g.__geoconPgPool) {
    const needsSsl =
      url.includes("azure.com") ||
      url.includes("render.com") ||
      url.includes("sslmode=require");
    g.__geoconPgPool = new Pool({
      connectionString: url,
      max: 10,
      ssl: needsSsl ? { rejectUnauthorized: false } : undefined
    });
  }
  return g.__geoconPgPool;
}

export function getDb() {
  if (!g.__geoconDb) {
    g.__geoconDb = drizzle(getPool(), { schema });
  }
  return g.__geoconDb;
}
