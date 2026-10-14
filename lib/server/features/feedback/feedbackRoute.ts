import { NextResponse } from "next/server";
import type { Feedback, User } from "@/lib/types";
import { storage } from "@/lib/storage";
import { authenticateRequest } from "@/lib/server/routeAuth";
import { isAdminAsync } from "@/lib/server/access";
import { badRequest, parseJsonBody, serverError } from "@/lib/server/http";
import {
  feedbackResolveSchema,
  feedbackSubmissionSchema,
  type AdminFeedbackEntry
} from "@/lib/domain/feedback";

function toAdminEntry(entry: Feedback, usersById: Map<string, User>): AdminFeedbackEntry {
  const submitter = entry.userId ? usersById.get(entry.userId) : undefined;
  return {
    ...entry,
    submitterName: submitter?.name ?? "Former user",
    submitterEmail: submitter?.email ?? null
  };
}

async function authenticateAdmin(): Promise<User | Response> {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;
  if (!(await isAdminAsync(user))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return user;
}

/** POST /api/feedback — any signed-in user. */
export async function submitFeedback(req: Request) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;

  const parsed = feedbackSubmissionSchema.safeParse(await parseJsonBody(req));
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid feedback.");
  }

  try {
    const entry = await storage.createFeedback({ ...parsed.data, userId: user.id });
    return NextResponse.json({ feedback: entry }, { status: 201 });
  } catch (err) {
    console.error("feedback write failed", err);
    return serverError("We couldn't save your feedback. Please try again.");
  }
}

/** GET /api/admin/feedback — admins only. */
export async function listFeedbackForAdmin() {
  const user = await authenticateAdmin();
  if (user instanceof Response) return user;

  const [entries, users] = await Promise.all([storage.listFeedback(), storage.listUsers()]);
  const usersById = new Map(users.map((u) => [u.id, u]));
  return NextResponse.json({ feedback: entries.map((e) => toAdminEntry(e, usersById)) });
}

/** PATCH /api/admin/feedback/[id] — admins only; body `{ resolved: boolean }`. */
export async function updateFeedbackResolved(req: Request, { params }: { params: { id: string } }) {
  const user = await authenticateAdmin();
  if (user instanceof Response) return user;

  const parsed = feedbackResolveSchema.safeParse(await parseJsonBody(req));
  if (!parsed.success) return badRequest("Body must be { resolved: boolean }.");

  const updated = await storage.setFeedbackResolved(params.id, parsed.data.resolved);
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const submitter = updated.userId ? await storage.getUserById(updated.userId) : null;
  const usersById = new Map(submitter ? [[submitter.id, submitter]] : []);
  return NextResponse.json({ feedback: toAdminEntry(updated, usersById) });
}
