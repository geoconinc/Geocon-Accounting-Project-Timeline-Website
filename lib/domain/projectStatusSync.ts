import { storage } from "@/lib/storage";
import type { Project, Subitem } from "@/lib/types";

/** Subitems marked N/A are excluded from completion checks (matches board UI). */
function countedSubitems(subitems: Subitem[]): Subitem[] {
  return subitems.filter((s) => s.status !== "NA");
}

export function deriveProjectStatusPatch(
  project: Pick<Project, "status" | "group">,
  subitems: Subitem[]
): Partial<Pick<Project, "status" | "group">> | null {
  const counted = countedSubitems(subitems);
  const allCompleted =
    counted.length > 0 && counted.every((s) => s.status === "Completed");

  if (allCompleted) {
    if (project.status === "Completed" && project.group === "Completed") return null;
    return { status: "Completed", group: "Completed" };
  }

  if (project.status === "Completed") {
    return { status: "InProgress", group: "Current" };
  }

  if (project.status === "New") {
    return { status: "InProgress" };
  }

  return null;
}

export async function syncProjectStatusFromSubitems(
  projectId: string,
  actorId: string | null = null
): Promise<Project | null> {
  const project = await storage.getProject(projectId);
  if (!project) return null;

  const subitems = await storage.listSubitems(projectId);
  const patch = deriveProjectStatusPatch(project, subitems);
  if (!patch) return project;

  return storage.updateProject(projectId, patch, actorId);
}

/** Promote a New project to In Progress when project fields are edited directly. */
export function deriveProjectActivityPatch(
  project: Pick<Project, "status">,
  patch: Record<string, unknown>
): Partial<Pick<Project, "status">> | null {
  if (project.status !== "New") return null;
  if ("status" in patch) return null;
  if (Object.keys(patch).length === 0) return null;
  return { status: "InProgress" };
}
