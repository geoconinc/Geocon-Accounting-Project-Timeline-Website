import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { authenticateRequest } from "@/lib/server/routeAuth";
import {
  canViewSubitem,
  findFile,
  forbidden,
  hasFullBoardAccessAsync
} from "@/lib/server/access";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;
  const located = await findFile(params.id);
  if (!located) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (located.file.parentType === "project") {
    if (!(await hasFullBoardAccessAsync(user))) return forbidden();
  } else if (!located.subitem || !(await canViewSubitem(user, located.project, located.subitem))) {
    return forbidden();
  }

  const data = await storage.getFileData(params.id);
  if (!data) {
    return NextResponse.json({ error: "file_data_missing" }, { status: 404 });
  }

  const contentType = located.file.contentType || "application/octet-stream";
  const safeFilename = located.file.filename.replace(/["\n\r]/g, "_");

  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(data);
      controller.close();
    }
  });

  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${safeFilename}"`,
      "Content-Length": String(data.length),
      "Cache-Control": "private, max-age=3600"
    }
  });
}
