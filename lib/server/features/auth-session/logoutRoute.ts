import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { storage } from "@/lib/storage";
import { SESSION_COOKIE, VIEW_AS_COOKIE } from "@/lib/auth/constants";

export async function POST() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) await storage.deleteSession(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(VIEW_AS_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
