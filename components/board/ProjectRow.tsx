"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import type { FileRef, Project, ProjectStatus, Subitem, User } from "@/lib/types";
import { ProjectStatusCell } from "./StatusCell";
import { OwnerCell } from "./OwnerCell";
import { DateCell, TimelineCell } from "./DateCell";
import { CheckboxCell, TextCell } from "./TextCell";
import { LastUpdatedCell } from "./LastUpdatedCell";
import { SharePointCell } from "./SharePointCell";
import { OFFICES } from "@/lib/offices";
import { NotificationButton } from "./NotificationButton";
import { SubitemsStatusCell } from "./SubitemsStatusCell";
import { SubitemRow, SubitemHeader } from "./SubitemRow";
import { api } from "@/lib/client/boardApi";

// Project group is itself a sub-grid: code | name | notify
export const PROJECT_COLS =
  "360px 80px 130px 130px 180px 110px 130px 130px 140px 140px minmax(140px,1fr) 110px 70px minmax(140px,1fr) 80px";

export function ProjectHeader({ collapsed }: { collapsed: boolean }) {
  if (collapsed) return null;
  return (
    <div
      className="grid border-b border-slate-200 bg-slate-50 sticky top-0 z-20"
      style={{ gridTemplateColumns: PROJECT_COLS }}
    >
      <div className="header-cell">
        <span className="grid grid-cols-[40px_1fr_28px] gap-1 w-full items-center">
          <span className="text-[11px]">Code</span>
          <span className="text-[11px]">Project</span>
          <span />
        </span>
      </div>
      <div className="header-cell">Owner</div>
      <div className="header-cell">Status</div>
      <div className="header-cell">Office</div>
      <div className="header-cell">Subitems Status</div>
      <div className="header-cell">Start Date</div>
      <div className="header-cell">Timeline</div>
      <div className="header-cell">SharePoint</div>
      <div className="header-cell">Last updated</div>
      <div className="header-cell">Notes</div>
      <div className="header-cell">DIR #</div>
      <div className="header-cell">Union</div>
      <div className="header-cell">Reporting Systems</div>
      <div className="header-cell">CPR Contact</div>
      <div className="header-cell" />
    </div>
  );
}

