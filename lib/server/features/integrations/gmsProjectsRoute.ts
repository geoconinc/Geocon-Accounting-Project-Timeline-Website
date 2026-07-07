import { NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@/lib/storage";
import { bus } from "@/lib/events/bus";
import { mapGmsOfficeToTimeline } from "@/lib/domain/gmsOfficeMap";
import { verifyGmsIntegrationKey } from "@/lib/server/integrations/verifyIntegrationKey";
import { createProjectWithSubitems } from "@/lib/server/features/projects/createProjectWithSubitems";
import { initialsFromName } from "@/lib/utils";

const ALLOWED_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN ?? "geoconinc.com").toLowerCase();

const personSchema = z.object({
  name: z.string().min(1),
  email: z.string().email()
});

const gmsProjectPayloadSchema = z.object({
  projectNumber: z.string().min(1),
  projectName: z.string().min(1),
  gmsProposalId: z.string().min(1).optional(),
  proposalNumber: z.string().optional(),
  clientName: z.string().optional(),
  officeCode: z.string().min(1),
  officeName: z.string().optional(),
  company: z.string().optional(),
  projectManager: personSchema,
  projectDirector: personSchema,
  feeEstimate: z.number().optional(),
  wonDate: z.string().optional(),
  dueDate: z.string().optional()
});

type GmsProjectPayload = z.infer<typeof gmsProjectPayloadSchema>;

function geoconEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith("@" + ALLOWED_DOMAIN);
}

function dateOnly(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function buildGmsNotes(payload: GmsProjectPayload): string {
  const lines: string[] = ["Imported from GMS."];
  if (payload.proposalNumber) lines.push(`Proposal #: ${payload.proposalNumber}`);
  if (payload.gmsProposalId) lines.push(`GMS proposal ID: ${payload.gmsProposalId}`);
  if (payload.clientName) lines.push(`Client: ${payload.clientName}`);
  if (payload.company) lines.push(`Company: ${payload.company}`);
  if (payload.feeEstimate != null) {
    lines.push(`Fee estimate: $${payload.feeEstimate.toLocaleString("en-US")}`);
  }
  return lines.join("\n");
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
    const updated = await storage.updateProject(
      existing.id,
      {
        code: payload.projectNumber.trim(),
        name: payload.projectName.trim(),
        office: office ?? existing.office,
        projectManagerId: projectManagerId ?? existing.projectManagerId,
        projectDirectorId: projectDirectorId ?? existing.projectDirectorId,
        startDate: startDate ?? existing.startDate,
        gmsProposalId: payload.gmsProposalId ?? existing.gmsProposalId ?? null,
        notes
      },
      null
    );

    if (!updated) {
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }

    bus.publish({ type: "project.upsert", payload: { id: updated.id } });

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
