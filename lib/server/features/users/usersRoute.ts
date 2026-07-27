import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/server/routeAuth";
import { isOwnerUser } from "@/lib/auth/superAdmin";
import { storage } from "@/lib/storage";

export async function GET() {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;
  const users = await storage.listUsers();
  return NextResponse.json({ users });
}

export async function PATCH(req: Request) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;
  const { id, phone, name } = (await req.json()) as { id: string; phone?: string; name?: string };
  const target = id ?? user.id;
  if (target !== user.id && !isOwnerUser(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const updated = await storage.updateUser(target, { phone, name });
  return NextResponse.json({ user: updated });
}
