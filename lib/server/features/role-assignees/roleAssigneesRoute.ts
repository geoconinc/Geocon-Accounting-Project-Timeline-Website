import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import type { User } from "@/lib/types";
import { storage } from "@/lib/storage";
import { authenticateRequest } from "@/lib/server/routeAuth";
import { loadRoleAssigneesJson } from "@/lib/server/site-data/syncRoleAssignees";

export async function GET() {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;

  const data = await loadRoleAssigneesJson();
  if (!data) {
    return NextResponse.json(
      { error: "role_assignees_unconfigured", projectManagers: [], projectDirectors: [] },
      { status: 200 }
    );
  }

  const users = await storage.listUsers();
  const byEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]));

  function resolve(email: string): User | null {
    const e = email.trim().toLowerCase();
    if (!e) return null;
    return byEmail.get(e) ?? null;
  }

  const projectDirectors = data.projectDirectors
    .map((d) => {
      const u = resolve(d.email);
      return {
        chartLabel: d.chartLabel,
        name: d.name,
        email: d.email,
        job: d.job,
        office: d.office,
        inEmployeeList: d.inEmployeeList,
        user: u
      };
    })
    .filter((row) => row.user !== null) as {
    chartLabel: string;
    name: string;
    email: string;
    job: string;
    office: string;
    inEmployeeList: boolean;
    user: User;
  }[];
  projectDirectors.sort((a, b) => a.chartLabel.localeCompare(b.chartLabel));

  const projectManagers = data.projectManagers
    .map((p) => {
      const u = resolve(p.email);
      return { ...p, user: u };
    })
    .filter((row) => row.user !== null) as (typeof data.projectManagers[number] & { user: User })[];
  projectManagers.sort((a, b) => a.user.name.localeCompare(b.user.name));

  return NextResponse.json({
    projectDirectors,
    projectManagers
  });
}
