import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { authenticateRequest } from "@/lib/server/routeAuth";
import { bus } from "@/lib/events/bus";
import { notifyUser } from "@/lib/notify/dispatch";
import { canManageSubitem, findSubitem, forbidden } from "@/lib/server/access";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;

  const before = await findSubitem(params.id);
  if (!before) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!canManageSubitem(user, before.project, before.subitem)) return forbidden();

  const patch = (await req.json()) as Record<string, unknown>;
  const updated = await storage.updateSubitem(params.id, patch);
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });

  bus.publish({
    type: "subitem.upsert",
    payload: { id: updated.id, projectId: updated.projectId }
  });

  if (patch.ownerId && patch.ownerId !== before.subitem.ownerId && typeof patch.ownerId === "string") {
    await notifyUser({
      userId: patch.ownerId,
      projectId: updated.projectId,
      subject: `Assigned to ${updated.name}`,
      message: `${user.name} assigned you to "${updated.name}"${
        before.project ? ` on ${before.project.code} ${before.project.name}` : ""
      }.`
    });
  }

  return NextResponse.json({ subitem: updated });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = await authenticateRequest();
  if (auth instanceof Response) return auth;

  // Need projectId for the SSE event; look it up before deleting.
  const located = await findSubitem(params.id);
  if (!located) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!canManageSubitem(auth, located.project, located.subitem)) return forbidden();

  await storage.deleteSubitem(params.id);
  bus.publish({ type: "subitem.delete", payload: { id: params.id, projectId: located.project.id } });
  return NextResponse.json({ ok: true });
}
