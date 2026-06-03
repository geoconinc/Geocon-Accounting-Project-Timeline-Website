import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { authenticateRequest } from "@/lib/server/routeAuth";
import { isSuperAdminUser } from "@/lib/auth/superAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;
  if (!isSuperAdminUser(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const [allUsers, allProjects, allSubitems, recentActivity] = await Promise.all([
    storage.listUsers(),
    storage.listProjects(),
    storage.listAllSubitems(),
    storage.listRecentActivity(200)
  ]);

  const subsByProject = new Map<string, typeof allSubitems>();
  for (const s of allSubitems) {
    const arr = subsByProject.get(s.projectId) ?? [];
    arr.push(s);
    subsByProject.set(s.projectId, arr);
  }

  const employees = allUsers.map((u) => {
    const ownedProjects = allProjects.filter(
      (p) => p.ownerId === u.id || p.projectManagerId === u.id || p.projectDirectorId === u.id
    );
    const assignedSubitems = allSubitems.filter((s) => s.ownerId === u.id);

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

    const userActivity = recentActivity.filter((a) => a.actorId === u.id);
    const lastActive = userActivity.length > 0 ? userActivity[0].createdAt : u.createdAt;

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      initials: u.initials,
      ongoingCount: ongoingProjects.size,
      completedCount: completedProjects.size,
      lastActive
    };
  });

  employees.sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime());

  const totalProjects = allProjects.length;
  const ongoingTotal = allProjects.filter((p) => p.status !== "Completed").length;
  const completedTotal = allProjects.filter((p) => p.status === "Completed").length;
  const activeEmployees = employees.filter((e) => e.ongoingCount > 0 || e.completedCount > 0).length;

  const activityWithNames = recentActivity.slice(0, 100).map((a) => {
    const actor = allUsers.find((u) => u.id === a.actorId);
    const project = allProjects.find((p) => p.id === a.entityId);
    return {
      ...a,
      actorName: actor?.name ?? "System",
      entityName: project?.name ?? project?.code ?? a.entityId.slice(0, 8)
    };
  });

  return NextResponse.json({
    stats: { totalProjects, ongoingTotal, completedTotal, activeEmployees, totalEmployees: allUsers.length },
    employees,
    auditLog: activityWithNames
  });
}
