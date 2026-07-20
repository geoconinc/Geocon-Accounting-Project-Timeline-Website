import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { authenticateRequest } from "@/lib/server/routeAuth";
import { bus } from "@/lib/events/bus";
import {
  canAccessFileParent,
  findFile,
  forbidden
} from "@/lib/server/access";
import { recordActivity } from "@/lib/server/activityLog";

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;

  const located = await findFile(params.id);
  if (!located) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (!(await canAccessFileParent(user, located.file.parentType, located.file.parentId))) {
    return forbidden();
  }

  await storage.deleteFile(params.id);

  bus.publish({
    type: "file.deleted",
    payload: {
      id: params.id,
      parentType: located.file.parentType,
      parentId: located.file.parentId
    }
  });

  await recordActivity({
    actorId: user.id,
    entityType: "file",
    entityId: params.id,
    action: "delete",
    payload: {
      filename: located.file.filename,
      parentType: located.file.parentType,
      parentId: located.file.parentId
    }
  });

  return NextResponse.json({ ok: true });
}
