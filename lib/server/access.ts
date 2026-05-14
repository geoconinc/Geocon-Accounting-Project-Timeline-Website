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

export function hasFullBoardAccess(user: User): boolean {
  return configuredEmails("BOARD_ADMIN_EMAILS").has(user.email.toLowerCase());
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

export async function getBoardPayloadForUser(user: User): Promise<BoardPayload> {
  const [projects, users] = await Promise.all([storage.listProjects(), storage.listUsers()]);
  const subitemArrays = await Promise.all(projects.map((project) => storage.listSubitems(project.id)));
  const allSubitems = subitemArrays.flat();

  if (hasFullBoardAccess(user)) {
    const projectFileArrays = await Promise.all(
      projects.map((project) => storage.listFiles("project", project.id))
    );
    const subitemFileArrays = await Promise.all(
      allSubitems.map((subitem) => storage.listFiles("subitem", subitem.id))
    );

    return {
      projects,
      subitems: allSubitems,
      users,
      files: [...projectFileArrays.flat(), ...subitemFileArrays.flat()],
      me: user.id
    };
  }

  const visibleProjects: Project[] = [];
  const visibleSubitems: Subitem[] = [];
  const visibleProjectIds = new Set<string>();
  const visibleProjectFileIds = new Set<string>();

  for (const project of projects) {
    const projectSubitems = allSubitems.filter((subitem) => subitem.projectId === project.id);
    const leadsProject = isProjectLead(user, project);
    const assignedSubitems = projectSubitems.filter((subitem) => subitem.ownerId === user.id);

    if (!leadsProject && assignedSubitems.length === 0) continue;

    visibleProjects.push(project);
    visibleProjectIds.add(project.id);

    if (leadsProject) {
      visibleSubitems.push(...projectSubitems);
      visibleProjectFileIds.add(project.id);
    } else {
      visibleSubitems.push(...assignedSubitems);
    }
  }

  const projectFileArrays = await Promise.all(
    [...visibleProjectFileIds].map((projectId) => storage.listFiles("project", projectId))
  );
  const subitemFileArrays = await Promise.all(
    visibleSubitems.map((subitem) => storage.listFiles("subitem", subitem.id))
  );

  return {
    projects: visibleProjects.filter((project) => visibleProjectIds.has(project.id)),
    subitems: visibleSubitems,
    users,
    files: [...projectFileArrays.flat(), ...subitemFileArrays.flat()],
    me: user.id
  };
}

export async function findSubitem(subitemId: string): Promise<LocatedSubitem | null> {
  const projects = await storage.listProjects();

  for (const project of projects) {
    const subitems = await storage.listSubitems(project.id);
    const subitem = subitems.find((candidate) => candidate.id === subitemId);
    if (subitem) return { project, subitem };
  }

  return null;
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
  const projects = await storage.listProjects();

  for (const project of projects) {
    for (const file of await storage.listFiles("project", project.id)) {
      if (file.id === fileId) return { file, project, subitem: null };
    }

    for (const subitem of await storage.listSubitems(project.id)) {
      for (const file of await storage.listFiles("subitem", subitem.id)) {
        if (file.id === fileId) return { file, project, subitem };
      }
    }
  }

  return null;
}
