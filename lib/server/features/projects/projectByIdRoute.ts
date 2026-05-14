import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { authenticateRequest } from "@/lib/server/routeAuth";
import { bus } from "@/lib/events/bus";
import { notifyUser } from "@/lib/notifications/dispatch";
import { canManageProject, forbidden } from "@/lib/server/access";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;

  const before = await storage.getProject(params.id);
  if (!before) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!canManageProject(user, before)) return forbidden();

  const patch = (await req.json()) as Record<string, unknown>;
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

  const updated = await storage.updateProject(params.id, patch, user.id);
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });

  bus.publish({ type: "project.upsert", payload: { id: updated.id } });

  if (patch.ownerId && patch.ownerId !== before.ownerId && typeof patch.ownerId === "string") {
    await notifyUser({
      userId: patch.ownerId,
      projectId: updated.id,
      subject: `Assigned to project ${updated.code} ${updated.name}`,
      message: `${user.name} assigned you to project ${updated.code} - ${updated.name}.`
    });
  }
  if (patch.status && patch.status !== before.status && updated.ownerId) {
    await notifyUser({
      userId: updated.ownerId,
      projectId: updated.id,
      subject: `Project ${updated.code} status changed`,
      message: `${user.name} changed status of ${updated.code} - ${updated.name} to ${updated.status}.`
    });
  }

  await storage.appendActivity({
    actorId: user.id,
    entityType: "project",
    entityId: updated.id,
    action: "update",
    payload: patch
  });

  return NextResponse.json({ project: updated });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;
  const project = await storage.getProject(params.id);
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!canManageProject(user, project)) return forbidden();

  await storage.deleteProject(params.id);
  bus.publish({ type: "project.delete", payload: { id: params.id } });
  return NextResponse.json({ ok: true });
}
