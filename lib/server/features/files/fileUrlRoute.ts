import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/server/routeAuth";
import { createReadSas, isBlobConfigured } from "@/lib/blob/sas";
import { decodeSharePointBlobRef } from "@/lib/fileStorage/sharepointBlobRef";
import { getSharePointDownloadLocationUrl } from "@/lib/fileStorage/sharepointAttachments";
import {
  canViewSubitem,
  findFile,
  forbidden,
  hasFullBoardAccess,
  isProjectLead
} from "@/lib/server/access";

function attachmentStorageReady(blobPath: string): boolean {
  const sp = decodeSharePointBlobRef(blobPath);
  if (sp) return process.env.FILE_STORAGE_DRIVER === "sharepoint";
  return isBlobConfigured();
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;
  const located = await findFile(params.id);
  if (!located) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (located.file.parentType === "project") {
    const canViewProjectFile = hasFullBoardAccess(user) || isProjectLead(user, located.project);
    if (!canViewProjectFile) return forbidden();
  } else if (!located.subitem || !canViewSubitem(user, located.project, located.subitem)) {
    return forbidden();
  }

  if (!attachmentStorageReady(located.file.blobPath)) {
    return NextResponse.json(
      { error: "attachment_storage_not_configured" },
      { status: 503 }
    );
  }

  const sp = decodeSharePointBlobRef(located.file.blobPath);
  if (sp) {
    const url = await getSharePointDownloadLocationUrl(sp.driveId, sp.itemId);
    if (!url) {
      return NextResponse.json({ error: "sharepoint_download_unavailable" }, { status: 502 });
    }
    return NextResponse.json({ url, filename: located.file.filename });
  }

  return NextResponse.json({
    url: createReadSas(located.file.blobPath),
    filename: located.file.filename
  });
}
