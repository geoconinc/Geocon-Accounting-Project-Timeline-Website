"use client";

import type { MouseEvent } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import type { FileRef, Subitem, SubitemStatus, User } from "@/lib/types";
import { OwnerCell } from "./OwnerCell";
import { SubitemStatusCell } from "./StatusCell";
import { DateCell } from "./DateCell";
import { TextCell } from "./TextCell";
import { NotificationButton } from "./NotificationButton";
import { FilesCell } from "./FilesCell";
import { api } from "@/lib/client/boardApi";

export const SUBITEM_COLS =
  "32px 32px minmax(280px,1fr) 80px 130px 110px 110px minmax(220px,1fr) minmax(180px,1fr)";

export function SubitemHeader() {
  return (
    <div
      className="grid border-b border-slate-200 bg-slate-50 sticky top-0"
      style={{ gridTemplateColumns: SUBITEM_COLS }}
    >
      <div className="header-cell" />
      <div className="header-cell" />
      <div className="header-cell">Subitem</div>
      <div className="header-cell">Owner</div>
      <div className="header-cell">Status</div>
      <div className="header-cell">Due Date</div>
      <div className="header-cell">Date Completed</div>
      <div className="header-cell">Notes</div>
      <div className="header-cell">Attachments</div>
    </div>
  );
}

export function SubitemRow({
  subitem,
  users,
  projectId,
  files,
  onSubitemUpdated,
  onSubitemDeleted,
  onFileDeleted
}: {
  subitem: Subitem;
  users: User[];
  projectId: string;
  files: FileRef[];
  onSubitemUpdated?: (subitem: Subitem) => void;
  onSubitemDeleted?: (id: string) => void;
  onFileDeleted?: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: subitem.id
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  async function patch(p: Partial<Subitem>) {
    try {
      const { subitem: next } = await api.patchSubitem(subitem.id, p);
      onSubitemUpdated?.(next);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Could not save subitem");
    }
  }

  async function handleDeleteSubitem(ev: MouseEvent<HTMLButtonElement>) {
    ev.stopPropagation();
    if (!confirm("Delete this subitem?")) return;
    try {
      await api.deleteSubitem(subitem.id);
      onSubitemDeleted?.(subitem.id);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Could not delete subitem");
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, gridTemplateColumns: SUBITEM_COLS }}
      className="grid hover:bg-slate-50 group"
    >
      <button
        {...attributes}
        {...listeners}
        className="cell !justify-center text-slate-300 hover:text-slate-600 cursor-grab opacity-0 group-hover:opacity-100"
      >
        <GripVertical size={14} />
      </button>
      <div className="cell !justify-center">
        <NotificationButton projectId={projectId} users={users} ownerId={subitem.ownerId} />
      </div>
      <div className="cell">
        <TextCell
          value={subitem.name}
          onChange={(v) => patch({ name: v ?? "" })}
          dataAttr={{ name: "subitem-name", value: subitem.id }}
        />
        <button
          type="button"
          onClick={handleDeleteSubitem}
          className="ml-2 p-0.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-70 group-hover:opacity-100 focus:opacity-100"
          title="Delete subitem"
        >
          <Trash2 size={13} />
        </button>
      </div>
      <div className="cell !p-0 !px-0">
        <OwnerCell ownerId={subitem.ownerId} users={users} onChange={(id) => patch({ ownerId: id })} />
      </div>
      <div className="cell !p-0">
        <SubitemStatusCell
          value={subitem.status}
          onChange={(status: SubitemStatus) => patch({ status })}
        />
      </div>
      <div className="cell">
        <DateCell value={subitem.dueDate} onChange={(d) => patch({ dueDate: d })} />
      </div>
      <div className="cell">
        <DateCell value={subitem.dateCompleted} onChange={(d) => patch({ dateCompleted: d })} />
      </div>
      <div className="cell">
        <TextCell value={subitem.notes} onChange={(v) => patch({ notes: v })} placeholder="Notes" />
      </div>
      <div className="cell !p-0">
        <FilesCell
          parentType="subitem"
          parentId={subitem.id}
          files={files}
          onFileDeleted={onFileDeleted}
        />
      </div>
    </div>
  );
}
