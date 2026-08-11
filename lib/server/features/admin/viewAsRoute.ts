import { NextResponse } from "next/server";
import { VIEW_AS_COOKIE } from "@/lib/auth/constants";
import { authenticateRequest } from "@/lib/server/routeAuth";
import { hasFullBoardAccessAsync, forbidden } from "@/lib/server/access";
import { parseJsonBody, badRequest } from "@/lib/server/http";
import { storage } from "@/lib/storage";
import { toViewAsTarget, viewAsCookieOptions } from "@/lib/server/viewAs";

/**
 * Admin-only: set or clear the board "view as" simulation cookie.
 * Body: { userId: string | null }
 */
export async function POST(req: Request) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;
  if (!(await hasFullBoardAccessAsync(user))) return forbidden();

  const body = await parseJsonBody<{ userId?: string | null }>(req);
  if (!body) return badRequest();

  if (!body.userId || body.userId === user.id) {
    const res = NextResponse.json({ ok: true, viewAs: null });
    res.cookies.set(VIEW_AS_COOKIE, "", viewAsCookieOptions(true));
    return res;
  }

  const target = await storage.getUserById(body.userId);
  if (!target) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  const res = NextResponse.json({ ok: true, viewAs: toViewAsTarget(target) });
  res.cookies.set(VIEW_AS_COOKIE, target.id, viewAsCookieOptions());
  return res;
}

export async function DELETE() {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;
  if (!(await hasFullBoardAccessAsync(user))) return forbidden();

  const res = NextResponse.json({ ok: true, viewAs: null });
  res.cookies.set(VIEW_AS_COOKIE, "", viewAsCookieOptions(true));
  return res;
}
