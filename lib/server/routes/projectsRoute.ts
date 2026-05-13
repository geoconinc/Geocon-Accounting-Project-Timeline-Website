import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { authenticateRequest } from "@/lib/server/routeAuth";
import { bus } from "@/lib/events/bus";
import { DEFAULT_SUBITEM_NAMES } from "@/lib/projectDefaults";
import { OFFICE_ASSIGNEES, isOffice, resolveAssigneeId } from "@/lib/offices";
import { getBoardPayloadForUser } from "@/lib/server/access";

export async function GET() {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;

  return NextResponse.json(await getBoardPayloadForUser(user));
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
