import { storage } from "@/lib/storage";
import type { ActivityEvent } from "@/lib/types";

/**
 * Best-effort audit/statistics logging. Never throws: a failure to write the
 * audit trail must not break the user-facing operation that triggered it.
 *
 * For deletes, pass a snapshot of the removed entity in `payload` so the record
 * stays meaningful after the underlying row is gone (rows are hard-deleted).
 */
export async function recordActivity(
  event: Omit<ActivityEvent, "id" | "createdAt">
): Promise<void> {
  try {
    await storage.appendActivity(event);
  } catch (err) {
    console.error("activity log write failed", err);
  }
}
