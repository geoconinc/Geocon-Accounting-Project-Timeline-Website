import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import type { FileRef, Project, Subitem, User } from "@/lib/types";

export interface BoardPayload {
  projects: Project[];
  subitems: Subitem[];
  users: User[];
  files: FileRef[];
  me: string;
}

export interface BoardPayloadOptions {
  /** When false, skips the files query (faster for dashboard, timeline, team). */
  includeFiles?: boolean;
}

export interface LocatedSubitem {
  project: Project;
  subitem: Subitem;
}

export interface LocatedFile {
  file: FileRef;
  project: Project;
  subitem: Subitem | null;
}

function configuredEmails(name: string): Set<string> {
  return new Set(
    (process.env[name] ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

let storedAdminEmailsCache: Set<string> | null = null;

export function invalidateAccessCache(): void {
  storedAdminEmailsCache = null;
}

export function hasFullBoardAccess(user: User): boolean {
  const email = user.email.toLowerCase();
  if (configuredEmails("BOARD_ADMIN_EMAILS").has(email)) return true;
  if (storedAdminEmailsCache?.has(email)) return true;
  return false;
}

export async function hasFullBoardAccessAsync(user: User): Promise<boolean> {
  if (hasFullBoardAccess(user)) return true;

  const { getStoredBoardAdminEmails } = await import(
    "@/lib/server/site-data/adminSiteConfigStore"
  );
  const stored = await getStoredBoardAdminEmails();
  storedAdminEmailsCache = new Set(stored.map((e) => e.toLowerCase()));
  return storedAdminEmailsCache.has(user.email.toLowerCase());
}

/** Owner, project manager, or project director (not board admin — use hasFullBoardAccess for that). */
export function isProjectLead(user: User, project: Project): boolean {
  return (
    project.ownerId === user.id ||
    project.projectManagerId === user.id ||
    project.projectDirectorId === user.id
  );
}

export function forbidden(message = "forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export async function getBoardPayloadForUser(
  user: User,
  options: BoardPayloadOptions = {}
): Promise<BoardPayload> {
  const includeFiles = options.includeFiles !== false;

  const [projects, users, allSubitems, allFiles] = await Promise.all([
    storage.listProjects(),
    storage.listUsers(),
    storage.listAllSubitems(),
    includeFiles ? storage.listAllFiles() : Promise.resolve([] as FileRef[])
  ]);

  if (await hasFullBoardAccessAsync(user)) {
    return {
      projects,
      subitems: allSubitems,
      users,
      files: allFiles,
      me: user.id
    };
  }

  const subsByProject = new Map<string, Subitem[]>();
  for (const subitem of allSubitems) {
    const list = subsByProject.get(subitem.projectId);
    if (list) list.push(subitem);
    else subsByProject.set(subitem.projectId, [subitem]);
  }

  const visibleProjects: Project[] = [];
  const visibleSubitems: Subitem[] = [];
  const visibleProjectIds = new Set<string>();

  for (const project of projects) {
    const projectSubitems = subsByProject.get(project.id) ?? [];
    const leadsProject = isProjectLead(user, project);
    const assignedSubitems = projectSubitems.filter((subitem) => subitem.ownerId === user.id);

    if (!leadsProject && assignedSubitems.length === 0) continue;

    visibleProjects.push(project);
    visibleProjectIds.add(project.id);

    if (leadsProject) {
      visibleSubitems.push(...projectSubitems);
    } else {
      visibleSubitems.push(...assignedSubitems);
    }
  }

  let files: FileRef[] = [];
  if (includeFiles && allFiles.length > 0) {
    const visibleSubitemIds = new Set(visibleSubitems.map((s) => s.id));
    files = allFiles.filter((file) => {
      if (file.parentType === "project") {
        return visibleProjectIds.has(file.parentId);
      }
      return visibleSubitemIds.has(file.parentId);
    });
  }

  return {
    projects: visibleProjects,
    subitems: visibleSubitems,
    users,
    files,
    me: user.id
  };
}

export async function findSubitem(subitemId: string): Promise<LocatedSubitem | null> {
  const subitem = await storage.getSubitemById(subitemId);
  if (!subitem) return null;
  const project = await storage.getProject(subitem.projectId);
  if (!project) return null;
  return { project, subitem };
}

export function canViewProject(user: User, project: Project, subitems: Subitem[]): boolean {
  return (
    hasFullBoardAccess(user) ||
    isProjectLead(user, project) ||
    subitems.some((subitem) => subitem.ownerId === user.id)
  );
}

export function canManageProject(user: User, project: Project): boolean {
  return hasFullBoardAccess(user) || isProjectLead(user, project);
}

export function canViewSubitem(user: User, project: Project, subitem: Subitem): boolean {
  return hasFullBoardAccess(user) || isProjectLead(user, project) || subitem.ownerId === user.id;
}

export function canManageSubitem(user: User, project: Project, subitem: Subitem): boolean {
  return hasFullBoardAccess(user) || isProjectLead(user, project) || subitem.ownerId === user.id;
}

export async function canAccessFileParent(
  user: User,
  parentType: FileRef["parentType"],
  parentId: string
): Promise<boolean> {
  if (hasFullBoardAccess(user)) return true;

  if (parentType === "project") {
    const project = await storage.getProject(parentId);
    return Boolean(project && isProjectLead(user, project));
  }

  const located = await findSubitem(parentId);
  return Boolean(located && canViewSubitem(user, located.project, located.subitem));
}

export async function findFile(fileId: string): Promise<LocatedFile | null> {
  const file = await storage.getFileById(fileId);
  if (!file) return null;

  if (file.parentType === "project") {
    const project = await storage.getProject(file.parentId);
    return project ? { file, project, subitem: null } : null;
  }

  const located = await findSubitem(file.parentId);
  return located ? { file, project: located.project, subitem: located.subitem } : null;
}
