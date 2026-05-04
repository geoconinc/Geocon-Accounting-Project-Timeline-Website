import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { authenticateRequest } from "@/lib/server/routeAuth";
import { bus } from "@/lib/events/bus";
import { notifyUser } from "@/lib/notify/dispatch";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;

  const patch = (await req.json()) as Record<string, unknown>;
  const updated = await storage.updateSubitem(params.id, patch);
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });

  bus.publish({
    type: "subitem.upsert",
    payload: { id: updated.id, projectId: updated.projectId }
  });

  if (patch.ownerId && typeof patch.ownerId === "string") {
    const project = await storage.getProject(updated.projectId);
    await notifyUser({
      userId: patch.ownerId,
      projectId: updated.projectId,
      subject: `Assigned to ${updated.name}`,
      message: `${user.name} assigned you to "${updated.name}"${
        project ? ` on ${project.code} ${project.name}` : ""
      }.`
    });
  }

  return NextResponse.json({ subitem: updated });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = await authenticateRequest();
  if (auth instanceof Response) return auth;

  // Need projectId for the SSE event; look it up before deleting.
  const dbAll = await storage.listProjects();
  let projectId = "";
  for (const p of dbAll) {
    const subs = await storage.listSubitems(p.id);
    if (subs.some((s) => s.id === params.id)) {
      projectId = p.id;
      break;
    }
  }

  await storage.deleteSubitem(params.id);
  bus.publish({ type: "subitem.delete", payload: { id: params.id, projectId } });
  return NextResponse.json({ ok: true });
}
