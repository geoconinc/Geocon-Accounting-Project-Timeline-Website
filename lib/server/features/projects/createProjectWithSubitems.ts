import { storage } from "@/lib/storage";
import { bus } from "@/lib/events/bus";
import { recordActivity } from "@/lib/server/activityLog";
import type { Project } from "@/lib/types";
import { DEFAULT_SUBITEM_NAMES } from "@/lib/domain/projectDefaults";
import { isOffice, subitemOwnerIdForOffice } from "@/lib/domain/offices";
import { notifyUser } from "@/lib/notifications/dispatch";
import { syncRoleAssigneeUsersIntoStorage } from "@/lib/server/site-data/syncRoleAssignees";
import { syncOfficeAssigneeUsersIntoStorage } from "@/lib/server/site-data/syncOfficeAssignees";
import { getEffectiveOfficeAssigneeRows } from "@/lib/server/site-data/adminSiteConfigStore";
import {
  buildAssigneeDigestEmail,
  buildProjectManagerCreationEmail
} from "@/lib/notifications/projectCreationTemplates";

export interface CreateProjectWithSubitemsInput {
  project: Omit<Project, "id" | "lastUpdatedAt" | "position" | "lastUpdatedBy"> & { id?: string };
  actorId: string | null;
  actorName: string;
  sendNotifications?: boolean;
}

export async function createProjectWithSubitems(
  input: CreateProjectWithSubitemsInput
): Promise<Project> {
  const { project: body, actorId, actorName, sendNotifications = true } = input;

  await Promise.all([
    syncRoleAssigneeUsersIntoStorage(),
    syncOfficeAssigneeUsersIntoStorage()
  ]);

  const project = await storage.createProject({
    ...body,
    lastUpdatedBy: actorId
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

  await recordActivity({
    actorId,
    entityType: "project",
    entityId: project.id,
    action: "create",
    payload: { code: project.code, name: project.name, office: project.office }
  });

  if (sendNotifications) {
    await sendProjectCreationNotifications(project, actorName);
  }

  return project;
}

async function sendProjectCreationNotifications(project: Project, creatorName: string) {
  const mailCtx = {
    projectCode: project.code,
    projectName: project.name,
    office: project.office ?? "—",
    creatorName
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
    const { subject, message, html } = buildAssigneeDigestEmail(
      mailCtx,
      assignee.name,
      sortTasks(tasks)
    );
    await notifyUser({
      userId,
      projectId: project.id,
      subject,
      message,
      html
    });
  }
}
