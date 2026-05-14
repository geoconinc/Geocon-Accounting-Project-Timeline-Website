import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/server/routeAuth";
import { storage } from "@/lib/storage";

export async function GET(req: Request) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;
  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  const pref = await storage.getNotificationPref(user.id, projectId);
  return NextResponse.json({ pref });
}

export async function POST(req: Request) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;
  const { projectId, mute } = (await req.json()) as { projectId: string | null; mute: boolean };
  await storage.setNotificationPref({ userId: user.id, projectId, mute });
  return NextResponse.json({ ok: true });
}
