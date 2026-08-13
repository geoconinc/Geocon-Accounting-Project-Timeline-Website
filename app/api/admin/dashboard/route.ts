import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { authenticateRequest } from "@/lib/server/routeAuth";
import { isAdminAsync } from "@/lib/server/access";
import { resolveAuditEntityName } from "@/lib/server/auditDisplay";
import { computeWorkStats, subitemsForUser } from "@/lib/domain/workStats";

export const dynamic = "force-dynamic";

const ACTIVE_LOGIN_DAYS = 5;

function hasAssignment(ongoingCount: number, completedCount: number, assignedTasks: number): boolean {
  return ongoingCount > 0 || completedCount > 0 || assignedTasks > 0;
}

function loggedInWithinDays(lastLoginAt: string | null | undefined, days: number): boolean {
  if (!lastLoginAt) return false;
  const login = new Date(lastLoginAt).getTime();
  if (Number.isNaN(login)) return false;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return login >= cutoff;
}

export async function GET() {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;
  if (!(await isAdminAsync(user))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const [allUsers, allProjects, allSubitems, recentActivity] = await Promise.all([
    storage.listUsers(),
    storage.listProjects(),
    storage.listAllSubitems(),
    storage.listRecentActivity(200)
  ]);

  const companyWork = computeWorkStats(allSubitems);

  const allEmployees = allUsers.map((u) => {
    const ownedProjects = allProjects.filter(
      (p) => p.ownerId === u.id || p.projectManagerId === u.id || p.projectDirectorId === u.id
    );
    const assignedSubitems = subitemsForUser(allSubitems, u.id);
    const work = computeWorkStats(assignedSubitems);

    const ongoingProjects = new Set<string>();
    const completedProjects = new Set<string>();

    for (const p of ownedProjects) {
      if (p.status === "Completed") completedProjects.add(p.id);
      else ongoingProjects.add(p.id);
    }
    for (const s of assignedSubitems) {
      const proj = allProjects.find((p) => p.id === s.projectId);
      if (!proj) continue;
      if (proj.status === "Completed") completedProjects.add(proj.id);
      else ongoingProjects.add(proj.id);
    }

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      initials: u.initials,
      ongoingCount: ongoingProjects.size,
      completedCount: completedProjects.size,
      assignedTasks: work.assignedCount,
      openTasks: work.openCount,
      completionPct: work.completionPct,
      overdueCount: work.overdueCount,
      avgCompletionDays: work.avgCompletionDays,
      medianCompletionDays: work.medianCompletionDays,
      onTimePct: work.onTimePct,
      lastLoginAt: u.lastLoginAt ?? null
    };
  });

  const employees = allEmployees
    .filter((e) => hasAssignment(e.ongoingCount, e.completedCount, e.assignedTasks))
    .sort((a, b) => {
      const aTime = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
      const bTime = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
      return bTime - aTime;
    });

  const totalProjects = allProjects.length;
  const ongoingTotal = allProjects.filter((p) => p.status !== "Completed").length;
  const completedTotal = allProjects.filter((p) => p.status === "Completed").length;
  const activeEmployees = employees.filter((e) =>
    loggedInWithinDays(e.lastLoginAt, ACTIVE_LOGIN_DAYS)
  ).length;

  const projectNameById = new Map(allProjects.map((p) => [p.id, p.name]));
  const projectCodeById = new Map(allProjects.map((p) => [p.id, p.code]));

  const activityWithNames = recentActivity.slice(0, 100).map((a) => {
    const actor = allUsers.find((u) => u.id === a.actorId);
    return {
      ...a,
      actorName: actor?.name ?? (a.actorId ? "Unknown" : "System"),
      entityName: resolveAuditEntityName({
        entityType: a.entityType,
        entityId: a.entityId,
        payload: a.payload ?? {},
        projectNameById,
        projectCodeById
      })
    };
  });

  return NextResponse.json({
    stats: {
      totalProjects,
      ongoingTotal,
      completedTotal,
      activeEmployees,
      totalEmployees: employees.length,
      assignedTasks: companyWork.assignedCount,
      openTasks: companyWork.openCount,
      completionPct: companyWork.completionPct,
      overdueCount: companyWork.overdueCount,
      avgCompletionDays: companyWork.avgCompletionDays,
      medianCompletionDays: companyWork.medianCompletionDays,
      onTimePct: companyWork.onTimePct
    },
    employees,
    auditLog: activityWithNames
  });
}
