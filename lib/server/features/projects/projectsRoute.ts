import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { authenticateRequest } from "@/lib/server/routeAuth";
import { bus } from "@/lib/events/bus";
import { DEFAULT_SUBITEM_NAMES } from "@/lib/domain/projectDefaults";
import { isOffice, subitemOwnerIdForOffice } from "@/lib/domain/offices";
import { getBoardPayloadForUser } from "@/lib/server/access";
import { notifyUser } from "@/lib/notifications/dispatch";
import { syncRoleAssigneeUsersIntoStorage } from "@/lib/server/site-data/syncRoleAssignees";
import { syncOfficeAssigneeUsersIntoStorage } from "@/lib/server/site-data/syncOfficeAssignees";
import { getEffectiveOfficeAssigneeRows } from "@/lib/server/site-data/adminSiteConfigStore";
import {
  buildAssigneeDigestEmail,
  buildProjectManagerCreationEmail
} from "@/lib/notifications/projectCreationTemplates";

export async function GET(req: Request) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;

  const includeFiles = new URL(req.url).searchParams.get("includeFiles") !== "false";
  return NextResponse.json(await getBoardPayloadForUser(user, { includeFiles }));
}

export async function POST(req: Request) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;
  const body = (await req.json()) as Partial<Parameters<typeof storage.createProject>[0]>;

  await Promise.all([
    syncRoleAssigneeUsersIntoStorage(),
    syncOfficeAssigneeUsersIntoStorage()
  ]);

  const project = await storage.createProject({
    code: body.code ?? "NEW",
    name: body.name ?? "New project",
    ownerId: body.ownerId ?? user.id,
    status: body.status ?? "New",
    group: body.group ?? "Current",
    startDate: body.startDate ?? null,
    timelineStart: body.timelineStart ?? null,
    timelineEnd: body.timelineEnd ?? null,
    dirNumber: body.dirNumber ?? null,
    union: body.union ?? false,
    reportingSystems: body.reportingSystems ?? null,
    cprContact: body.cprContact ?? null,
    sharepointUrl: body.sharepointUrl ?? null,
    office: body.office ?? null,
    projectManagerId:
      typeof body.projectManagerId === "string" && body.projectManagerId
        ? body.projectManagerId
        : null,
    projectDirectorId:
      typeof body.projectDirectorId === "string" && body.projectDirectorId
        ? body.projectDirectorId
        : null,
    notes: body.notes ?? null,
    lastUpdatedBy: user.id
  });

  const allUsers = await storage.listUsers();
  const office = isOffice(project.office) ? project.office : null;
  const assigneeRows = await getEffectiveOfficeAssigneeRows();

  await Promise.all(
    DEFAULT_SUBITEM_NAMES.map((name) => {
      const ownerId = subitemOwnerIdForOffice(
        office,
        name,
        allUsers,
        project.projectManagerId,
        assigneeRows
      );
      return storage.createSubitem({
        projectId: project.id,
        name,
        ownerId,
        status: "NotStarted",
        dueDate: null,
        dateCompleted: null,
        notes: null
      });
    })
  );

  bus.publish({ type: "project.upsert", payload: { id: project.id } });

  const mailCtx = {
    projectCode: project.code,
    projectName: project.name,
    office: project.office ?? "—",
    creatorName: user.name
  };

  const subs = await storage.listSubitems(project.id);
  const taskOrder = new Map<string, number>(DEFAULT_SUBITEM_NAMES.map((n, i) => [n, i]));
  const sortTasks = (names: string[]) =>
    [...names].sort((a, b) => (taskOrder.get(a) ?? 999) - (taskOrder.get(b) ?? 999));

  const byUser = new Map<string, string[]>();
  for (const s of subs) {
    if (!s.ownerId) continue;
    const arr = byUser.get(s.ownerId) ?? [];
    arr.push(s.name);
    byUser.set(s.ownerId, arr);
  }

  if (project.projectManagerId) {
    const pmUser = await storage.getUserById(project.projectManagerId);
    if (pmUser) {
      const tasks = sortTasks(byUser.get(project.projectManagerId) ?? []);
      const { subject, message, html } = buildProjectManagerCreationEmail(
        mailCtx,
        pmUser.name,
        tasks
      );
      await notifyUser({
        userId: project.projectManagerId,
        projectId: project.id,
        subject,
        message,
        html
      });
    }
    byUser.delete(project.projectManagerId);
  }

  for (const [userId, tasks] of byUser) {
    if (tasks.length === 0) continue;
    const assignee = await storage.getUserById(userId);
    if (!assignee) continue;
    const { subject, message, html } = buildAssigneeDigestEmail(mailCtx, assignee.name, sortTasks(tasks));
    await notifyUser({
      userId,
      projectId: project.id,
      subject,
      message,
      html
    });
  }

  return NextResponse.json({ project });
}
