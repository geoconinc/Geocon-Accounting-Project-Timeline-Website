"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useBoardState, type BoardData } from "./features/board/state";
import { Group } from "./features/board/Group";
import { Toolbar, applyFilters, DEFAULT_FILTERS, type BoardFilters } from "./features/board/Toolbar";
import { isVisibleOnTimelineBoard } from "@/lib/domain/timelineBoardVisibility";
import { compareByLastName } from "@/lib/domain/userSort";
import {
  DEFAULT_EXPANSION,
  EXPANSION_MODE_STORAGE_KEY,
  parseStoredExpansionMode,
  setAllExpanded,
  toggleProject,
  type BoardExpansion
} from "@/lib/domain/boardExpansion";
import type { Project, Subitem } from "@/lib/types";

export default function Board({ initialData }: { initialData: BoardData }) {
  const { state, dispatch } = useBoardState(initialData);
  const [filters, setFilters] = useState<BoardFilters>(DEFAULT_FILTERS);
  const [expansion, setExpansion] = useState<BoardExpansion>(DEFAULT_EXPANSION);

  // Restore the last Collapse all / Expand all choice after mount (localStorage isn't
  // available during server render, so reading it in useState would mismatch hydration).
  useEffect(() => {
    try {
      const mode = parseStoredExpansionMode(window.localStorage.getItem(EXPANSION_MODE_STORAGE_KEY));
      if (mode !== "default") setExpansion({ mode, overrides: {} });
    } catch {
      // storage blocked — keep the default
    }
  }, []);

  const onSetAllExpanded = useCallback((expanded: boolean) => {
    const next = setAllExpanded(expanded);
    setExpansion(next);
    try {
      window.localStorage.setItem(EXPANSION_MODE_STORAGE_KEY, next.mode);
    } catch {
      // storage blocked — the choice still applies for this visit
    }
  }, []);

  const onToggleProject = useCallback(
    (project: Project) => setExpansion((prev) => toggleProject(prev, project)),
    []
  );

  const usersByLastName = useMemo(() => [...state.users].sort(compareByLastName), [state.users]);

  // Defense in depth: hide non-PW GMS imports even if an older payload/SSE upsert includes them.
  const boardProjects = useMemo(
    () => state.projects.filter(isVisibleOnTimelineBoard),
    [state.projects]
  );

  const subsByProject = useMemo(() => {
    const map: Record<string, { name: string; ownerId: string | null; status: string }[]> = {};
    for (const s of state.subitems)
      (map[s.projectId] ||= []).push({ name: s.name, ownerId: s.ownerId, status: s.status });
    return map;
  }, [state.subitems]);

  const filtered = useMemo(
    () => applyFilters(boardProjects, subsByProject, filters, state.me),
    [boardProjects, subsByProject, filters, state.me]
  );

  const { current, future, completed } = useMemo(() => {
    const c: Project[] = [];
    const f: Project[] = [];
    const d: Project[] = [];
    for (const p of filtered) {
      if (p.group === "Current") c.push(p);
      else if (p.group === "Future") f.push(p);
      else d.push(p);
    }
    return { current: c, future: f, completed: d };
  }, [filtered]);

  // Deep-link support: /?focusProject=<id> (e.g. from the admin employee drill-down)
  // scrolls to and briefly highlights the project row once it has rendered.
  useEffect(() => {
    const focusId = new URLSearchParams(window.location.search).get("focusProject");
    if (!focusId) return;
    const el = document.getElementById(`project-${focusId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const ring = ["ring-2", "ring-brand", "ring-inset"];
    el.classList.add(...ring);
    const t = setTimeout(() => el.classList.remove(...ring), 2500);
    return () => clearTimeout(t);
  }, [filtered]);

  const onProjectUpdated = useCallback(
    (project: Project) => dispatch({ type: "upsertProject", project }),
    [dispatch]
  );
  const onProjectDeleted = useCallback(
    (id: string) => dispatch({ type: "deleteProject", id }),
    [dispatch]
  );
  const onSubitemUpdated = useCallback(
    (subitem: Subitem) => dispatch({ type: "upsertSubitem", subitem }),
    [dispatch]
  );
  const onSubitemDeleted = useCallback(
    (id: string) => dispatch({ type: "deleteSubitem", id }),
    [dispatch]
  );
  const onFileDeleted = useCallback(
    (id: string) => dispatch({ type: "deleteFile", id }),
    [dispatch]
  );

  const canEditProject = Boolean(state.isAdmin) && !state.viewAs;

  const groupProps = {
    allSubitems: state.subitems,
    users: usersByLastName,
    files: state.files,
    meId: state.me,
    canEditProject,
    expansion,
    onToggleProject,
    onProjectUpdated,
    onProjectDeleted,
    onSubitemUpdated,
    onSubitemDeleted,
    onFileDeleted
  };

  return (
    <div className="flex flex-col h-full">
      <Toolbar
        filters={filters}
        onChange={setFilters}
        users={usersByLastName}
        allCollapsed={expansion.mode === "allCollapsed"}
        onSetAllExpanded={onSetAllExpanded}
      />
      <div className="flex-1 overflow-auto p-5 bg-[#f4f6fa]">
        <div className="max-w-full">
          <Group name="Current" projects={current} {...groupProps} />
          <Group name="Future" projects={future} {...groupProps} />
          {!filters.hideCompleted && <Group name="Completed" projects={completed} {...groupProps} />}
        </div>
      </div>
    </div>
  );
}
