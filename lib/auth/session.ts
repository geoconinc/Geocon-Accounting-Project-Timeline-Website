import { cookies } from "next/headers";
import { storage } from "@/lib/storage";
import type { User } from "@/lib/types";
import { SESSION_COOKIE } from "./constants";

export { SESSION_COOKIE } from "./constants";

export async function getCurrentUser(): Promise<User | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await storage.getSession(token);
  if (!session) return null;
  return storage.getUserById(session.userId);
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" }
    });
  }
  return user;
}
