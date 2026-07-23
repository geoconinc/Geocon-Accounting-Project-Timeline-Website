import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { bus } from "@/lib/events/bus";
import { mapGmsOfficeToTimeline } from "@/lib/domain/gmsOfficeMap";
import {
  buildGmsNotes,
  dateOnly,
  geoconEmail,
  gmsProjectPayloadSchema,
  type GmsProjectPayload
} from "@/lib/domain/gmsProjectPayload";
import { verifyGmsIntegrationKey } from "@/lib/server/integrations/verifyIntegrationKey";
import { createProjectWithSubitems } from "@/lib/server/features/projects/createProjectWithSubitems";
import { recordActivity } from "@/lib/server/activityLog";
import { initialsFromName } from "@/lib/utils";

const ALLOWED_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN ?? "geoconinc.com").toLowerCase();

async function ensureUserId(name: string, email: string): Promise<string | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!geoconEmail(normalizedEmail)) return null;

  const existing = await storage.getUserByEmail(normalizedEmail);
  if (existing) return existing.id;

  const user = await storage.upsertUser({
    email: normalizedEmail,
    name: name.trim(),
    initials: initialsFromName(name)
  });
  return user.id;
}

async function findExistingProject(payload: GmsProjectPayload) {
  const byCode = await storage.getProjectByCode(payload.projectNumber);
  if (byCode) return byCode;

  if (payload.gmsProposalId) {
    return storage.getProjectByGmsProposalId(payload.gmsProposalId);
  }

  return null;
}

export async function POST(req: Request) {
  if (!verifyGmsIntegrationKey(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = gmsProjectPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const payload = parsed.data;

  if (!geoconEmail(payload.projectManager.email) || !geoconEmail(payload.projectDirector.email)) {
    return NextResponse.json(
      { error: "invalid_email_domain", message: `PM and Director must use @${ALLOWED_DOMAIN} emails.` },
      { status: 400 }
    );
  }

  const [projectManagerId, projectDirectorId] = await Promise.all([
    ensureUserId(payload.projectManager.name, payload.projectManager.email),
    ensureUserId(payload.projectDirector.name, payload.projectDirector.email)
  ]);

  const office = mapGmsOfficeToTimeline(payload.officeCode, payload.officeName);
  const notes = buildGmsNotes(payload);
  const startDate = dateOnly(payload.wonDate);

  const existing = await findExistingProject(payload);

  if (existing) {
    const gmsPatch = {
      code: payload.projectNumber.trim(),
      name: payload.projectName.trim(),
      office: office ?? existing.office,
      projectManagerId: projectManagerId ?? existing.projectManagerId,
      projectDirectorId: projectDirectorId ?? existing.projectDirectorId,
      startDate: startDate ?? existing.startDate,
      gmsProposalId: payload.gmsProposalId ?? existing.gmsProposalId ?? null,
      notes
    };

    const updated = await storage.updateProject(existing.id, gmsPatch, null);

    if (!updated) {
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }

    bus.publish({ type: "project.upsert", payload: { id: updated.id } });

    await recordActivity({
      actorId: null,
      entityType: "project",
      entityId: updated.id,
      action: "update",
      payload: { ...gmsPatch, source: "gms" }
    });

    return NextResponse.json({
      ok: true,
      created: false,
      project: { id: updated.id, code: updated.code }
    });
  }

  const project = await createProjectWithSubitems({
    project: {
      code: payload.projectNumber.trim(),
      name: payload.projectName.trim(),
      ownerId: projectManagerId,
      status: "New",
      group: "Current",
      startDate,
      timelineStart: null,
      timelineEnd: dateOnly(payload.dueDate),
      dirNumber: null,
      union: false,
      reportingSystems: null,
      cprContact: null,
      sharepointUrl: null,
      office,
      projectManagerId,
      projectDirectorId,
      gmsProposalId: payload.gmsProposalId ?? null,
      notes
    },
    actorId: null,
    actorName: "GMS",
    sendNotifications: true
  });

  return NextResponse.json(
    {
      ok: true,
      created: true,
      project: { id: project.id, code: project.code }
    },
    { status: 201 }
  );
}
