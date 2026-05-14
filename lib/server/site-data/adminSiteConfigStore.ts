import { promises as fs } from "node:fs";
import path from "node:path";
import type { GeoconRoleAssigneesFile } from "@/lib/types/roleAssigneeData";
import type { OfficeAssigneeRow } from "@/lib/domain/officeAssigneeResolve";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "admin-site-config.json");

export interface AdminSiteConfigFile {
  officeAssignees?: OfficeAssigneeRow[];
  roleAssignees?: GeoconRoleAssigneesFile | null;
  updatedAt?: string;
  updatedByEmail?: string;
}

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function readAdminSiteConfig(): Promise<AdminSiteConfigFile | null> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return JSON.parse(raw) as AdminSiteConfigFile;
  } catch {
    return null;
  }
}

export async function writeAdminSiteConfig(
  patch: { officeAssignees: OfficeAssigneeRow[]; roleAssignees: GeoconRoleAssigneesFile | null },
  actorEmail: string
): Promise<void> {
  await ensureDir();
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

export async function getEffectiveOfficeAssigneeRows(): Promise<OfficeAssigneeRow[]> {
  const admin = await readAdminSiteConfig();
  if (admin?.officeAssignees && admin.officeAssignees.length > 0) {
    return admin.officeAssignees;
  }
  const bundledPath = path.join(DATA_DIR, "officeAssigneeDirectory.json");
  const raw = await fs.readFile(bundledPath, "utf8");
  const parsed = JSON.parse(raw) as { assignees: OfficeAssigneeRow[] };
  return parsed.assignees ?? [];
}
