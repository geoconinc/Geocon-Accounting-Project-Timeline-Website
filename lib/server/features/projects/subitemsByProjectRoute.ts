import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { authenticateRequest } from "@/lib/server/routeAuth";
import { bus } from "@/lib/events/bus";
import { canManageProject, forbidden } from "@/lib/server/access";
import { syncProjectStatusFromSubitems } from "@/lib/domain/projectStatusSync";
import { recordActivity } from "@/lib/server/activityLog";
import { parseJsonBody, badRequest } from "@/lib/server/http";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;
  const project = await storage.getProject(params.id);
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!(await canManageProject(user, project))) return forbidden();

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const sub = await storage.createSubitem({
    projectId: params.id,
    name: (body.name as string) ?? "New subitem",
    ownerId: (body.ownerId as string | null) ?? null,
    status: (body.status as never) ?? "NotStarted",
    dueDate: (body.dueDate as string | null) ?? null,
    dateCompleted: null,
    notes: null
  });
  await syncProjectStatusFromSubitems(params.id, user.id);
  bus.publish({ type: "subitem.upsert", payload: { id: sub.id, projectId: params.id } });

  await recordActivity({
    actorId: user.id,
    entityType: "subitem",
    entityId: sub.id,
    action: "create",
    payload: { name: sub.name, projectId: params.id, projectCode: project.code }
  });

  return NextResponse.json({ subitem: sub });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;
  const project = await storage.getProject(params.id);
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!(await canManageProject(user, project))) return forbidden();

  const body = await parseJsonBody<{ orderedIds: string[] }>(req);
  if (!body || !Array.isArray(body.orderedIds)) return badRequest("orderedIds must be an array.");
  await storage.reorderSubitems(params.id, body.orderedIds);
  bus.publish({ type: "subitem.reorder", payload: { projectId: params.id } });
  return NextResponse.json({ ok: true });
}
