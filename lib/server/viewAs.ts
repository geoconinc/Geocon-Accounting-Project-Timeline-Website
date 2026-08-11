import { cookies } from "next/headers";
import { VIEW_AS_COOKIE } from "@/lib/auth/constants";
import { storage } from "@/lib/storage";
import type { User } from "@/lib/types";
import type { ViewAsTarget } from "@/lib/domain/viewAs";

export type { ViewAsTarget } from "@/lib/domain/viewAs";

export function viewAsCookieOptions(clear = false) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    ...(clear ? { maxAge: 0 } : { maxAge: 60 * 60 * 8 }) // 8 hours
  };
}

export function readViewAsUserId(): string | null {
  try {
    const value = cookies().get(VIEW_AS_COOKIE)?.value?.trim();
    return value || null;
  } catch {
    // Outside a Next.js request (unit tests / scripts): treat as not simulating.
    return null;
  }
}

export async function loadViewAsUser(): Promise<User | null> {
  const targetId = readViewAsUserId();
  if (!targetId) return null;
  return storage.getUserById(targetId);
}

export function toViewAsTarget(user: User): ViewAsTarget {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    initials: user.initials
  };
}
