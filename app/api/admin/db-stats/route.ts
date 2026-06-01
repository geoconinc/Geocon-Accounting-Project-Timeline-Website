import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { authenticateRequest } from "@/lib/server/routeAuth";
import { isSuperAdminUser } from "@/lib/auth/superAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;
  if (!isSuperAdminUser(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const storageDriver = process.env.STORAGE_DRIVER ?? "json";
  if (storageDriver !== "postgres") {
    return NextResponse.json({
      driver: "json",
      dbSizeBytes: null,
      dbSizePretty: null,
      dbMaxBytes: null,
      dbMaxPretty: null,
      usagePercent: null,
      tableStats: []
    });
  }

  const { getDb } = await import("@/lib/db/client");
  const db = getDb();

  const sizeResult = await db.execute<{ db_size: string; db_size_pretty: string }>(
    sql`SELECT pg_database_size(current_database()) AS db_size,
             pg_size_pretty(pg_database_size(current_database())) AS db_size_pretty`
  );

  const tableResult = await db.execute<{
    table_name: string;
    row_count: string;
    total_size: string;
    total_size_pretty: string;
  }>(
    sql`SELECT
          relname AS table_name,
          n_live_tup::text AS row_count,
          pg_total_relation_size(quote_ident(relname))::text AS total_size,
          pg_size_pretty(pg_total_relation_size(quote_ident(relname))) AS total_size_pretty
        FROM pg_stat_user_tables
        ORDER BY pg_total_relation_size(quote_ident(relname)) DESC`
  );

  const dbSizeBytes = Number(sizeResult.rows[0]?.db_size ?? 0);
  const dbSizePretty = sizeResult.rows[0]?.db_size_pretty ?? "0 bytes";

  // Azure Flexible Server Basic tier default: 32 GB
  const dbMaxBytes = 32 * 1024 * 1024 * 1024;
  const usagePercent = dbMaxBytes > 0 ? Math.round((dbSizeBytes / dbMaxBytes) * 10000) / 100 : 0;

  return NextResponse.json({
    driver: "postgres",
    dbSizeBytes,
    dbSizePretty,
    dbMaxBytes,
    dbMaxPretty: "32 GB",
    usagePercent,
    tableStats: tableResult.rows.map((r) => ({
      name: r.table_name,
      rows: Number(r.row_count),
      sizeBytes: Number(r.total_size),
      sizePretty: r.total_size_pretty
    }))
  });
}
