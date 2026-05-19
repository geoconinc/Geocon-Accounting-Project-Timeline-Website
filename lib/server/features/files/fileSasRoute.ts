import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/server/routeAuth";
import { buildBlobPath, createUploadSas, isBlobConfigured } from "@/lib/blob/sas";
import {
  createSharePointUploadSession,
  isSharePointAttachmentsConfigured
} from "@/lib/fileStorage/sharepointAttachments";
import { canAccessFileParent, forbidden } from "@/lib/server/access";

const FILE_DRIVER = () => process.env.FILE_STORAGE_DRIVER ?? "blob";

export async function POST(req: Request) {
  const auth = await authenticateRequest();
  if (auth instanceof Response) return auth;

  const body = (await req.json()) as {
    parentType: "project" | "subitem";
    parentId: string;
    filename: string;
    fileSize?: number;
  };
  const { parentType, parentId, filename, fileSize } = body;
  if (!parentType || !parentId || !filename) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (!(await canAccessFileParent(auth, parentType, parentId))) return forbidden();

  if (FILE_DRIVER() === "sharepoint") {
    if (!isSharePointAttachmentsConfigured()) {
      return NextResponse.json(
        {
          error: "sharepoint_not_configured",
          message:
            "Set FILE_STORAGE_DRIVER=sharepoint plus SHAREPOINT_HOSTNAME, SHAREPOINT_SITE_PATH, and GRAPH_APP_* credentials. Grant the app application permission Sites.ReadWrite.All (or Sites.Selected) on the target site."
        },
        { status: 503 }
      );
    }
    if (typeof fileSize !== "number" || fileSize < 1) {
      return NextResponse.json(
        { error: "invalid_request", message: "fileSize (bytes, >= 1) is required for SharePoint uploads." },
        { status: 400 }
      );
    }
    try {
      const { uploadUrl, driveId } = await createSharePointUploadSession({
        parentType,
        parentId,
        filename,
        fileSize
      });
      return NextResponse.json({
        provider: "sharepoint" as const,
        uploadUrl,
        driveId
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "sharepoint_upload_prepare_failed";
      return NextResponse.json({ error: "sharepoint_prepare_failed", message: msg }, { status: 502 });
    }
  }

  if (!isBlobConfigured()) {
    return NextResponse.json(
      { error: "blob_not_configured", message: "Set AZURE_STORAGE_ACCOUNT and AZURE_STORAGE_KEY." },
      { status: 503 }
    );
  }

  const blobPath = buildBlobPath(parentType, parentId, filename);
  const { uploadUrl } = createUploadSas(blobPath);
  return NextResponse.json({ provider: "blob" as const, uploadUrl, blobPath });
}
