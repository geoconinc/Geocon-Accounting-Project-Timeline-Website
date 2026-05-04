import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/server/routeAuth";
import { notifyUser } from "@/lib/notify/dispatch";

export async function POST(req: Request) {
  const auth = await authenticateRequest();
  if (auth instanceof Response) return auth;
  const { userId, projectId, subject, message } = (await req.json()) as {
    userId: string;
    projectId?: string;
    subject: string;
    message: string;
  };
  await notifyUser({ userId, projectId, subject, message });
  return NextResponse.json({ ok: true });
}
