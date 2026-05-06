"use client";

import { useMemo, useState } from "react";
import { useBoardState, type BoardData } from "./board/state";
import { Group } from "./board/Group";
import { Toolbar, applyFilters, DEFAULT_FILTERS, type BoardFilters } from "./board/Toolbar";

export default function Board({ initialData }: { initialData: BoardData }) {
  const { state } = useBoardState(initialData);
  const [filters, setFilters] = useState<BoardFilters>(DEFAULT_FILTERS);

  const subsByProject = useMemo(() => {
    const map: Record<string, { name: string; ownerId: string | null }[]> = {};
    for (const s of state.subitems)
      (map[s.projectId] ||= []).push({ name: s.name, ownerId: s.ownerId });
    return map;
  }, [state.subitems]);

  const filtered = useMemo(
    () => applyFilters(state.projects, subsByProject, filters, state.me),
    [state.projects, subsByProject, filters, state.me]
  );

  const current = filtered.filter((p) => p.group === "Current");
  const future = filtered.filter((p) => p.group === "Future");
  const completed = filtered.filter((p) => p.group === "Completed");

  return (
    <div className="flex flex-col h-full">
      <Toolbar filters={filters} onChange={setFilters} users={state.users} />
      <div className="flex-1 overflow-auto p-4 bg-slate-100">
        <div className="max-w-full">
          <Group
            name="Current"
            projects={current}
            allSubitems={state.subitems}
            users={state.users}
            files={state.files}
          />
          <Group
            name="Future"
            projects={future}
            allSubitems={state.subitems}
            users={state.users}
            files={state.files}
          />
          {!filters.hideCompleted && (
            <Group
              name="Completed"
              projects={completed}
              allSubitems={state.subitems}
              users={state.users}
              files={state.files}
            />
          )}
        </div>
      </div>
    </div>
  );
}
