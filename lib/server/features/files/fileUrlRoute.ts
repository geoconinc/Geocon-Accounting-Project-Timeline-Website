import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/server/routeAuth";
import { createReadSas, isBlobConfigured } from "@/lib/blob/sas";
import {
  canViewSubitem,
  findFile,
  forbidden,
  hasFullBoardAccess,
  isProjectLead
} from "@/lib/server/access";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;
  if (!isBlobConfigured()) {
    return NextResponse.json({ error: "blob_not_configured" }, { status: 503 });
  }
  const located = await findFile(params.id);
  if (!located) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (located.file.parentType === "project") {
    const canViewProjectFile = hasFullBoardAccess(user) || isProjectLead(user, located.project);
    if (!canViewProjectFile) return forbidden();
  } else if (!located.subitem || !canViewSubitem(user, located.project, located.subitem)) {
    return forbidden();
  }

  return NextResponse.json({
    url: createReadSas(located.file.blobPath),
    filename: located.file.filename
  });
}
