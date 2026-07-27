import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { authenticateRequest } from "@/lib/server/routeAuth";
import { isAdminAsync } from "@/lib/server/access";
import { resolveAuditEntityName } from "@/lib/server/auditDisplay";
import { isUserActive } from "@/lib/events/presence";

export const dynamic = "force-dynamic";

const ACTIVITY_LIMIT = 40;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;
  if (!(await isAdminAsync(user))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const employee = await storage.getUserById(params.id);
  if (!employee) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const [allProjects, allSubitems, recentActivity] = await Promise.all([
    storage.listProjects(),
    storage.listAllSubitems(),
    storage.listRecentActivity(500)
  ]);

  const roleOf = (projectManagerId: string | null, projectDirectorId: string | null, ownerId: string | null) => {
    const roles: string[] = [];
    if (projectManagerId === employee.id) roles.push("Project Manager");
    if (projectDirectorId === employee.id) roles.push("Project Director");
    if (ownerId === employee.id) roles.push("Owner");
    return roles;
  };

  const projectsLed = allProjects
    .filter(
      (p) =>
        p.ownerId === employee.id ||
        p.projectManagerId === employee.id ||
        p.projectDirectorId === employee.id
    )
    .map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      status: p.status,
      office: p.office,
      roles: roleOf(p.projectManagerId, p.projectDirectorId, p.ownerId)
    }));

  const projectById = new Map(allProjects.map((p) => [p.id, p]));

  const tasks = allSubitems
    .filter((s) => s.ownerId === employee.id)
    .map((s) => {
      const project = projectById.get(s.projectId);
      return {
        id: s.id,
        name: s.name,
        status: s.status,
        dueDate: s.dueDate,
        projectId: s.projectId,
        projectCode: project?.code ?? "—",
        projectName: project?.name ?? "Unknown project"
      };
    });

  const projectNameById = new Map(allProjects.map((p) => [p.id, p.name]));
  const projectCodeById = new Map(allProjects.map((p) => [p.id, p.code]));

  const activity = recentActivity
    .filter((a) => a.actorId === employee.id)
    .slice(0, ACTIVITY_LIMIT)
    .map((a) => ({
      id: a.id,
      action: a.action,
      entityType: a.entityType,
      createdAt: a.createdAt,
      entityName: resolveAuditEntityName({
        entityType: a.entityType,
        entityId: a.entityId,
        payload: a.payload ?? {},
        projectNameById,
        projectCodeById
      })
    }));

  return NextResponse.json({
    employee: {
      id: employee.id,
      name: employee.name,
      initials: employee.initials,
      lastLoginAt: employee.lastLoginAt ?? null,
      activeNow: isUserActive(employee.id)
    },
    projectsLed,
    tasks,
    activity
  });
}
