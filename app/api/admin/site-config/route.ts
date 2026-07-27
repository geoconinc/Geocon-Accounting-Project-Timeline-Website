import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/server/routeAuth";
import { isOwnerUser } from "@/lib/auth/superAdmin";
import { isAdminAsync } from "@/lib/server/access";
import {
  readAdminSiteConfig,
  writeAdminSiteConfig,
  getEffectiveOfficeAssigneeRows,
  getStoredBoardAdminEmails,
  setStoredBoardAdminEmails,
  invalidateAdminEmailsCache
} from "@/lib/server/site-data/adminSiteConfigStore";
import { invalidateAccessCache } from "@/lib/server/access";
import { loadRoleAssigneesJson, invalidateRoleAssigneesCache } from "@/lib/server/site-data/syncRoleAssignees";
import type { GeoconRoleAssigneesFile } from "@/lib/types/roleAssigneeData";
import type { OfficeAssigneeRow } from "@/lib/domain/officeAssigneeResolve";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;
  if (!(await isAdminAsync(user))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const [officeAssignees, roleAssignees, meta, boardAdminEmails] = await Promise.all([
    getEffectiveOfficeAssigneeRows(),
    loadRoleAssigneesJson(),
    readAdminSiteConfig(),
    getStoredBoardAdminEmails()
  ]);

  const envAdmins = (process.env.BOARD_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const allAdminEmails = [...new Set([...envAdmins, ...boardAdminEmails])];

  return NextResponse.json({
    officeAssignees,
    roleAssignees,
    boardAdminEmails: allAdminEmails,
    meta: {
      updatedAt: meta?.updatedAt ?? null,
      updatedByEmail: meta?.updatedByEmail ?? null
    }
  });
}

export async function PUT(req: Request) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;
  if (!isOwnerUser(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const rec = body as {
    officeAssignees?: OfficeAssigneeRow[];
    roleAssignees?: GeoconRoleAssigneesFile | null;
    boardAdminEmails?: string[];
  };

  if (!Array.isArray(rec.officeAssignees)) {
    return NextResponse.json({ error: "officeAssignees_required_array" }, { status: 400 });
  }

  for (const row of rec.officeAssignees) {
    if (
      typeof row.displayName !== "string" ||
      typeof row.employeeListName !== "string" ||
      typeof row.email !== "string" ||
      !row.email.trim()
    ) {
      return NextResponse.json({ error: "invalid_office_assignee_row" }, { status: 400 });
    }
  }

  if (rec.roleAssignees === undefined) {
    return NextResponse.json({ error: "roleAssignees_required" }, { status: 400 });
  }

  let roleAssignees: GeoconRoleAssigneesFile | null = null;
  if (rec.roleAssignees === null) {
    roleAssignees = null;
  } else {
    if (
      typeof rec.roleAssignees !== "object" ||
      !Array.isArray(rec.roleAssignees.projectDirectors) ||
      !Array.isArray(rec.roleAssignees.projectManagers)
    ) {
      return NextResponse.json({ error: "invalid_role_assignees_shape" }, { status: 400 });
    }
    roleAssignees = {
      source: typeof rec.roleAssignees.source === "string" ? rec.roleAssignees.source : "admin",
      projectDirectors: rec.roleAssignees.projectDirectors,
      projectManagers: rec.roleAssignees.projectManagers
    };
  }

  await writeAdminSiteConfig(
    {
      officeAssignees: rec.officeAssignees,
      roleAssignees
    },
    user.email
  );
  invalidateRoleAssigneesCache();

  if (Array.isArray(rec.boardAdminEmails)) {
    const cleaned = rec.boardAdminEmails
      .map((e) => (typeof e === "string" ? e.trim().toLowerCase() : ""))
      .filter(Boolean);
    await setStoredBoardAdminEmails(cleaned, user.email);
    invalidateAdminEmailsCache();
    invalidateAccessCache();
  }

  return NextResponse.json({ ok: true });
}
