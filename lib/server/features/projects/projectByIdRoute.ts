import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { authenticateRequest } from "@/lib/server/routeAuth";
import { bus } from "@/lib/events/bus";
import { notifyUser } from "@/lib/notifications/dispatch";
import {
  buildProjectOwnerAssignedEmail,
  buildProjectStatusChangedEmail
} from "@/lib/notifications/templates/operational";
import { canManageProject, forbidden } from "@/lib/server/access";
import { deriveProjectActivityPatch } from "@/lib/domain/projectStatusSync";
import { recordActivity } from "@/lib/server/activityLog";
import { parseJsonBody, badRequest } from "@/lib/server/http";

const PROJECT_STATUS_LABEL: Record<string, string> = {
  New: "New",
  Completed: "Completed",
  InProgress: "In Progress",
  Missing: "Missing",
  Future: "Future"
};

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;

  const before = await storage.getProject(params.id);
  if (!before) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!(await canManageProject(user, before))) return forbidden();

  const patch = await parseJsonBody<Record<string, unknown>>(req);
  if (!patch) return badRequest();
  if (
    before.office &&
    "office" in patch &&
    patch.office !== before.office
  ) {
    return NextResponse.json(
      { error: "office_locked", message: "Office cannot be changed after it is set." },
      { status: 400 }
    );
  }

  const activityPatch = deriveProjectActivityPatch(before, patch);
  const mergedPatch = activityPatch ? { ...patch, ...activityPatch } : patch;

  const updated = await storage.updateProject(params.id, mergedPatch, user.id);
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });

  bus.publish({ type: "project.upsert", payload: { id: updated.id } });

  if (patch.ownerId && patch.ownerId !== before.ownerId && typeof patch.ownerId === "string") {
    const assignee = await storage.getUserById(patch.ownerId);
    if (assignee) {
      const mail = buildProjectOwnerAssignedEmail({
        recipientName: assignee.name,
        actorName: user.name,
        projectCode: updated.code,
        projectName: updated.name
      });
      await notifyUser({
        userId: patch.ownerId,
        projectId: updated.id,
        ...mail
      });
    }
  }
  if (mergedPatch.status && mergedPatch.status !== before.status && updated.ownerId) {
    const owner = await storage.getUserById(updated.ownerId);
    if (owner) {
      const status =
        PROJECT_STATUS_LABEL[String(mergedPatch.status)] ?? String(mergedPatch.status);
      const mail = buildProjectStatusChangedEmail({
        recipientName: owner.name,
        actorName: user.name,
        projectCode: updated.code,
        projectName: updated.name,
        newStatus: status
      });
      await notifyUser({
        userId: updated.ownerId,
        projectId: updated.id,
        ...mail
      });
    }
  }

  await storage.appendActivity({
    actorId: user.id,
    entityType: "project",
    entityId: updated.id,
    action: "update",
    payload: mergedPatch
  });

  return NextResponse.json({ project: updated });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;
  const project = await storage.getProject(params.id);
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!(await canManageProject(user, project))) return forbidden();

  await storage.deleteProject(params.id);
  bus.publish({ type: "project.delete", payload: { id: params.id } });

  await recordActivity({
    actorId: user.id,
    entityType: "project",
    entityId: params.id,
    action: "delete",
    payload: { code: project.code, name: project.name, office: project.office }
  });

  return NextResponse.json({ ok: true });
}
