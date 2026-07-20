import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { authenticateRequest } from "@/lib/server/routeAuth";
import { bus } from "@/lib/events/bus";
import { canAccessFileParent, forbidden } from "@/lib/server/access";
import { recordActivity } from "@/lib/server/activityLog";
import { fileTooLargeMessage, MAX_FILE_SIZE_BYTES } from "@/lib/config/fileUpload";

export async function POST(req: Request) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;

  const formData = await req.formData();
  const parentType = formData.get("parentType") as "project" | "subitem" | null;
  const parentId = formData.get("parentId") as string | null;
  const fileEntry = formData.get("file") as File | null;

  if (!parentType || !parentId || !fileEntry) {
    return NextResponse.json(
      { error: "invalid_request", message: "parentType, parentId, and file are required." },
      { status: 400 }
    );
  }

  if (fileEntry.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "file_too_large", message: fileTooLargeMessage(fileEntry.name) },
      { status: 413 }
    );
  }

  if (!(await canAccessFileParent(user, parentType, parentId))) return forbidden();

  const arrayBuffer = await fileEntry.arrayBuffer();
  const data = Buffer.from(arrayBuffer);

  const file = await storage.addFile({
    parentType,
    parentId,
    filename: fileEntry.name,
    contentType: fileEntry.type || "application/octet-stream",
    size: fileEntry.size,
    data,
    uploadedBy: user.id
  });

  bus.publish({
    type: "file.added",
    payload: { parentType, parentId }
  });

  await recordActivity({
    actorId: user.id,
    entityType: "file",
    entityId: file.id,
    action: "upload",
    payload: { filename: file.filename, parentType, parentId, size: file.size }
  });

  return NextResponse.json({ file });
}
