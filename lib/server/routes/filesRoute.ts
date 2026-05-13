import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { authenticateRequest } from "@/lib/server/routeAuth";
import { bus } from "@/lib/events/bus";
import { canAccessFileParent, forbidden } from "@/lib/server/access";

export async function POST(req: Request) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;
  const body = (await req.json()) as {
    parentType: "project" | "subitem";
    parentId: string;
    blobPath: string;
    filename: string;
    size: number;
  };
  if (!(await canAccessFileParent(user, body.parentType, body.parentId))) return forbidden();

  const file = await storage.addFile({
    parentType: body.parentType,
    parentId: body.parentId,
    blobPath: body.blobPath,
    filename: body.filename,
    size: body.size,
    uploadedBy: user.id
  });
  bus.publish({
    type: "file.added",
    payload: { parentType: body.parentType, parentId: body.parentId }
  });
  return NextResponse.json({ file });
}
