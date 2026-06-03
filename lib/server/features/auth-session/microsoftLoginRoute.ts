import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { initialsFromName } from "@/lib/utils";
import { syncOfficeAssigneeUsersIntoStorage } from "@/lib/server/site-data/syncOfficeAssignees";
import { syncRoleAssigneeUsersIntoStorage } from "@/lib/server/site-data/syncRoleAssignees";

const ALLOWED_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN ?? "geoconinc.com").toLowerCase();

export async function POST(req: Request) {
  const { accessToken } = (await req.json().catch(() => ({}))) as { accessToken?: string };
  if (!accessToken) {
    return NextResponse.json({ error: "missing_access_token" }, { status: 400 });
  }

  const graphRes = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!graphRes.ok) {
    return NextResponse.json({ error: "graph_verification_failed" }, { status: 401 });
  }
  const me = (await graphRes.json()) as {
    mail?: string;
    userPrincipalName?: string;
    displayName?: string;
    mobilePhone?: string;
    businessPhones?: string[];
  };

  const email = (me.mail || me.userPrincipalName || "").toLowerCase();
  if (!email.endsWith("@" + ALLOWED_DOMAIN)) {
    return NextResponse.json(
      { error: "domain_not_allowed", message: `Only @${ALLOWED_DOMAIN} accounts are allowed.` },
      { status: 403 }
    );
  }

  const name = me.displayName || email.split("@")[0];
  const phone = me.mobilePhone || me.businessPhones?.[0];

  const user = await storage.upsertUser({
    email,
    name,
    initials: initialsFromName(name),
    phone
  });

  const session = await storage.createSession(user.id, 30);
  await storage.updateUser(user.id, { lastLoginAt: new Date().toISOString() });

  // Fire-and-forget: sync roster users in background, don't block login response
  Promise.all([
    syncRoleAssigneeUsersIntoStorage(),
    syncOfficeAssigneeUsersIntoStorage()
  ]).catch(() => {});

  const res = NextResponse.json({ user });
  res.cookies.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(session.expiresAt)
  });
  return res;
}
