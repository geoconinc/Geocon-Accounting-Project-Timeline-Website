import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/server/routeAuth";
import { isOwnerUser } from "@/lib/auth/superAdmin";
import { storage } from "@/lib/storage";
import { bus } from "@/lib/events/bus";
import { recordActivity } from "@/lib/server/activityLog";

export const dynamic = "force-dynamic";

const CONFIRM_PHRASE = "RESET";

/**
 * Owner-only production reset: deletes every project (and related subitems/files)
 * and clears the activity log. Users, sessions, and site/email config are kept.
 *
 * Body: { confirm: "RESET" }
 */
export async function POST(req: Request) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;
  if (!isOwnerUser(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: { confirm?: string };
  try {
    body = (await req.json()) as { confirm?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (body.confirm !== CONFIRM_PHRASE) {
    return NextResponse.json(
      {
        error: "confirm_required",
        message: `Type ${CONFIRM_PHRASE} to confirm permanently deleting all projects.`
      },
      { status: 400 }
    );
  }

  const deletedIds = await storage.deleteAllProjects();
  const activityCleared = await storage.clearActivity();

  // Verify the wipe stuck (guards against silent no-ops / wrong DB).
  const remaining = await storage.listProjects();
  if (remaining.length > 0) {
    console.error("board reset failed: projects still present", remaining.length);
    return NextResponse.json(
      {
        error: "reset_incomplete",
        message: `Delete ran but ${remaining.length} project(s) still remain. Check database connection.`
      },
      { status: 500 }
    );
  }

  bus.publish({
    type: "board.reset",
    payload: { projectsDeleted: deletedIds.length }
  });
  for (const id of deletedIds) {
    bus.publish({ type: "project.delete", payload: { id } });
  }

  await recordActivity({
    actorId: user.id,
    entityType: "project",
    entityId: randomUUID(),
    action: "delete",
    payload: {
      source: "admin_reset",
      projectsDeleted: deletedIds.length,
      activityCleared
    }
  });

  return NextResponse.json({
    ok: true,
    projectsDeleted: deletedIds.length,
    activityCleared,
    remaining: 0
  });
}
