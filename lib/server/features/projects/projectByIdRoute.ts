import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { authenticateRequest } from "@/lib/server/routeAuth";
import { bus } from "@/lib/events/bus";
import { canManageProject, forbidden } from "@/lib/server/access";
import { deriveProjectActivityPatch } from "@/lib/domain/projectStatusSync";
import { recordActivity } from "@/lib/server/activityLog";
import { parseJsonBody, badRequest } from "@/lib/server/http";
import {
  gmsImportLockedFieldsInPatch,
  gmsOwnedFieldsInPatch
} from "@/lib/domain/gmsDas";

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

  const gmsOwned = gmsOwnedFieldsInPatch(patch);
  if (gmsOwned.length > 0) {
    return NextResponse.json(
      {
        error: "gms_field_locked",
        message: `These fields are managed by GMS and cannot be changed here: ${gmsOwned.join(", ")}.`
      },
      { status: 400 }
    );
  }

  const gmsImportLocked = gmsImportLockedFieldsInPatch(patch, before);
  if (gmsImportLocked.length > 0) {
    return NextResponse.json(
      {
        error: "gms_field_locked",
        message: `This project was imported from GMS. These fields cannot be changed here: ${gmsImportLocked.join(", ")}.`
      },
      { status: 400 }
    );
  }

  const activityPatch = deriveProjectActivityPatch(before, patch);
  const mergedPatch = activityPatch ? { ...patch, ...activityPatch } : patch;

  const updated = await storage.updateProject(params.id, mergedPatch, user.id);
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });

  bus.publish({ type: "project.upsert", payload: { id: updated.id } });

  // Project owner / status emails target PMs and directors, who do not use Timeline.
  // Checklist (accounting) emails are sent on create and via cron digests instead.

  await recordActivity({
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
