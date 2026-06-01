"use client";

import { useMemo, useState } from "react";
import { Search, Filter, ArrowUpDown, EyeOff, X, User as UserIcon } from "lucide-react";
import type { ProjectStatus, SubitemStatus, User } from "@/lib/types";
import { projectColors, projectLabel, subColors, subLabel } from "./StatusCell";
import { Avatar } from "./Avatar";
import { usePopover } from "./Popover";
import { rosterDirectorPickerUsers, rosterPmPickerUsers } from "@/lib/domain/roleAssigneeRoster";
import { DEFAULT_SUBITEM_NAMES } from "@/lib/domain/projectDefaults";

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

export function Toolbar({
  filters,
  onChange,
  users
}: {
  filters: BoardFilters;
  onChange: (next: BoardFilters) => void;
  users: User[];
}) {
  const filterPop = usePopover();
  const sortPop = usePopover();

  const pmFilterUsers = useMemo(() => rosterPmPickerUsers(users), [users]);
  const directorFilterUsers = useMemo(() => rosterDirectorPickerUsers(users), [users]);

  const activeCount =
    filters.ownerIds.length +
    filters.projectManagerIds.length +
    filters.projectDirectorIds.length +
    filters.statuses.length +
    filters.subitemStatuses.length +
    filters.subitemNames.length +
    filters.subitemOwnerIds.length +
    (filters.hideCompleted ? 1 : 0);

  function update<K extends keyof BoardFilters>(key: K, value: BoardFilters[K]) {
    onChange({ ...filters, [key]: value });
  }

  function toggleOwner(id: string) {
    update(
      "ownerIds",
      filters.ownerIds.includes(id)
        ? filters.ownerIds.filter((x) => x !== id)
        : [...filters.ownerIds, id]
    );
  }

  function toggleStatus(s: ProjectStatus) {
    update(
      "statuses",
      filters.statuses.includes(s)
        ? filters.statuses.filter((x) => x !== s)
        : [...filters.statuses, s]
    );
  }

  function toggleProjectManager(id: string) {
    update(
      "projectManagerIds",
      filters.projectManagerIds.includes(id)
        ? filters.projectManagerIds.filter((x) => x !== id)
        : [...filters.projectManagerIds, id]
    );
  }

  function toggleProjectDirector(id: string) {
    update(
      "projectDirectorIds",
      filters.projectDirectorIds.includes(id)
        ? filters.projectDirectorIds.filter((x) => x !== id)
        : [...filters.projectDirectorIds, id]
    );
  }

  function toggleSubitemStatus(s: SubitemStatus) {
    update(
      "subitemStatuses",
      filters.subitemStatuses.includes(s)
        ? filters.subitemStatuses.filter((x) => x !== s)
        : [...filters.subitemStatuses, s]
    );
  }

  function toggleSubitemName(name: string) {
    update(
      "subitemNames",
      filters.subitemNames.includes(name)
        ? filters.subitemNames.filter((x) => x !== name)
        : [...filters.subitemNames, name]
    );
  }

  function toggleSubitemOwner(id: string) {
    update(
      "subitemOwnerIds",
      filters.subitemOwnerIds.includes(id)
        ? filters.subitemOwnerIds.filter((x) => x !== id)
        : [...filters.subitemOwnerIds, id]
    );
  }

  const [filterTab, setFilterTab] = useState<"project" | "subitem">("project");

  return (
    <div className="bg-white border-b border-slate-200 px-5 py-2.5 flex items-center gap-2 flex-wrap shrink-0">
      <div className="relative flex-1 min-w-[220px] max-w-md">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={filters.search}
          onChange={(e) => update("search", e.target.value)}
          placeholder="Search projects, subitems, codes..."
          className="w-full pl-8 pr-8 py-1.5 text-sm border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-brand"
        />
        {filters.search && (
          <button
            onClick={() => update("search", "")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="relative" ref={filterPop.ref}>
        <button
          onClick={() => filterPop.setOpen((o) => !o)}
          className={`btn-ghost text-sm border ${
            activeCount ? "border-brand text-brand" : "border-slate-200 text-slate-600"
          }`}
        >
          <Filter size={14} /> Filter {activeCount > 0 && <span className="ml-1 bg-brand text-white text-[10px] rounded-full px-1.5">{activeCount}</span>}
        </button>
        {filterPop.open && (
          <div className="absolute z-30 top-full left-0 mt-1 w-80 bg-white border border-slate-200 rounded-md shadow-lg max-h-[min(560px,70vh)] overflow-hidden flex flex-col">
            <div className="flex border-b border-slate-200 shrink-0">
              <button
                onClick={() => setFilterTab("project")}
                className={`flex-1 text-xs font-medium py-2 transition-colors ${
                  filterTab === "project"
                    ? "text-brand border-b-2 border-brand"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Project
              </button>
              <button
                onClick={() => setFilterTab("subitem")}
                className={`flex-1 text-xs font-medium py-2 transition-colors ${
                  filterTab === "subitem"
                    ? "text-brand border-b-2 border-brand"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Subitem
              </button>
            </div>
            <div className="p-3 overflow-y-auto flex-1">
              {filterTab === "project" ? (
                <>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    Status
                  </div>
                  <div className="flex flex-col gap-1 mb-3">
                    {(["New", "InProgress", "Completed", "Missing", "Future"] as ProjectStatus[]).map((s) => (
                      <label key={s} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.statuses.includes(s)}
                          onChange={() => toggleStatus(s)}
                        />
                        <span className={`w-2.5 h-2.5 rounded ${projectColors[s]}`} />
                        {projectLabel[s]}
                      </label>
                    ))}
                  </div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    Owner
                  </div>
                  <div className="flex flex-col gap-1 mb-3 max-h-40 overflow-y-auto">
                    {users.length === 0 && (
                      <span className="text-xs text-slate-400">No users yet.</span>
                    )}
                    {users.map((u) => (
                      <label key={u.id} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.ownerIds.includes(u.id)}
                          onChange={() => toggleOwner(u.id)}
                        />
                        <Avatar user={u} size={20} />
                        <span className="truncate">{u.name}</span>
                      </label>
                    ))}
                  </div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    Project manager
                  </div>
                  <div className="flex flex-col gap-1 mb-3 max-h-36 overflow-y-auto">
                    {pmFilterUsers.length === 0 ? (
                      <span className="text-xs text-slate-400">No roster PMs in directory.</span>
                    ) : (
                      pmFilterUsers.map((u) => (
                        <label key={u.id} className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filters.projectManagerIds.includes(u.id)}
                            onChange={() => toggleProjectManager(u.id)}
                          />
                          <Avatar user={u} size={20} />
                          <span className="truncate">{u.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    Project director
                  </div>
                  <div className="flex flex-col gap-1 mb-3 max-h-36 overflow-y-auto">
                    {directorFilterUsers.length === 0 ? (
                      <span className="text-xs text-slate-400">No roster directors in directory.</span>
                    ) : (
                      directorFilterUsers.map((u) => (
                        <label key={u.id} className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filters.projectDirectorIds.includes(u.id)}
                            onChange={() => toggleProjectDirector(u.id)}
                          />
                          <Avatar user={u} size={20} />
                          <span className="truncate">{u.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    Subitem status
                  </div>
                  <div className="flex flex-col gap-1 mb-3">
                    {(["Completed", "InProgress", "Missing", "NotStarted", "NA"] as SubitemStatus[]).map((s) => (
                      <label key={s} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.subitemStatuses.includes(s)}
                          onChange={() => toggleSubitemStatus(s)}
                        />
                        <span className={`w-2.5 h-2.5 rounded ${subColors[s]}`} />
                        {subLabel[s]}
                      </label>
                    ))}
                  </div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    Subitem type
                  </div>
                  <div className="flex flex-col gap-1 mb-3 max-h-48 overflow-y-auto">
                    {DEFAULT_SUBITEM_NAMES.map((name) => (
                      <label key={name} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.subitemNames.includes(name)}
                          onChange={() => toggleSubitemName(name)}
                        />
                        <span className="truncate">{name}</span>
                      </label>
                    ))}
                  </div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    Assigned to
                  </div>
                  <div className="flex flex-col gap-1 mb-3 max-h-40 overflow-y-auto">
                    {users.length === 0 && (
                      <span className="text-xs text-slate-400">No users yet.</span>
                    )}
                    {users.map((u) => (
                      <label key={u.id} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.subitemOwnerIds.includes(u.id)}
                          onChange={() => toggleSubitemOwner(u.id)}
                        />
                        <Avatar user={u} size={20} />
                        <span className="truncate">{u.name}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="border-t border-slate-200 p-2 shrink-0">
              <button
                onClick={() => onChange({ ...DEFAULT_FILTERS, sort: filters.sort })}
                className="text-xs text-slate-500 hover:text-brand"
              >
                Clear all filters
              </button>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={() => update("mineOnly", !filters.mineOnly)}
        className={`btn-ghost text-sm border ${
          filters.mineOnly ? "border-brand text-brand" : "border-slate-200 text-slate-600"
        }`}
        title="Show only items assigned to you"
      >
        <UserIcon size={14} /> {filters.mineOnly ? "Only mine" : "Show all"}
      </button>

      <button
        onClick={() => update("hideCompleted", !filters.hideCompleted)}
        className={`btn-ghost text-sm border ${
          filters.hideCompleted
            ? "border-brand text-brand"
            : "border-slate-200 text-slate-600"
        }`}
        title="Hide projects in the Completed group"
      >
        <EyeOff size={14} /> {filters.hideCompleted ? "Show completed" : "Hide completed"}
      </button>

      <div className="relative" ref={sortPop.ref}>
        <button
          onClick={() => sortPop.setOpen((o) => !o)}
          className="btn-ghost text-sm border border-slate-200 text-slate-600"
        >
          <ArrowUpDown size={14} /> Sort
        </button>
        {sortPop.open && (
          <div className="absolute z-30 top-full right-0 mt-1 w-48 bg-white border border-slate-200 rounded-md shadow-lg py-1">
            {(
              [
                { k: "position", label: "Manual order" },
                { k: "name", label: "Project name (A→Z)" },
                { k: "code", label: "Code (A→Z)" },
                { k: "lastUpdated", label: "Last updated" },
                { k: "timeline", label: "Timeline start" }
              ] as { k: SortKey; label: string }[]
            ).map((opt) => (
              <button
                key={opt.k}
                onClick={() => {
                  update("sort", opt.k);
                  sortPop.setOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 ${
                  filters.sort === opt.k ? "text-brand font-medium" : "text-slate-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

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
