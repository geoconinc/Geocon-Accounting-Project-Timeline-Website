"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MessageCirclePlus, X, Paperclip, Trash2 } from "lucide-react";
import { api } from "@/lib/client/boardApi";

export function NotificationButton({
  projectId,
  recipientIds
}: {
  projectId: string;
  /** Accounting checklist assignees only — never PMs/directors. */
  recipientIds: string[];
}) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open]);

  async function send() {
    if (!msg.trim()) return;
    if (recipientIds.length === 0) {
      setDone("No accounting assignees");
      setTimeout(() => setDone(null), 1500);
      return;
    }
    setBusy(true);
    try {
      for (const f of attachments) {
        await api.uploadFile("project", projectId, f);
      }

      for (const userId of recipientIds) {
        await fetch("/api/notifications", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ userId, projectId, subject: "Project update", message: msg })
        });
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

  const recipientLabel =
    recipientIds.length === 0
      ? "No accounting assignees on this item."
      : recipientIds.length === 1
        ? "The checklist assignee will be emailed."
        : `${recipientIds.length} accounting assignees will be emailed.`;

  return (
    <>
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="text-slate-400 hover:text-brand"
      title="Update via email"
    >
      <MessageCirclePlus size={15} />
    </button>
    {open &&
      mounted &&
      createPortal(
        <div
          className="fixed inset-0 z-[200] bg-slate-900/40 grid place-items-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl border border-slate-200 p-4 w-full max-w-md animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-brand-dark">Update via email</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            </div>
            <textarea
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              rows={4}
              placeholder="Message..."
              autoFocus
              className="w-full text-sm border border-slate-300 rounded p-2 outline-none focus:ring-2 focus:ring-brand"
            />
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {attachments.map((f, i) => (
                  <span
                    key={`${f.name}-${i}`}
                    className="inline-flex items-center gap-1 bg-slate-100 text-[11px] px-2 py-0.5 rounded"
                    title={f.name}
                  >
                    <Paperclip size={10} />
                    <span className="max-w-[140px] truncate">{f.name}</span>
                    <button
                      type="button"
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
                type="button"
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
            <p className="text-[10px] text-slate-500 mt-2">{recipientLabel}</p>
            <div className="flex justify-end mt-4 gap-2">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost text-xs">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void send()}
                disabled={busy || !msg.trim() || recipientIds.length === 0}
                className="btn-primary text-xs disabled:opacity-50"
              >
                {busy ? "Sending..." : done ?? "Send"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
