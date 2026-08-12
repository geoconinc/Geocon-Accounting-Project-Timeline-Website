import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { isOwnerUser } from "@/lib/auth/superAdmin";
import { isVisibleOnTimelineBoard } from "@/lib/domain/timelineBoardVisibility";
import {
  isDasOnlyAssignee,
  isDasTrackingSubitemName
} from "@/lib/domain/projectDefaults";
import { loadViewAsUser, toViewAsTarget } from "@/lib/server/viewAs";
import type { ViewAsTarget } from "@/lib/domain/viewAs";
import type { FileRef, Project, Subitem, User } from "@/lib/types";

export type BoardRole = "admin" | "das" | "assignee";

export interface BoardPayload {
  projects: Project[];
  subitems: Subitem[];
  users: User[];
  files: FileRef[];
  me: string;
  /** Full board admins (Sid / Kailua / Bill / Marissa, etc.). */
  isAdmin: boolean;
  /** Drives board visibility: admin = everything; das = own DAS 140/142 only; assignee = own items. */
  boardRole: BoardRole;
  /**
   * When set, the signed-in admin is previewing this user's board.
   * UI should treat the board as read-only until they exit.
   */
  viewAs: ViewAsTarget | null;
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

function filesForSubitems(allFiles: FileRef[], subitems: Subitem[], projectIds: Set<string>): FileRef[] {
  if (allFiles.length === 0) return [];
  const subitemIds = new Set(subitems.map((s) => s.id));
  return allFiles.filter((file) => {
    if (file.parentType === "project") return projectIds.has(file.parentId);
    return subitemIds.has(file.parentId);
  });
}

export async function getBoardPayloadForUser(
  user: User,
  options: BoardPayloadOptions = {}
): Promise<BoardPayload> {
  const includeFiles = options.includeFiles !== false;

  // Admins may preview another user's filtered board via the view-as cookie.
  let viewer = user;
  let viewAs: ViewAsTarget | null = null;
  if (await hasFullBoardAccessAsync(user)) {
    const target = await loadViewAsUser();
    if (target && target.id !== user.id) {
      viewer = target;
      viewAs = toViewAsTarget(target);
    }
  }

  const payload = await buildBoardPayloadForViewer(viewer, includeFiles);
  return { ...payload, viewAs };
}

async function buildBoardPayloadForViewer(
  user: User,
  includeFiles: boolean
): Promise<Omit<BoardPayload, "viewAs">> {
  const isAdmin = await hasFullBoardAccessAsync(user);

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
  const boardFiles = includeFiles
    ? allFiles.filter((file) => {
        if (file.parentType === "project") return boardProjectIds.has(file.parentId);
        return boardSubitems.some((s) => s.id === file.parentId);
      })
    : [];

  if (isAdmin) {
    return {
      projects,
      subitems: boardSubitems,
      users,
      files: boardFiles,
      me: user.id,
      isAdmin: true,
      boardRole: "admin"
    };
  }

  const ownedOnBoard = boardSubitems.filter((s) => s.ownerId === user.id);

  // DAS 140/142 specialists: only their assigned DAS 140/142 rows (and those projects).
  if (isDasOnlyAssignee(ownedOnBoard)) {
    const dasSubitems = ownedOnBoard.filter((s) => isDasTrackingSubitemName(s.name));
    const visibleProjectIds = new Set(dasSubitems.map((s) => s.projectId));
    const visibleProjects = projects.filter((p) => visibleProjectIds.has(p.id));
    return {
      projects: visibleProjects,
      subitems: dasSubitems,
      users,
      files: includeFiles
        ? filesForSubitems(boardFiles, dasSubitems, visibleProjectIds)
        : [],
      me: user.id,
      isAdmin: false,
      boardRole: "das"
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

    // Leads still see their projects, but only their own checklist rows unless admin.
    // (Project field edits are admin-only; checklist work stays on assigned items.)
    if (leadsProject && assignedSubitems.length === 0) {
      // Lead with no personal checklist ownership: show the project shell, no foreign statuses.
      continue;
    }
    visibleSubitems.push(...assignedSubitems);
  }

  return {
    projects: visibleProjects,
    subitems: visibleSubitems,
    users,
    files: includeFiles
      ? filesForSubitems(boardFiles, visibleSubitems, visibleProjectIds)
      : [],
    me: user.id,
    isAdmin: false,
    boardRole: "assignee"
  };
}

/** True when a board admin is previewing someone else's board (mutations must be denied). */
export async function isSimulatingBoardView(realUser: User): Promise<boolean> {
  if (!(await hasFullBoardAccessAsync(realUser))) return false;
  const target = await loadViewAsUser();
  return Boolean(target && target.id !== realUser.id);
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
  if (isProjectLead(user, project)) return true;
  if (subitems.some((subitem) => subitem.ownerId === user.id)) return true;
  return false;
}

/** Project create/update/delete and project-level field edits — board admins only. */
export async function canManageProject(user: User, _project?: Project): Promise<boolean> {
  if (await isSimulatingBoardView(user)) return false;
  return hasFullBoardAccessAsync(user);
}

export async function canViewSubitem(user: User, _project: Project, subitem: Subitem): Promise<boolean> {
  if (await hasFullBoardAccessAsync(user)) return true;
  return subitem.ownerId === user.id;
}

/**
 * Assignees (including DAS 140/142 people) may update status / dates / notes
 * on their own items only. Project leads no longer get blanket edit of every checklist row.
 */
export async function canManageSubitem(user: User, _project: Project, subitem: Subitem): Promise<boolean> {
  if (await isSimulatingBoardView(user)) return false;
  if (await hasFullBoardAccessAsync(user)) return true;
  return subitem.ownerId === user.id;
}

/** Renaming, reassigning, or deleting checklist rows is admin-only. */
export async function canAdminSubitem(user: User): Promise<boolean> {
  if (await isSimulatingBoardView(user)) return false;
  return hasFullBoardAccessAsync(user);
}

export async function canAccessFileParent(
  user: User,
  parentType: FileRef["parentType"],
  parentId: string
): Promise<boolean> {
  if (await isSimulatingBoardView(user)) return false;
  if (await hasFullBoardAccessAsync(user)) return true;

  if (parentType === "project") {
    // Project-level files: admins only.
    return false;
  }

  const located = await findSubitem(parentId);
  if (!located) return false;
  return canManageSubitem(user, located.project, located.subitem);
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
