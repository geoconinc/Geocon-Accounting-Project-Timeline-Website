"use client";

import { useEffect, useMemo, useState } from "react";
import { useBoardState, type BoardData } from "./features/board/state";
import { Group } from "./features/board/Group";
import { Toolbar, applyFilters, DEFAULT_FILTERS, type BoardFilters } from "./features/board/Toolbar";
import { DEMO_MODE } from "@/lib/demo/config";
import { syncDemoRoleRosterUsersOnce } from "@/lib/demo/syncRoleRosterToDemo";

export default function Board({ initialData }: { initialData: BoardData }) {
  const { state, dispatch } = useBoardState(initialData);
  const [filters, setFilters] = useState<BoardFilters>(DEFAULT_FILTERS);

  useEffect(() => {
    if (DEMO_MODE) syncDemoRoleRosterUsersOnce();
  }, []);

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
      <div className="flex-1 overflow-auto p-5 bg-[#f4f6fa]">
        <div className="max-w-full">
          <Group
            name="Current"
            projects={current}
            allSubitems={state.subitems}
            users={state.users}
            files={state.files}
            onProjectUpdated={(project) => dispatch({ type: "upsertProject", project })}
            onProjectDeleted={(id) => dispatch({ type: "deleteProject", id })}
            onSubitemUpdated={(subitem) => dispatch({ type: "upsertSubitem", subitem })}
            onSubitemDeleted={(id) => dispatch({ type: "deleteSubitem", id })}
          />
          <Group
            name="Future"
            projects={future}
            allSubitems={state.subitems}
            users={state.users}
            files={state.files}
            onProjectUpdated={(project) => dispatch({ type: "upsertProject", project })}
            onProjectDeleted={(id) => dispatch({ type: "deleteProject", id })}
            onSubitemUpdated={(subitem) => dispatch({ type: "upsertSubitem", subitem })}
            onSubitemDeleted={(id) => dispatch({ type: "deleteSubitem", id })}
          />
          {!filters.hideCompleted && (
            <Group
              name="Completed"
              projects={completed}
              allSubitems={state.subitems}
              users={state.users}
              files={state.files}
              onProjectUpdated={(project) => dispatch({ type: "upsertProject", project })}
              onProjectDeleted={(id) => dispatch({ type: "deleteProject", id })}
              onSubitemUpdated={(subitem) => dispatch({ type: "upsertSubitem", subitem })}
              onSubitemDeleted={(id) => dispatch({ type: "deleteSubitem", id })}
            />
          )}
        </div>
      </div>
    </div>
  );
}
