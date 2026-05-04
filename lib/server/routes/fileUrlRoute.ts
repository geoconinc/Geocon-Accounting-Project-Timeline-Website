import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { authenticateRequest } from "@/lib/server/routeAuth";
import { createReadSas, isBlobConfigured } from "@/lib/blob/sas";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;
  if (!isBlobConfigured()) {
    return NextResponse.json({ error: "blob_not_configured" }, { status: 503 });
  }
  // Find file by id across both parent types
  const projects = await storage.listProjects();
  let blobPath: string | null = null;
  let filename = "";
  outer: for (const p of projects) {
    for (const f of await storage.listFiles("project", p.id)) {
      if (f.id === params.id) {
        blobPath = f.blobPath;
        filename = f.filename;
        break outer;
      }
    }
    for (const s of await storage.listSubitems(p.id)) {
      for (const f of await storage.listFiles("subitem", s.id)) {
        if (f.id === params.id) {
          blobPath = f.blobPath;
          filename = f.filename;
          break outer;
        }
      }
    }
  }
  if (!blobPath) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ url: createReadSas(blobPath), filename });
}
