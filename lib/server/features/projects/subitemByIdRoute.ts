import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { authenticateRequest } from "@/lib/server/routeAuth";
import { bus } from "@/lib/events/bus";
import { notifyUser } from "@/lib/notifications/dispatch";
import { buildSubitemAssignedEmail } from "@/lib/notifications/templates/operational";
import { canManageSubitem, findSubitem, forbidden } from "@/lib/server/access";
import { syncProjectStatusFromSubitems } from "@/lib/domain/projectStatusSync";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;

  const before = await findSubitem(params.id);
  if (!before) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!(await canManageSubitem(user, before.project, before.subitem))) return forbidden();

  const patch = (await req.json()) as Record<string, unknown>;
  const updated = await storage.updateSubitem(params.id, patch);
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await syncProjectStatusFromSubitems(updated.projectId, user.id);

  bus.publish({
    type: "subitem.upsert",
    payload: { id: updated.id, projectId: updated.projectId }
  });

  if (patch.ownerId && patch.ownerId !== before.subitem.ownerId && typeof patch.ownerId === "string") {
    const assignee = await storage.getUserById(patch.ownerId);
    if (assignee && before.project) {
      const mail = buildSubitemAssignedEmail({
        recipientName: assignee.name,
        actorName: user.name,
        subitemName: updated.name,
        projectCode: before.project.code,
        projectName: before.project.name
      });
      await notifyUser({
        userId: patch.ownerId,
        projectId: updated.projectId,
        ...mail
      });
    }
  }

  return NextResponse.json({ subitem: updated });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = await authenticateRequest();
  if (auth instanceof Response) return auth;

  // Need projectId for the SSE event; look it up before deleting.
  const located = await findSubitem(params.id);
  if (!located) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!(await canManageSubitem(auth, located.project, located.subitem))) return forbidden();

  await storage.deleteSubitem(params.id);
  await syncProjectStatusFromSubitems(located.project.id, auth.id);
  bus.publish({ type: "subitem.delete", payload: { id: params.id, projectId: located.project.id } });
  return NextResponse.json({ ok: true });
}
