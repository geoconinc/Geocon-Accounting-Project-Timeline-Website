"use client";

import { useRef, useState } from "react";
import { Paperclip, FileIcon } from "lucide-react";
import type { FileRef } from "@/lib/types";
import { api, uploadFileDemo } from "@/lib/client/boardApi";
import { DEMO_MODE } from "@/lib/demo/config";

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
        if (DEMO_MODE) {
          await uploadFileDemo(parentType, parentId, file);
          continue;
        }
        const sas = await api.requestUploadSas(parentType, parentId, file.name);
        const put = await fetch(sas.uploadUrl, {
          method: "PUT",
          headers: {
            "x-ms-blob-type": "BlockBlob",
            "content-type": file.type || "application/octet-stream"
          },
          body: file
        });
        if (!put.ok) throw new Error(`upload failed (${put.status})`);
        await api.recordFile({
          parentType,
          parentId,
          blobPath: sas.blobPath,
          filename: file.name,
          size: file.size
        });
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "upload failed");
    } finally {
      setBusy(false);
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
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="text-slate-400 hover:text-brand"
        title={busy ? "Uploading..." : "Upload file"}
      >
        <Paperclip size={14} />
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => upload(e.target.files)}
      />
      <div className="flex gap-1 overflow-x-auto scrollbar-thin">
        {files.map((f) => (
          <button
            key={f.id}
            onClick={() => openFile(f.id)}
            className="flex items-center gap-1 text-[11px] text-slate-600 hover:text-brand bg-slate-50 hover:bg-slate-100 rounded px-1.5 py-0.5 max-w-[120px]"
            title={f.filename}
          >
            <FileIcon size={11} />
            <span className="truncate">{f.filename}</span>
          </button>
        ))}
      </div>
      {err && <span className="text-[10px] text-red-500 ml-1 truncate">{err}</span>}
    </div>
  );
}
