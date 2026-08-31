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
import { buildAssigneeDigestEmail } from "@/lib/notifications/projectCreationTemplates";
import { isAccountingEmailRecipient } from "@/lib/notifications/accountingOnly";

export interface CreateProjectWithSubitemsInput {
  project: Omit<Project, "id" | "lastUpdatedAt" | "position" | "lastUpdatedBy"> & { id?: string };
  actorId: string | null;
  actorName: string;
  sendNotifications?: boolean;
  /**
   * @deprecated Always skipped — PMs do not use Timeline. Kept for call-site compat.
   */
  skipProjectManagerEmail?: boolean;
  /** Merged into the create audit-log payload (e.g. `{ source: "gms" }`). */
  activityPayload?: Record<string, unknown>;
}

export async function createProjectWithSubitems(
  input: CreateProjectWithSubitemsInput
): Promise<Project> {
  const {
    project: body,
    actorId,
    actorName,
    sendNotifications = true,
    activityPayload
  } = input;

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
    payload: {
      code: project.code,
      name: project.name,
      office: project.office,
      ...(activityPayload ?? {})
    }
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
    creatorName,
    projectId: project.id
  };

  const subs = await storage.listSubitems(project.id);
  const taskOrder = new Map<string, number>(DEFAULT_SUBITEM_NAMES.map((n, i) => [n, i]));
  const sortTasks = (names: string[]) =>
    [...names].sort((a, b) => (taskOrder.get(a) ?? 999) - (taskOrder.get(b) ?? 999));

  const byUser = new Map<string, string[]>();
  for (const s of subs) {
    if (!s.ownerId) continue;
    // Only accounting checklist owners — never PM / director.
    if (!isAccountingEmailRecipient(s.ownerId, project)) continue;
    const arr = byUser.get(s.ownerId) ?? [];
    arr.push(s.name);
    byUser.set(s.ownerId, arr);
  }

  for (const [userId, tasks] of byUser) {
    if (tasks.length === 0) continue;
    const assignee = await storage.getUserById(userId);
    if (!assignee) continue;
    const { subject, message, html } = await buildAssigneeDigestEmail(
      mailCtx,
      assignee.name,
      sortTasks(tasks)
    );
    await notifyUser({
      userId,
      projectId: project.id,
      category: "projectCreated",
      subject,
      message,
      html
    });
  }
}
