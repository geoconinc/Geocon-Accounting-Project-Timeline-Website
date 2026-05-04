import type { User } from "@/lib/types";
import { requireUser } from "@/lib/auth/session";

/**
 * Same behavior as `requireUser().catch((r) => r)` used across API routes:
 * returns the authenticated user, or the thrown Response (typically 401).
 */
export async function authenticateRequest(): Promise<User | Response> {
  return requireUser().catch((r) => r) as Promise<User | Response>;
}
