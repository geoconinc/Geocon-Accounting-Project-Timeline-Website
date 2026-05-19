"use client";

import { useRef, useState } from "react";
import { Plus, FileIcon } from "lucide-react";
import type { FileRef } from "@/lib/types";
import { api } from "@/lib/client/boardApi";
import { encodeSharePointBlobRef } from "@/lib/fileStorage/sharepointBlobRef";

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
        const prep = await api.requestUploadSas(parentType, parentId, file.name, file.size);
        if (prep.provider === "sharepoint") {
          if (file.size < 1) throw new Error("empty file");
          const last = file.size - 1;
          const put = await fetch(prep.uploadUrl, {
            method: "PUT",
            headers: {
              "Content-Length": String(file.size),
              "Content-Range": `bytes 0-${last}/${file.size}`
            },
            body: file
          });
          if (!put.ok) throw new Error(`upload failed (${put.status})`);
          const item = (await put.json()) as { id?: string };
          if (!item.id) throw new Error("upload response missing id");
          const blobPath = encodeSharePointBlobRef(prep.driveId, item.id);
          await api.recordFile({ parentType, parentId, blobPath, filename: file.name, size: file.size });
          continue;
        }
        const put = await fetch(prep.uploadUrl, {
          method: "PUT",
          headers: { "x-ms-blob-type": "BlockBlob", "content-type": file.type || "application/octet-stream" },
          body: file
        });
        if (!put.ok) throw new Error(`upload failed (${put.status})`);
        await api.recordFile({ parentType, parentId, blobPath: prep.blobPath, filename: file.name, size: file.size });
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function openFile(id: string) {
    try {
      const { url } = await api.fileUrl(id);
      window.open(url, "_blank", "noopener");
    } catch {
      setErr("Could not open file");
    }
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
