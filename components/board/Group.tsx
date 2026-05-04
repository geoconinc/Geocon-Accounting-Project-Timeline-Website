"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import type { FileRef, Project, ProjectGroup, Subitem, User } from "@/lib/types";
import { ProjectHeader, ProjectRow } from "./ProjectRow";
import { AddProjectDialog } from "./AddProjectDialog";

const groupColor: Record<ProjectGroup, string> = {
  Current: "text-brand",
  Future: "text-slate-500",
  Completed: "text-status-completed"
};

export function Group({
  name,
  projects,
  allSubitems,
  users,
  files
}: {
  name: ProjectGroup;
  projects: Project[];
  allSubitems: Subitem[];
  users: User[];
  files: FileRef[];
}) {
  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-1 px-2">
        <button
          onClick={() => setOpen((o) => !o)}
          className={`flex items-center gap-1 text-sm font-semibold ${groupColor[name]}`}
        >
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          {name}
        </button>
        <span className="text-xs text-slate-400">
          {projects.length} project{projects.length === 1 ? "" : "s"}
        </span>
      </div>
      {open && (
        <div className="bg-white rounded-md border border-slate-200 overflow-x-auto scrollbar-thin">
          <ProjectHeader collapsed={false} />
          {projects.map((p) => (
            <ProjectRow
              key={p.id}
              project={p}
              subitems={allSubitems.filter((s) => s.projectId === p.id)}
              users={users}
              files={files}
            />
          ))}
          {projects.length === 0 && (
            <div className="text-xs text-slate-400 px-4 py-3">No projects in {name}.</div>
          )}
          <button
            onClick={() => setAdding(true)}
            className="text-xs text-slate-500 hover:text-brand px-4 py-2 flex items-center gap-1 border-t border-slate-200 w-full"
          >
            <Plus size={12} /> Add project
          </button>
        </div>
      )}
      <AddProjectDialog group={name} open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}
