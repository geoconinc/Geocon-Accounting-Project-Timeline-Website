"use client";

import { useState } from "react";
import { FolderOpen, Edit3, Copy } from "lucide-react";
import { getProjectFoldersRoot } from "@/lib/config/localTemplates";
import { openLocalFolderPath } from "@/lib/client/openLocalFolder";

export function SharePointCell({
  url,
  onChange
}: {
  url: string | null;
  onChange: (next: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(url ?? "");
  const [copied, setCopied] = useState(false);
  const [openHint, setOpenHint] = useState(false);
  const projectRoot = getProjectFoldersRoot();
  const placeholder = projectRoot
    ? `${projectRoot.replace(/[/\\]+$/, "")}\\ProjectName`
    : "S:\\WPJOB\\G3000\\ProjectName";

  function commit() {
    const trimmed = draft.trim();
    onChange(trimmed.length === 0 ? null : trimmed);
    setEditing(false);
  }

  async function openFolder() {
    if (!url) return;
    const result = await openLocalFolderPath(url);
    if (result === "copied" || result === "prompted") {
      setCopied(true);
      setOpenHint(true);
      window.setTimeout(() => {
        setCopied(false);
        setOpenHint(false);
      }, 2500);
    }
  }

  async function copyPath() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy this path:", url);
    }
  }

  if (editing) {
    return (
      <div className="w-full h-full flex items-center gap-1 px-1">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(url ?? "");
              setEditing(false);
            }
          }}
          placeholder={placeholder}
          className="flex-1 bg-white text-[11px] outline-none border border-brand rounded px-1.5 py-0.5 font-mono"
        />
      </div>
    );
  }

  if (!url) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="w-full h-full flex items-center justify-start px-2 text-[11px] text-slate-400 hover:text-brand"
      >
        + Add folder path
      </button>
    );
  }

  return (
    <div className="w-full h-full flex items-center gap-1 px-1.5 group">
      <button
        onClick={() => void openFolder()}
        className="flex-1 min-w-0 flex items-center gap-1.5 text-[11px] text-brand hover:text-brand-dark hover:underline"
        title={
          openHint
            ? "Path copied — paste into File Explorer (Ctrl+L, Ctrl+V, Enter)"
            : url
        }
      >
        <FolderOpen size={11} className="shrink-0" />
        <span className="truncate">{openHint ? "Path copied!" : "Open folder"}</span>
      </button>
      <button
        onClick={() => void copyPath()}
        className="text-slate-300 hover:text-brand opacity-0 group-hover:opacity-100"
        title={copied ? "Copied!" : "Copy path"}
      >
        <Copy size={11} />
      </button>
      <button
        onClick={() => {
          setDraft(url);
          setEditing(true);
        }}
        className="text-slate-300 hover:text-brand opacity-0 group-hover:opacity-100"
        title="Edit path"
      >
        <Edit3 size={11} />
      </button>
    </div>
  );
}
