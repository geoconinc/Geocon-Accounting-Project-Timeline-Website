import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { authenticateRequest } from "@/lib/server/routeAuth";
import { bus } from "@/lib/events/bus";
import { notifyUser } from "@/lib/notifications/dispatch";
import { buildSubitemAssignedEmail } from "@/lib/notifications/templates/operational";
import {
  canAdminSubitem,
  canManageSubitem,
  findSubitem,
  forbidden
} from "@/lib/server/access";
import { syncProjectStatusFromSubitems } from "@/lib/domain/projectStatusSync";
import { recordActivity } from "@/lib/server/activityLog";
import { parseJsonBody, badRequest } from "@/lib/server/http";

const ADMIN_ONLY_SUBITEM_KEYS = new Set(["ownerId", "name", "position"]);

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;

  const before = await findSubitem(params.id);
  if (!before) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!(await canManageSubitem(user, before.project, before.subitem))) return forbidden();

  const patch = await parseJsonBody<Record<string, unknown>>(req);
  if (!patch) return badRequest();

  const touchesAdminFields = Object.keys(patch).some((k) => ADMIN_ONLY_SUBITEM_KEYS.has(k));
  if (touchesAdminFields && !(await canAdminSubitem(user))) {
    return forbidden("admin_required");
  }

  const updated = await storage.updateSubitem(params.id, patch);
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await syncProjectStatusFromSubitems(updated.projectId, user.id);

  // Keep the parent project's "last updated" in sync with checklist edits.
  await storage.updateProject(updated.projectId, {}, user.id);

  bus.publish({
    type: "subitem.upsert",
    payload: { id: updated.id, projectId: updated.projectId }
  });

  await recordActivity({
    actorId: user.id,
    entityType: "subitem",
    entityId: updated.id,
    action: "update",
    payload: {
      name: updated.name,
      projectId: updated.projectId,
      projectCode: before.project.code,
      patch
    }
  });

  if (patch.ownerId && patch.ownerId !== before.subitem.ownerId && typeof patch.ownerId === "string") {
    const assignee = await storage.getUserById(patch.ownerId);
    if (assignee && before.project) {
      const mail = await buildSubitemAssignedEmail({
        recipientName: assignee.name,
        actorName: user.name,
        subitemName: updated.name,
        projectCode: before.project.code,
        projectName: before.project.name,
        projectId: updated.projectId
      });
      await notifyUser({
        userId: patch.ownerId,
        projectId: updated.projectId,
        category: "subitemAssigned",
        ...mail
      });
    }
  }

  return NextResponse.json({ subitem: updated });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = await authenticateRequest();
  if (auth instanceof Response) return auth;

  const located = await findSubitem(params.id);
  if (!located) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!(await canAdminSubitem(auth))) return forbidden("admin_required");

  await storage.deleteSubitem(params.id);
  await syncProjectStatusFromSubitems(located.project.id, auth.id);
  bus.publish({ type: "subitem.delete", payload: { id: params.id, projectId: located.project.id } });

  await recordActivity({
    actorId: auth.id,
    entityType: "subitem",
    entityId: params.id,
    action: "delete",
    payload: {
      name: located.subitem.name,
      projectId: located.project.id,
      projectCode: located.project.code
    }
  });

  return NextResponse.json({ ok: true });
}