export function ProjectRow({
  project,
  subitems,
  users,
  files
}: {
  project: Project;
  subitems: Subitem[];
  users: User[];
  files: FileRef[];
}) {
  const [open, setOpen] = useState(true);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [code, setCode] = useState(project.code);
  const [name, setName] = useState(project.name);
  useEffect(() => setCode(project.code), [project.code]);
  useEffect(() => setName(project.name), [project.name]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const filesBySubitemId = useMemo(() => {
    const map = new Map<string, FileRef[]>();
    for (const file of files) {
      if (file.parentType !== "subitem") continue;
      const existing = map.get(file.parentId);
      if (existing) existing.push(file);
      else map.set(file.parentId, [file]);
    }
    return map;
  }, [files]);

  function patch(p: Partial<Project>) {
    api.patchProject(project.id, p);
  }

  // The store already sorts NA to bottom and respects position.
  const sortedSubs = subitems;
  const ids = sortedSubs.map((s) => s.id);
  const liveIds = orderedIds.length === ids.length ? orderedIds : ids;
  const liveSubs = liveIds
    .map((id) => sortedSubs.find((s) => s.id === id))
    .filter((s): s is Subitem => Boolean(s));

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = liveIds.indexOf(active.id as string);
    const newIdx = liveIds.indexOf(over.id as string);
    const next = arrayMove(liveIds, oldIdx, newIdx);
    setOrderedIds(next);
    api.reorderSubitems(project.id, next);
  }

  async function addSubitem() {
    const { subitem } = await api.createSubitem(project.id, { name: "New subitem" });
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLInputElement>(
        `[data-subitem-name="${subitem.id}"]`
      );
      if (el) {
        el.focus();
        el.select();
      }
    });
  }

  return (
    <div className="border-b border-slate-200">
      <div className="grid hover:bg-slate-50/70 group transition-colors" style={{ gridTemplateColumns: PROJECT_COLS }}>
        <div className="cell !p-0">
          <div className="grid grid-cols-[40px_1fr_28px] w-full items-center px-2">
            <button
              onClick={() => setOpen((o) => !o)}
              className="text-slate-400 hover:text-brand"
              title={open ? "Collapse" : "Expand"}
            >
              {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onBlur={() => code !== project.code && patch({ code })}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                placeholder="Code"
                className="bg-transparent text-xs font-mono text-slate-600 w-24 outline-none border-0 focus:bg-white focus:ring-1 focus:ring-brand rounded px-1"
              />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => name !== project.name && patch({ name })}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                placeholder="Project name"
                className="bg-transparent text-xs font-medium flex-1 outline-none border-0 truncate focus:bg-white focus:ring-1 focus:ring-brand rounded px-1"
              />
              <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 rounded">
                {subitems.length}
              </span>
            </div>
            <NotificationButton projectId={project.id} users={users} ownerId={project.ownerId} />
          </div>
        </div>
        <div className="cell !p-0">
          <OwnerCell
            ownerId={project.ownerId}
            users={users}
            onChange={(id) => patch({ ownerId: id })}
          />
        </div>
        <div className="cell !p-0">
          <ProjectStatusCell
            value={project.status}
            onChange={(status: ProjectStatus) => patch({ status })}
          />
        </div>
        <div className="cell">
          <select
            value={project.office ?? ""}
            onChange={(e) => patch({ office: e.target.value || null })}
            className="bg-transparent text-[12px] outline-none w-full cursor-pointer hover:bg-slate-50 rounded px-1 py-0.5"
          >
            <option value="">—</option>
            {OFFICES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div className="cell !p-0">
          <SubitemsStatusCell subitems={sortedSubs} />
        </div>
        <div className="cell">
          <DateCell value={project.startDate} onChange={(d) => patch({ startDate: d })} />
        </div>
        <div className="cell !p-0 relative">
          <TimelineCell
            start={project.timelineStart}
            end={project.timelineEnd}
            onChange={(s, e) => patch({ timelineStart: s, timelineEnd: e })}
          />
        </div>
        <div className="cell !p-0">
          <SharePointCell
            url={project.sharepointUrl}
            onChange={(next) => patch({ sharepointUrl: next })}
          />
        </div>
        <div className="cell">
          <LastUpdatedCell at={project.lastUpdatedAt} by={project.lastUpdatedBy} users={users} />
        </div>
        <div className="cell">
          <TextCell
            value={project.notes}
            onChange={(v) => patch({ notes: v })}
            placeholder="Notes"
          />
        </div>
        <div className="cell">
          <TextCell
            value={project.dirNumber}
            onChange={(v) => patch({ dirNumber: v })}
            placeholder="—"
            type="number"
          />
        </div>
        <div className="cell !p-0">
          <CheckboxCell value={project.union} onChange={(b) => patch({ union: b })} />
        </div>
        <div className="cell">
          <TextCell
            value={project.reportingSystems}
            onChange={(v) => patch({ reportingSystems: v })}
            placeholder="—"
          />
        </div>
        <div className="cell">
          <TextCell
            value={project.cprContact}
            onChange={(v) => patch({ cprContact: v })}
            placeholder="CPR contact"
          />
        </div>
        <div className="cell !justify-center">
          <button
            onClick={() => {
              if (confirm(`Delete project ${project.code} ${project.name}?`)) {
                api.deleteProject(project.id);
              }
            }}
            className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {open && (
        <div className="bg-slate-50/40 pl-12 pr-4 py-2">
          <div className="bg-white border border-slate-200 rounded">
            <SubitemHeader />
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={liveIds} strategy={verticalListSortingStrategy}>
                {liveSubs.map((s) => (
                  <SubitemRow
                    key={s.id}
                    subitem={s}
                    users={users}
                    projectId={project.id}
                    files={filesBySubitemId.get(s.id) ?? []}
                  />
                ))}
              </SortableContext>
            </DndContext>
            <button
              onClick={addSubitem}
              className="text-xs text-slate-500 hover:text-brand p-2 flex items-center gap-1"
            >
              <Plus size={12} /> Add subitem
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
