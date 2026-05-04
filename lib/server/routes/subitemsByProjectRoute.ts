import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { authenticateRequest } from "@/lib/server/routeAuth";
import { bus } from "@/lib/events/bus";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await authenticateRequest();
  if (auth instanceof Response) return auth;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const sub = await storage.createSubitem({
    projectId: params.id,
    name: (body.name as string) ?? "New subitem",
    ownerId: (body.ownerId as string | null) ?? null,
    status: (body.status as never) ?? "NotStarted",
    dueDate: (body.dueDate as string | null) ?? null,
    dateCompleted: null,
    notes: null
  });
  bus.publish({ type: "subitem.upsert", payload: { id: sub.id, projectId: params.id } });
  return NextResponse.json({ subitem: sub });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = await authenticateRequest();
  if (auth instanceof Response) return auth;
  const { orderedIds } = (await req.json()) as { orderedIds: string[] };
  await storage.reorderSubitems(params.id, orderedIds);
  bus.publish({ type: "subitem.reorder", payload: { projectId: params.id } });
  return NextResponse.json({ ok: true });
}
