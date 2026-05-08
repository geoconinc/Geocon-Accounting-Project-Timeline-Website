import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { authenticateRequest } from "@/lib/server/routeAuth";
import { bus } from "@/lib/events/bus";
import { DEFAULT_SUBITEM_NAMES } from "@/lib/projectDefaults";
import { OFFICE_ASSIGNEES, isOffice, resolveAssigneeId } from "@/lib/offices";

export async function GET() {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;

  const [projects, users] = await Promise.all([storage.listProjects(), storage.listUsers()]);
  const subitemArrays = await Promise.all(projects.map((p) => storage.listSubitems(p.id)));
  const fileArrays = await Promise.all(projects.map((p) => storage.listFiles("project", p.id)));
  const subitems = subitemArrays.flat();
  const subitemFileArrays = await Promise.all(subitems.map((s) => storage.listFiles("subitem", s.id)));

  return NextResponse.json({
    projects,
    subitems,
    users,
    files: [...fileArrays.flat(), ...subitemFileArrays.flat()],
    me: user.id
  });
}

export async function POST(req: Request) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;
  const body = (await req.json()) as Partial<Parameters<typeof storage.createProject>[0]>;

  const project = await storage.createProject({
    code: body.code ?? "NEW",
    name: body.name ?? "New project",
    ownerId: body.ownerId ?? user.id,
    status: body.status ?? "New",
    group: body.group ?? "Current",
    startDate: body.startDate ?? null,
    timelineStart: body.timelineStart ?? null,
    timelineEnd: body.timelineEnd ?? null,
    dirNumber: body.dirNumber ?? null,
    union: body.union ?? false,
    reportingSystems: body.reportingSystems ?? null,
    cprContact: body.cprContact ?? null,
    sharepointUrl: body.sharepointUrl ?? null,
    office: body.office ?? null,
    notes: body.notes ?? null,
    lastUpdatedBy: user.id
  });

  const allUsers = await storage.listUsers();
  const officeMap = isOffice(project.office) ? OFFICE_ASSIGNEES[project.office] : null;

  for (const name of DEFAULT_SUBITEM_NAMES) {
    const assigneeName = officeMap?.[name];
    const ownerId = assigneeName ? resolveAssigneeId(allUsers, assigneeName) : null;
    await storage.createSubitem({
      projectId: project.id,
      name,
      ownerId,
      status: "NotStarted",
      dueDate: null,
      dateCompleted: null,
      notes: null
    });
  }

  bus.publish({ type: "project.upsert", payload: { id: project.id } });
  return NextResponse.json({ project });
}
