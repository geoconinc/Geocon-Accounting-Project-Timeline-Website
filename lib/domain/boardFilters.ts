import type { ProjectStatus, SubitemStatus } from "@/lib/types";

// Pure board filtering/sorting logic, kept free of React so it can be unit-tested and
// reused without pulling in the Toolbar component (and its JSX) at import time.

export type SortKey = "position" | "name" | "code" | "lastUpdated" | "timeline";

export interface BoardFilters {
  search: string;
  ownerIds: string[];
  projectManagerIds: string[];
  projectDirectorIds: string[];
  statuses: ProjectStatus[];
  hideCompleted: boolean;
  mineOnly: boolean;
  sort: SortKey;
  subitemStatuses: SubitemStatus[];
  subitemNames: string[];
  subitemOwnerIds: string[];
}

export const DEFAULT_FILTERS: BoardFilters = {
  search: "",
  ownerIds: [],
  projectManagerIds: [],
  projectDirectorIds: [],
  statuses: [],
  hideCompleted: false,
  mineOnly: true,
  sort: "position",
  subitemStatuses: [],
  subitemNames: [],
  subitemOwnerIds: []
};

export function applyFilters<
  P extends {
    id: string;
    code: string;
    name: string;
    ownerId: string | null;
    projectManagerId: string | null;
    projectDirectorId: string | null;
    status: ProjectStatus;
    group: string;
    lastUpdatedAt: string;
    timelineStart: string | null;
    position: number;
  }
>(
  projects: P[],
  subitemsByProject: Record<string, { name: string; ownerId: string | null; status: string }[]>,
  filters: BoardFilters,
  meId: string | null
): P[] {
  let result = [...projects];

  if (filters.mineOnly && meId) {
    result = result.filter((p) => {
      if (p.ownerId === meId) return true;
      if (p.projectManagerId === meId) return true;
      if (p.projectDirectorId === meId) return true;
      const subs = subitemsByProject[p.id] ?? [];
      return subs.some((s) => s.ownerId === meId);
    });
  }
  if (filters.hideCompleted) {
    result = result.filter((p) => p.group !== "Completed");
  }
  if (filters.statuses.length > 0) {
    result = result.filter((p) => filters.statuses.includes(p.status));
  }
  if (filters.ownerIds.length > 0) {
    result = result.filter((p) => p.ownerId && filters.ownerIds.includes(p.ownerId));
  }
  if (filters.projectManagerIds.length > 0) {
    result = result.filter(
      (p) => p.projectManagerId && filters.projectManagerIds.includes(p.projectManagerId)
    );
  }
  if (filters.projectDirectorIds.length > 0) {
    result = result.filter(
      (p) => p.projectDirectorId && filters.projectDirectorIds.includes(p.projectDirectorId)
    );
  }

  const hasSubFilters =
    filters.subitemStatuses.length > 0 ||
    filters.subitemNames.length > 0 ||
    filters.subitemOwnerIds.length > 0;

  if (hasSubFilters) {
    result = result.filter((p) => {
      const subs = subitemsByProject[p.id] ?? [];
      return subs.some((s) => {
        if (filters.subitemStatuses.length > 0 && !filters.subitemStatuses.includes(s.status as SubitemStatus)) return false;
        if (filters.subitemNames.length > 0 && !filters.subitemNames.includes(s.name)) return false;
        if (filters.subitemOwnerIds.length > 0 && (!s.ownerId || !filters.subitemOwnerIds.includes(s.ownerId))) return false;
        return true;
      });
    });
  }

  if (filters.search.trim()) {
    const q = filters.search.toLowerCase();
    result = result.filter((p) => {
      if (p.code.toLowerCase().includes(q)) return true;
      if (p.name.toLowerCase().includes(q)) return true;
      const subs = subitemsByProject[p.id] ?? [];
      return subs.some((s) => s.name.toLowerCase().includes(q));
    });
  }

  const cmp = (a: P, b: P): number => {
    switch (filters.sort) {
      case "name":
        return a.name.localeCompare(b.name);
      case "code":
        return a.code.localeCompare(b.code);
      case "lastUpdated":
        return new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime();
      case "timeline":
        return (a.timelineStart ?? "9").localeCompare(b.timelineStart ?? "9");
      case "position":
      default:
        return a.position - b.position;
    }
  };
  result.sort(cmp);
  return result;
}
