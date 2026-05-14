"use client";

import { useState } from "react";
import { ExternalLink, Edit3 } from "lucide-react";

export function SharePointCell({
  url,
  onChange
}: {
  url: string | null;
  onChange: (next: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(url ?? "");

  function commit() {
    const trimmed = draft.trim();
    onChange(trimmed.length === 0 ? null : trimmed);
    setEditing(false);
  }

  function open() {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
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
          placeholder="Paste SharePoint folder URL"
          className="flex-1 bg-white text-[11px] outline-none border border-brand rounded px-1.5 py-0.5"
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
        + Add SharePoint link
      </button>
    );
  }

  return (
    <div className="w-full h-full flex items-center gap-1 px-1.5 group">
      <button
        onClick={open}
        className="flex-1 min-w-0 flex items-center gap-1.5 text-[11px] text-brand hover:text-brand-dark hover:underline"
        title={url}
      >
        <ExternalLink size={11} className="shrink-0" />
        <span className="truncate">Open in SharePoint</span>
      </button>
      <button
        onClick={() => {
          setDraft(url);
          setEditing(true);
        }}
        className="text-slate-300 hover:text-brand opacity-0 group-hover:opacity-100"
        title="Edit URL"
      >
        <Edit3 size={11} />
      </button>
    </div>
  );
}
