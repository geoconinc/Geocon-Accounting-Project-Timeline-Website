"use client";

import { useRef, useState, type MouseEvent } from "react";
import { Plus, FileIcon, X } from "lucide-react";
import type { FileRef } from "@/lib/types";
import { api } from "@/lib/client/boardApi";
import { fileTooLargeMessage, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from "@/lib/config/fileUpload";

export function FilesCell({
  parentType,
  parentId,
  files,
  onFileDeleted
}: {
  parentType: "project" | "subitem";
  parentId: string;
  files: FileRef[];
  onFileDeleted?: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function upload(fileList: FileList | null) {
    if (!fileList) return;
    setErr(null);
    setBusy(true);
    try {
      for (const file of Array.from(fileList)) {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          throw new Error(fileTooLargeMessage(file.name));
        }
        await api.uploadFile(parentType, parentId, file);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function openFile(id: string) {
    window.open(api.fileDownloadUrl(id), "_blank", "noopener");
  }

  async function handleDelete(ev: MouseEvent<HTMLButtonElement>, file: FileRef) {
    ev.stopPropagation();
    ev.preventDefault();
    if (!confirm(`Delete attachment "${file.filename}"?`)) return;
    setErr(null);
    setBusy(true);
    try {
      await api.deleteFile(file.id);
      onFileDeleted?.(file.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not delete file");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full h-full flex items-center gap-1 px-1 overflow-hidden">
      <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
      <div className="flex gap-1 overflow-x-auto scrollbar-thin flex-1 min-w-0">
        {files.map((f) => (
          <div
            key={f.id}
            className="flex items-center gap-0.5 text-[11px] text-slate-600 bg-slate-50 hover:bg-slate-100 rounded px-1.5 py-0.5 max-w-[140px] shrink-0 group/file"
          >
            <button
              type="button"
              onClick={() => openFile(f.id)}
              className="flex items-center gap-1 min-w-0 hover:text-brand"
              title={f.filename}
            >
              <FileIcon size={11} className="shrink-0" />
              <span className="truncate">{f.filename}</span>
            </button>
            <button
              type="button"
              onClick={(ev) => void handleDelete(ev, f)}
              disabled={busy}
              className="shrink-0 p-0.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-70 group-hover/file:opacity-100 disabled:opacity-40"
              title={`Delete ${f.filename}`}
            >
              <X size={11} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex items-center gap-0.5 text-[11px] text-slate-500 hover:text-brand border border-dashed border-slate-300 hover:border-brand rounded px-1.5 py-0.5 shrink-0"
          title={busy ? "Working..." : `Add files (max ${MAX_FILE_SIZE_MB} MB each)`}
        >
          <Plus size={11} /> {busy ? "..." : files.length === 0 ? "Add" : "Add more"}
        </button>
      </div>
      {err && (
        <span className="text-[10px] text-red-600 ml-1 shrink-0 max-w-[220px]" title={err}>
          {err}
        </span>
      )}
    </div>
  );
}
