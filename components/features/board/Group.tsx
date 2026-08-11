"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import type { FileRef, Project, ProjectGroup, Subitem, User } from "@/lib/types";
import { ProjectHeader, ProjectRow } from "./ProjectRow";
import { AddProjectDialog } from "./AddProjectDialog";

const groupStyle: Record<ProjectGroup, { dot: string; text: string }> = {
  Current: { dot: "bg-brand", text: "text-brand-dark" },
  Future: { dot: "bg-slate-400", text: "text-slate-700" },
  Completed: { dot: "bg-status-completed", text: "text-emerald-700" }
};

export function Group({
  name,
  projects,
  allSubitems,
  users,
  files,
  meId,
  canEditProject,
  onProjectUpdated,
  onProjectDeleted,
  onSubitemUpdated,
  onSubitemDeleted,
  onFileDeleted
}: {
  name: ProjectGroup;
  projects: Project[];
  allSubitems: Subitem[];
  users: User[];
  files: FileRef[];
  meId: string;
  canEditProject: boolean;
  onProjectUpdated?: (project: Project) => void;
  onProjectDeleted?: (id: string) => void;
  onSubitemUpdated?: (subitem: Subitem) => void;
  onSubitemDeleted?: (id: string) => void;
  onFileDeleted?: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);

  const subsByProjectId = useMemo(() => {
    const map = new Map<string, Subitem[]>();
    for (const s of allSubitems) {
      const arr = map.get(s.projectId);
      if (arr) arr.push(s);
      else map.set(s.projectId, [s]);
    }
    return map;
  }, [allSubitems]);

  const style = groupStyle[name];

  return (
    <div className="mb-6 animate-fade-in-up">
      <div className="flex items-center gap-3 mb-2 px-1">
        <button
          onClick={() => setOpen((o) => !o)}
          className={`flex items-center gap-2 text-sm font-semibold transition-transform ${style.text}`}
        >
          <span className={`transition-transform duration-150 ${open ? "rotate-0" : "-rotate-90"}`}>
            <ChevronDown size={16} />
          </span>
          <span className={`w-2 h-2 rounded-full ${style.dot}`} />
          {name}
        </button>
        <span className="text-[11px] text-slate-400 font-medium">
          {projects.length} project{projects.length === 1 ? "" : "s"}
        </span>
        <div className="flex-1" />
        {canEditProject && (
          <button
            onClick={() => setAdding(true)}
            className="text-[11px] text-slate-500 hover:text-brand-dark flex items-center gap-1 px-2 py-1 rounded hover:bg-white transition-colors"
          >
            <Plus size={12} /> Add project
          </button>
        )}
      </div>
      {open && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto scrollbar-thin">
          <ProjectHeader collapsed={false} />
          {projects.length === 0 ? (
            canEditProject ? (
              <button
                onClick={() => setAdding(true)}
                className="w-full px-6 py-8 text-xs text-slate-400 hover:text-brand-dark hover:bg-slate-50 flex items-center justify-center gap-2 border-dashed transition-colors"
              >
                <Plus size={14} /> No projects in {name} yet — click to add one
              </button>
            ) : (
              <div className="w-full px-6 py-8 text-xs text-slate-400 text-center">
                No projects in {name}
              </div>
            )
          ) : (
            projects.map((p) => (
              <ProjectRow
                key={p.id}
                project={p}
                subitems={subsByProjectId.get(p.id) ?? []}
                users={users}
                files={files}
                meId={meId}
                canEditProject={canEditProject}
                onProjectUpdated={onProjectUpdated}
                onProjectDeleted={onProjectDeleted}
                onSubitemUpdated={onSubitemUpdated}
                onSubitemDeleted={onSubitemDeleted}
                onFileDeleted={onFileDeleted}
              />
            ))
          )}
        </div>
      )}
      {canEditProject && (
        <AddProjectDialog group={name} open={adding} onClose={() => setAdding(false)} users={users} />
      )}
    </div>
  );
}
