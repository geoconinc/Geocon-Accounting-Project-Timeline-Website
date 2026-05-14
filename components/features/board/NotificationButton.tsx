"use client";

import { useRef, useState } from "react";
import { MessageCirclePlus, X, Paperclip, Trash2 } from "lucide-react";
import { usePopover } from "./Popover";
import { api, uploadFileDemo } from "@/lib/client/boardApi";
import type { User } from "@/lib/types";
import { DEMO_MODE } from "@/lib/demo/config";

export function NotificationButton({
  projectId,
  users,
  ownerId
}: {
  projectId: string;
  users: User[];
  ownerId: string | null;
}) {
  const { open, setOpen, ref } = usePopover();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function send() {
    if (!msg.trim()) return;
    setBusy(true);
    try {
      // Upload any attachments first (demo: stored locally; non-demo: SAS+blob).
      for (const f of attachments) {
        if (DEMO_MODE) {
          await uploadFileDemo("project", projectId, f);
        } else {
          const sas = await api.requestUploadSas("project", projectId, f.name);
          await fetch(sas.uploadUrl, {
            method: "PUT",
            headers: {
              "x-ms-blob-type": "BlockBlob",
              "content-type": f.type || "application/octet-stream"
            },
            body: f
          });
          await api.recordFile({
            parentType: "project",
            parentId: projectId,
            blobPath: sas.blobPath,
            filename: f.name,
            size: f.size
          });
        }
      }

      if (DEMO_MODE) {
        const target = ownerId
          ? users.find((u) => u.id === ownerId)?.name ?? "assignee"
          : "all assignees";
        const attachLabel =
          attachments.length > 0 ? ` with ${attachments.length} attachment(s)` : "";
        window.dispatchEvent(
          new CustomEvent("geocon-toast", {
            detail: { message: `Update sent to ${target}${attachLabel} (demo).` }
          })
        );
      } else {
        const targets = ownerId ? [ownerId] : users.map((u) => u.id);
        for (const userId of targets) {
          await fetch("/api/notifications", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              userId,
              projectId,
              subject: "Project update",
              message: msg
            })
          });
        }
      }
      setDone("Sent");
      setMsg("");
      setAttachments([]);
      setTimeout(() => {
        setDone(null);
        setOpen(false);
      }, 1200);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-slate-400 hover:text-brand"
        title="Update via email"
      >
        <MessageCirclePlus size={15} />
      </button>
      {open && (
        <div
          className="absolute z-30 left-0 top-full mt-1 bg-white border border-slate-200 rounded shadow-lg p-3 w-80"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold">Update via email</span>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700">
              <X size={14} />
            </button>
          </div>
          <textarea
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            rows={3}
            placeholder="Message..."
            autoFocus
            className="w-full text-xs border rounded p-2 outline-none focus:ring-1 focus:ring-brand"
          />
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {attachments.map((f, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 bg-slate-100 text-[11px] px-2 py-0.5 rounded"
                  title={f.name}
                >
                  <Paperclip size={10} />
                  <span className="max-w-[120px] truncate">{f.name}</span>
                  <button
                    onClick={() => setAttachments((a) => a.filter((_, j) => j !== i))}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <Trash2 size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-slate-600 hover:text-brand inline-flex items-center gap-1"
            >
              <Paperclip size={12} /> Attach files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) setAttachments((a) => [...a, ...Array.from(e.target.files!)]);
                e.target.value = "";
              }}
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            Assignees will be notified by default.
          </p>
          <div className="flex justify-end mt-3 gap-2">
            <button onClick={() => setOpen(false)} className="btn-ghost text-xs">
              Cancel
            </button>
            <button
              onClick={send}
              disabled={busy || !msg.trim()}
              className="btn-primary text-xs disabled:opacity-50"
            >
              {busy ? "Sending..." : done ?? "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
