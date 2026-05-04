import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/server/routeAuth";
import { buildBlobPath, createUploadSas, isBlobConfigured } from "@/lib/blob/sas";

export async function POST(req: Request) {
  const auth = await authenticateRequest();
  if (auth instanceof Response) return auth;

  if (!isBlobConfigured()) {
    return NextResponse.json(
      { error: "blob_not_configured", message: "Set AZURE_STORAGE_ACCOUNT and AZURE_STORAGE_KEY." },
      { status: 503 }
    );
  }

  const { parentType, parentId, filename } = (await req.json()) as {
    parentType: "project" | "subitem";
    parentId: string;
    filename: string;
  };
  if (!parentType || !parentId || !filename) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const blobPath = buildBlobPath(parentType, parentId, filename);
  const { uploadUrl } = createUploadSas(blobPath);
  return NextResponse.json({ uploadUrl, blobPath });
}
