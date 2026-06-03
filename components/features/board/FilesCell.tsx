"use client";

import { useRef, useState } from "react";
import { Plus, FileIcon } from "lucide-react";
import type { FileRef } from "@/lib/types";
import { api } from "@/lib/client/boardApi";

export function FilesCell({
  parentType,
  parentId,
  files
}: {
  parentType: "project" | "subitem";
  parentId: string;
  files: FileRef[];
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
        await api.uploadFile(parentType, parentId, file);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function openFile(id: string) {
    window.open(api.fileDownloadUrl(id), "_blank", "noopener");
  }

  return (
    <div className="w-full h-full flex items-center gap-1 px-1 overflow-hidden">
      <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
      <div className="flex gap-1 overflow-x-auto scrollbar-thin flex-1 min-w-0">
        {files.map((f) => (
          <button
            key={f.id}
            onClick={() => openFile(f.id)}
            className="flex items-center gap-1 text-[11px] text-slate-600 hover:text-brand bg-slate-50 hover:bg-slate-100 rounded px-1.5 py-0.5 max-w-[120px] shrink-0"
            title={f.filename}
          >
            <FileIcon size={11} />
            <span className="truncate">{f.filename}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex items-center gap-0.5 text-[11px] text-slate-500 hover:text-brand border border-dashed border-slate-300 hover:border-brand rounded px-1.5 py-0.5 shrink-0"
          title={busy ? "Uploading..." : "Add files"}
        >
          <Plus size={11} /> {busy ? "..." : files.length === 0 ? "Add" : "Add more"}
        </button>
      </div>
      {err && <span className="text-[10px] text-red-500 ml-1 truncate">{err}</span>}
    </div>
  );
}
