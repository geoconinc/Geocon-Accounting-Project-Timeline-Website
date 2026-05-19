/**
 * One-time import of roster JSON into Postgres site_config.
 * Run after migrations: npm run db:seed-roster
 *
 * Reads data/geoconRoleAssignees.json and data/officeAssigneeDirectory.json
 * when present, then writes to site_config (admin_site_config key).
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import type { GeoconRoleAssigneesFile } from "../lib/types/roleAssigneeData";
import type { OfficeAssigneeRow } from "../lib/domain/officeAssigneeResolve";
import { writeAdminSiteConfig } from "../lib/server/site-data/adminSiteConfigStore";

async function readJsonFile<T>(relative: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), relative), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function main() {
  if ((process.env.STORAGE_DRIVER ?? "json") !== "postgres") {
    throw new Error("STORAGE_DRIVER must be postgres (set in .env.local)");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const rolePath = "data/geoconRoleAssignees.json";
  const officePath = "data/officeAssigneeDirectory.json";

  const roleAssignees = await readJsonFile<GeoconRoleAssigneesFile>(rolePath);
  const officeParsed = await readJsonFile<{ assignees: OfficeAssigneeRow[] }>(officePath);
  const officeAssignees = officeParsed?.assignees ?? [];

  if (!roleAssignees) {
    throw new Error(`Missing ${rolePath} — run scripts/build-role-assignees-from-xlsx.py first`);
  }
  if (officeAssignees.length === 0) {
    throw new Error(`Missing or empty ${officePath}`);
  }

  await writeAdminSiteConfig(
    { officeAssignees, roleAssignees },
    "seed-site-config@system"
  );

  console.log(
    `Seeded site_config: ${roleAssignees.projectManagers.length} PMs, ` +
      `${roleAssignees.projectDirectors.length} directors, ` +
      `${officeAssignees.length} office assignees.`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
