import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { bus } from "@/lib/events/bus";
import { mapGmsOfficeToTimeline } from "@/lib/domain/gmsOfficeMap";
import { gmsDasProjectPatch } from "@/lib/domain/gmsDas";
import {
  buildGmsNotes,
  dateOnly,
  geoconEmail,
  gmsProjectPayloadSchema,
  type GmsProjectPayload
} from "@/lib/domain/gmsProjectPayload";
import { verifyGmsIntegrationKey } from "@/lib/server/integrations/verifyIntegrationKey";
import { createProjectWithSubitems } from "@/lib/server/features/projects/createProjectWithSubitems";
import { applyGmsDasFieldsToProject } from "@/lib/server/features/integrations/applyGmsDasFields";
import { DAS_SETUP_SHEET_NAME } from "@/lib/domain/gmsDas";
import { recordActivity } from "@/lib/server/activityLog";
import { initialsFromName } from "@/lib/utils";

const ALLOWED_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN ?? "geoconinc.com").toLowerCase();

async function clearDasSetupSheetOwner(projectId: string): Promise<void> {
  const subs = await storage.listSubitems(projectId);
  const setup = subs.find((s) => s.name === DAS_SETUP_SHEET_NAME);
  if (!setup || setup.ownerId == null) return;
  const updated = await storage.updateSubitem(setup.id, { ownerId: null });
  if (updated) {
    bus.publish({ type: "subitem.upsert", payload: { id: updated.id, projectId } });
  }
}

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

  // Timeline only tracks prevailing-wage jobs. Non-PW projects are acknowledged and dropped
  // so GMS can keep pushing everything without creating noise on this board.
  if (payload.prevailingWage !== true) {
    // If a previously imported row exists, clear PW so board visibility filters hide it.
    const existing = await findExistingProject(payload);
    if (existing && existing.prevailingWage !== false) {
      const updated = await storage.updateProject(
        existing.id,
        { prevailingWage: false },
        null
      );
      if (updated) {
        bus.publish({ type: "project.upsert", payload: { id: updated.id } });
        await recordActivity({
          actorId: null,
          entityType: "project",
          entityId: updated.id,
          action: "update",
          payload: { source: "gms", skipped: "not_prevailing_wage", prevailingWage: false }
        });
      }
    }
    return NextResponse.json({
      ok: true,
      skipped: "not_prevailing_wage",
      message: "Project ignored — Timeline only imports prevailing-wage projects."
    });
  }

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
  const dasPatch = gmsDasProjectPatch(payload);

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
      notes,
      ...dasPatch
    };

    const updated = await storage.updateProject(existing.id, gmsPatch, null);

    if (!updated) {
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }

    bus.publish({ type: "project.upsert", payload: { id: updated.id } });

    await clearDasSetupSheetOwner(updated.id);

    // Sync DAS Setup Sheet when GMS reports completion (e.g. PM submitted the form).
    const incomingDasStatus = dasPatch.dasStatus ?? payload.dasStatus;
    const dasSync =
      incomingDasStatus !== undefined
        ? await applyGmsDasFieldsToProject(updated.id, { dasStatus: incomingDasStatus })
        : { projectUpdated: false, setupSheetCompleted: false };

    await recordActivity({
      actorId: null,
      entityType: "project",
      entityId: updated.id,
      action: "update",
      payload: { ...gmsPatch, source: "gms", setupSheetCompleted: dasSync.setupSheetCompleted }
    });

    return NextResponse.json({
      ok: true,
      created: false,
      project: { id: updated.id, code: updated.code },
      setupSheetCompleted: dasSync.setupSheetCompleted
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
      notes,
      prevailingWage: true,
      pwCategory: dasPatch.pwCategory,
      dasRequired: dasPatch.dasRequired,
      dasStatus: dasPatch.dasStatus,
      dasCompletedAt: dasPatch.dasCompletedAt
    },
    actorId: null,
    actorName: "GMS",
    // Accounting owns checklist emails on this site. DAS status comes from GMS — do not email the PM.
    sendNotifications: true,
    skipProjectManagerEmail: true
  });

  // DAS Setup Sheet is driven by GMS, not by a PM checklist on this board.
  await clearDasSetupSheetOwner(project.id);

  const createDasStatus = dasPatch.dasStatus ?? payload.dasStatus;
  const dasSync =
    createDasStatus !== undefined
      ? await applyGmsDasFieldsToProject(project.id, { dasStatus: createDasStatus })
      : { projectUpdated: false, setupSheetCompleted: false };

  return NextResponse.json(
    {
      ok: true,
      created: true,
      project: { id: project.id, code: project.code },
      setupSheetCompleted: dasSync.setupSheetCompleted
    },
    { status: 201 }
  );
}
