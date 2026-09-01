"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
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
import { OFFICES } from "@/lib/domain/offices";
import { NotificationButton } from "./NotificationButton";
import { SubitemsStatusCell } from "./SubitemsStatusCell";
import { SubitemRow, SubitemHeader } from "./SubitemRow";
import { api } from "@/lib/client/boardApi";
import { rosterDirectorPickerUsers, rosterPmPickerUsers } from "@/lib/domain/roleAssigneeRoster";
import { accountingAssigneeIds } from "@/lib/notifications/accountingOnly";

function rosterPickerUsers(rosterMatched: User[], allUsers: User[], currentId: string | null): User[] {
  const map = new Map<string, User>();
  for (const u of rosterMatched) map.set(u.id, u);
  if (currentId) {
    const cur = allUsers.find((u) => u.id === currentId);
    if (cur) map.set(cur.id, cur);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function DasStatusCell({
  status,
  required,
  category
}: {
  status: string | null | undefined;
  required: boolean | undefined;
  category: string | null | undefined;
}) {
  if (!status && !required) {
    return <span className="text-[11px] text-slate-400">—</span>;
  }
  const completed = status === "completed";
  const label =
    status === "completed"
      ? "Done"
      : status === "not_completed"
        ? "Open"
        : status?.trim() || (required ? "Required" : "—");
  const title = [
    "Synced from GMS",
    required ? "DAS required" : "DAS not required",
    status ? `Status: ${status}` : null,
    category ? `PW category: ${category}` : null
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <span
      title={title}
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${
        completed
          ? "bg-emerald-50 text-emerald-700"
          : required
            ? "bg-amber-50 text-amber-800"
            : "bg-slate-100 text-slate-600"
      }`}
    >
      {label}
    </span>
  );
}

// Project group is itself a sub-grid: code | name | notify
export const PROJECT_COLS =
  "360px 80px 80px 90px 130px 130px 180px 110px 130px 130px 140px 140px minmax(140px,1fr) 110px 70px 100px 90px 70px minmax(140px,1fr) 80px";

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
      <div className="header-cell">PM</div>
      <div className="header-cell">Director</div>
      <div className="header-cell">Status</div>
      <div className="header-cell">Office</div>
      <div className="header-cell">Subitems Status</div>
      <div className="header-cell">Start Date</div>
      <div className="header-cell">Timeline</div>
      <div className="header-cell">Project Folder</div>
      <div className="header-cell">Last updated</div>
      <div className="header-cell">Notes</div>
      <div className="header-cell" title="DIR number from GMS (not editable)">
        DIR #
      </div>
      <div className="header-cell" title="Union from GMS (not editable)">
        Union
      </div>
      <div className="header-cell" title="Certified payroll cycle">
        Payroll
      </div>
      <div className="header-cell" title="Prevailing wage from GMS (not editable)">
        PW
      </div>
      <div className="header-cell" title="DAS status from GMS (not editable)">
        DAS
      </div>
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
  files,
  meId,
  canEditProject,
  onProjectUpdated,
  onProjectDeleted,
  onSubitemUpdated,
  onSubitemDeleted,
  onFileDeleted
}: {
  project: Project;
  subitems: Subitem[];
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
  const [open, setOpen] = useState(project.group !== "Completed");
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

  const pmPickerUsers = useMemo(
    () => rosterPickerUsers(rosterPmPickerUsers(users), users, project.projectManagerId),
    [users, project.projectManagerId]
  );
  const directorPickerUsers = useMemo(
    () =>
      rosterPickerUsers(rosterDirectorPickerUsers(users), users, project.projectDirectorId),
    [users, project.projectDirectorId]
  );

  async function patch(p: Partial<Project>) {
    try {
      const { project: next } = await api.patchProject(project.id, p);
      onProjectUpdated?.(next);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Could not save project");
    }
  }

  async function handleDeleteProject(ev: MouseEvent<HTMLButtonElement>) {
    ev.stopPropagation();
    ev.preventDefault();
    if (!confirm(`Delete project ${project.code} ${project.name}?`)) return;
    try {
      await api.deleteProject(project.id);
      onProjectDeleted?.(project.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not delete project");
    }
  }
  const gmsImportLocked = Boolean(project.gmsProposalId);
  const canEditCore = canEditProject && !gmsImportLocked;
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
    void api.reorderSubitems(project.id, next).catch((err) => {
      window.alert(err instanceof Error ? err.message : "Could not reorder subitems");
    });
  }

  async function addSubitem() {
    try {
      const { subitem } = await api.createSubitem(project.id, { name: "New subitem" });
      onSubitemUpdated?.(subitem);
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLInputElement>(
          `[data-subitem-name="${subitem.id}"]`
        );
        if (el) {
          el.focus();
          el.select();
        }
      });
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Could not add subitem");
    }
  }

  return (
    <div id={`project-${project.id}`} className="border-b border-slate-200 scroll-mt-24 transition-shadow">
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
                readOnly={!canEditCore}
                onChange={(e) => canEditCore && setCode(e.target.value)}
                onBlur={() => canEditCore && code !== project.code && patch({ code })}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                placeholder="Code"
                title={gmsImportLocked ? "From GMS (not editable)" : undefined}
                className={`bg-transparent text-xs font-mono text-slate-600 w-24 outline-none border-0 rounded px-1 ${
                  canEditCore ? "focus:bg-white focus:ring-1 focus:ring-brand" : "cursor-default"
                }`}
              />
              <input
                value={name}
                readOnly={!canEditCore}
                onChange={(e) => canEditCore && setName(e.target.value)}
                onBlur={() => canEditCore && name !== project.name && patch({ name })}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                placeholder="Project name"
                title={gmsImportLocked ? "From GMS (not editable)" : undefined}
                className={`bg-transparent text-xs font-medium flex-1 outline-none border-0 truncate rounded px-1 ${
                  canEditCore ? "focus:bg-white focus:ring-1 focus:ring-brand" : "cursor-default"
                }`}
              />
              <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 rounded">
                {subitems.length}
              </span>
            </div>
            {canEditProject && (
              <NotificationButton
                projectId={project.id}
                recipientIds={accountingAssigneeIds(
                  project,
                  subitems.map((s) => s.ownerId)
                )}
              />
            )}
          </div>
        </div>
        <div className="cell !p-0">
          <OwnerCell
            ownerId={project.ownerId}
            users={users}
            readOnly={!canEditProject}
            onChange={(id) => patch({ ownerId: id })}
          />
        </div>
        <div
          className="cell !p-0"
          title={gmsImportLocked ? "Project manager from GMS (not editable)" : undefined}
        >
          <OwnerCell
            ownerId={project.projectManagerId ?? null}
            users={pmPickerUsers}
            readOnly={!canEditCore}
            onChange={(id) => patch({ projectManagerId: id })}
          />
        </div>
        <div
          className="cell !p-0"
          title={gmsImportLocked ? "Project director from GMS (not editable)" : undefined}
        >
          <OwnerCell
            ownerId={project.projectDirectorId ?? null}
            users={directorPickerUsers}
            readOnly={!canEditCore}
            onChange={(id) => patch({ projectDirectorId: id })}
          />
        </div>
        <div className="cell !p-0">
          <ProjectStatusCell
            value={project.status}
            readOnly={!canEditProject}
            onChange={(status: ProjectStatus) => patch({ status })}
          />
        </div>
        <div className="cell">
          {project.office ? (
            <span
              className="text-[12px] text-slate-700 px-1 py-0.5 block truncate"
              title="Office is set when the project is created and cannot be changed."
            >
              {project.office}
            </span>
          ) : canEditProject ? (
            <select
              value=""
              onChange={(e) => patch({ office: e.target.value || null })}
              className="bg-transparent text-[12px] outline-none w-full cursor-pointer hover:bg-slate-50 rounded px-1 py-0.5"
            >
              <option value="">Select office…</option>
              {OFFICES.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-[12px] text-slate-400 px-1">—</span>
          )}
        </div>
        <div className="cell !p-0">
          <SubitemsStatusCell subitems={sortedSubs} />
        </div>
        <div
          className="cell"
          title={gmsImportLocked ? "Start date from GMS (not editable)" : undefined}
        >
          <DateCell
            value={project.startDate}
            readOnly={!canEditCore}
            onChange={(d) => patch({ startDate: d })}
          />
        </div>
        <div className="cell !p-0 relative">
          <TimelineCell
            start={project.timelineStart}
            end={project.timelineEnd}
            readOnly={!canEditProject}
            onChange={(s, e) => patch({ timelineStart: s, timelineEnd: e })}
          />
        </div>
        <div className="cell !p-0">
          {canEditProject ? (
            <SharePointCell
              url={project.sharepointUrl}
              onChange={(next) => patch({ sharepointUrl: next })}
            />
          ) : (
            <span className="text-[12px] text-slate-500 px-2 truncate block" title={project.sharepointUrl ?? undefined}>
              {project.sharepointUrl || "—"}
            </span>
          )}
        </div>
        <div className="cell">
          <LastUpdatedCell at={project.lastUpdatedAt} by={project.lastUpdatedBy} users={users} />
        </div>
        <div
          className="cell"
          title={gmsImportLocked ? "Notes from GMS (not editable)" : undefined}
        >
          <TextCell
            value={project.notes}
            readOnly={!canEditCore}
            onChange={(v) => patch({ notes: v })}
            placeholder="Notes"
          />
        </div>
        <div
          className="cell"
          title={
            project.dirContractNumber
              ? `DIR # from GMS (not editable). Contract #: ${project.dirContractNumber}`
              : "DIR # from GMS (not editable)"
          }
        >
          <TextCell
            value={project.dirNumber}
            readOnly
            onChange={() => {}}
            placeholder="—"
          />
        </div>
        <div
          className="cell !p-0"
          title={
            project.prevailingWageType
              ? `Union from GMS (not editable). PW type: ${project.prevailingWageType}`
              : "Union from GMS (not editable)"
          }
        >
          <CheckboxCell value={project.union} readOnly />
        </div>
        <div className="cell">
          {canEditProject ? (
            <select
              value={project.payrollCycle === "weekly" ? "weekly" : "biweekly"}
              onChange={(e) =>
                patch({ payrollCycle: e.target.value === "weekly" ? "weekly" : "biweekly" })
              }
              className="bg-transparent text-[12px] outline-none w-full cursor-pointer hover:bg-slate-50 rounded px-1 py-0.5"
              title="Payroll cycle"
            >
              <option value="biweekly">Bi-weekly</option>
              <option value="weekly">Weekly</option>
            </select>
          ) : (
            <span className="text-[12px] text-slate-700 px-1">
              {project.payrollCycle === "weekly" ? "Weekly" : "Bi-weekly"}
            </span>
          )}
        </div>
        <div className="cell !p-0" title="Prevailing wage from GMS (not editable)">
          <CheckboxCell value={project.prevailingWage ?? false} readOnly />
        </div>
        <div className="cell" title="DAS status from GMS (not editable)">
          <DasStatusCell
            status={project.dasStatus}
            required={project.dasRequired}
            category={project.pwCategory}
          />
        </div>
        <div className="cell">
          <TextCell
            value={project.reportingSystems}
            readOnly={!canEditProject}
            onChange={(v) => patch({ reportingSystems: v })}
            placeholder="—"
          />
        </div>
        <div className="cell">
          <TextCell
            value={project.cprContact}
            readOnly={!canEditProject}
            onChange={(v) => patch({ cprContact: v })}
            placeholder="CPR contact"
          />
        </div>
        <div className="cell !justify-center">
          {canEditProject && (
            <button
              type="button"
              onClick={handleDeleteProject}
              className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 focus:opacity-100 focus-visible:ring-2 focus-visible:ring-brand opacity-70 group-hover:opacity-100"
              title="Delete project"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="bg-slate-50/40 pl-12 pr-4 py-2">
          <div className="bg-white border border-slate-200 rounded">
            <SubitemHeader />
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={canEditProject ? onDragEnd : () => undefined}
            >
              <SortableContext items={liveIds} strategy={verticalListSortingStrategy}>
                {liveSubs.map((s) => (
                  <SubitemRow
                    key={s.id}
                    subitem={s}
                    users={users}
                    projectId={project.id}
                    projectManagerId={project.projectManagerId}
                    projectDirectorId={project.projectDirectorId}
                    files={filesBySubitemId.get(s.id) ?? []}
                    meId={meId}
                    canEditMeta={canEditProject}
                    onSubitemUpdated={onSubitemUpdated}
                    onSubitemDeleted={onSubitemDeleted}
                    onFileDeleted={onFileDeleted}
                  />
                ))}
              </SortableContext>
            </DndContext>
            {canEditProject && (
              <button
                onClick={addSubitem}
                className="text-xs text-slate-500 hover:text-brand p-2 flex items-center gap-1"
              >
                <Plus size={12} /> Add subitem
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
