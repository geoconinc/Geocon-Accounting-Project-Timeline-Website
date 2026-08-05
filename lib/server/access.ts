import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { isOwnerUser } from "@/lib/auth/superAdmin";
import { isVisibleOnTimelineBoard } from "@/lib/domain/timelineBoardVisibility";
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
  if (isOwnerUser(user)) return true;
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

/**
 * Admin = owner OR board admin. Admins get full board visibility and admin panel
 * access. Only the owner (isOwnerUser) may change the admin list or site config.
 */
export async function isAdminAsync(user: User): Promise<boolean> {
  return hasFullBoardAccessAsync(user);
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

  const [allProjects, users, allSubitems, allFiles] = await Promise.all([
    storage.listProjects(),
    storage.listUsers(),
    storage.listAllSubitems(),
    includeFiles ? storage.listAllFiles() : Promise.resolve([] as FileRef[])
  ]);

  // GMS may push every won job; Timeline only surfaces prevailing-wage imports.
  const projects = allProjects.filter(isVisibleOnTimelineBoard);
  const boardProjectIds = new Set(projects.map((p) => p.id));
  const boardSubitems = allSubitems.filter((s) => boardProjectIds.has(s.projectId));
  const boardSubitemIds = new Set(boardSubitems.map((s) => s.id));
  const boardFiles = allFiles.filter((file) => {
    if (file.parentType === "project") return boardProjectIds.has(file.parentId);
    return boardSubitemIds.has(file.parentId);
  });

  if (await hasFullBoardAccessAsync(user)) {
    return {
      projects,
      subitems: boardSubitems,
      users,
      files: boardFiles,
      me: user.id
    };
  }

  const subsByProject = new Map<string, Subitem[]>();
  for (const subitem of boardSubitems) {
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
  if (includeFiles && boardFiles.length > 0) {
    const visibleSubitemIds = new Set(visibleSubitems.map((s) => s.id));
    files = boardFiles.filter((file) => {
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

export async function canViewProject(user: User, project: Project, subitems: Subitem[]): Promise<boolean> {
  if (await hasFullBoardAccessAsync(user)) return true;
  return isProjectLead(user, project) || subitems.some((subitem) => subitem.ownerId === user.id);
}

export async function canManageProject(user: User, project: Project): Promise<boolean> {
  if (await hasFullBoardAccessAsync(user)) return true;
  return isProjectLead(user, project);
}

export async function canViewSubitem(user: User, project: Project, subitem: Subitem): Promise<boolean> {
  if (await hasFullBoardAccessAsync(user)) return true;
  return isProjectLead(user, project) || subitem.ownerId === user.id;
}

export async function canManageSubitem(user: User, project: Project, subitem: Subitem): Promise<boolean> {
  if (await hasFullBoardAccessAsync(user)) return true;
  return isProjectLead(user, project) || subitem.ownerId === user.id;
}

export async function canAccessFileParent(
  user: User,
  parentType: FileRef["parentType"],
  parentId: string
): Promise<boolean> {
  if (await hasFullBoardAccessAsync(user)) return true;

  if (parentType === "project") {
    const project = await storage.getProject(parentId);
    return Boolean(project && isProjectLead(user, project));
  }

  const located = await findSubitem(parentId);
  if (!located) return false;
  return isProjectLead(user, located.project) || located.subitem.ownerId === user.id;
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
