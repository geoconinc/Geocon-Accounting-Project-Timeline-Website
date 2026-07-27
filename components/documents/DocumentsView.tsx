"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Copy, FolderOpen, Search, X } from "lucide-react";
import { DEFAULT_SUBITEM_NAMES } from "@/lib/domain/projectDefaults";
import {
  getDasFormsFolder,
  getLocalTemplatesBase,
  getProjectFoldersRoot,
  joinTemplateFolderPath
} from "@/lib/config/localTemplates";
import { openLocalFolderPath } from "@/lib/client/openLocalFolder";
import type { Project } from "@/lib/types";
import type { BoardData } from "@/components/features/board/state";
import { debounce } from "@/lib/utils";

const TEMPLATE_CATEGORIES = DEFAULT_SUBITEM_NAMES;

type FolderFeedback = "copied" | "prompted" | null;

export function DocumentsView() {
  const dasRoot = getDasFormsFolder();
  const projectRoot = getProjectFoldersRoot();
  const base = getLocalTemplatesBase();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [folderFeedback, setFolderFeedback] = useState<FolderFeedback>(null);
  const configured = Boolean(dasRoot || projectRoot || base);

  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const cancelledRef = useRef(false);

  const showFolderFeedback = useCallback((result: "copied" | "prompted" | "failed") => {
    if (result === "failed") return;
    setFolderFeedback(result);
    window.setTimeout(() => setFolderFeedback(null), 5000);
  }, []);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/projects?includeFiles=false");
      if (!res.ok || cancelledRef.current) return;
      const data = (await res.json()) as BoardData;
      setProjects(data.projects);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    void refetch();

    const scheduleRefetch = debounce(() => void refetch(), 400);
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/events");
      es.addEventListener("project.upsert", scheduleRefetch);
      es.addEventListener("project.delete", scheduleRefetch);
    } catch {
      /* SSE not available */
    }

    const poll = setInterval(() => void refetch(), 30_000);
    return () => {
      cancelledRef.current = true;
      es?.close();
      clearInterval(poll);
    };
  }, [refetch]);

  const projectsWithFolder = projects.filter((p) => p.sharepointUrl);
  const q = search.toLowerCase();
  const filtered = q
    ? projectsWithFolder.filter(
        (p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
      )
    : projectsWithFolder;

  return (
    <div className="p-6 overflow-auto h-full max-w-5xl">
      <div className="mb-6 flex items-center gap-3">
        <Image src="/logo.png" alt="Geocon" width={36} height={36} />
        <div>
          <h1 className="text-xl font-semibold text-brand-dark">Document Templates</h1>
          <p className="text-sm text-slate-500">
            Templates stay on your network drive — open the folder in File Explorer. Nothing is
            uploaded to this site.
          </p>
        </div>
      </div>

      {folderFeedback ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-950 px-4 py-3 text-sm mb-4">
          {folderFeedback === "copied" ? (
            <>
              <p className="font-medium">Folder path copied</p>
              <p className="mt-1 text-emerald-900/90">
                Open File Explorer, click the address bar (or press{" "}
                <kbd className="text-xs bg-white/80 px-1 py-0.5 rounded border border-emerald-200">
                  Ctrl+L
                </kbd>
                ), paste (
                <kbd className="text-xs bg-white/80 px-1 py-0.5 rounded border border-emerald-200">
                  Ctrl+V
                </kbd>
                ), then press Enter.
              </p>
            </>
          ) : (
            <p className="font-medium">Use the path from the dialog to open the folder in File Explorer.</p>
          )}
        </div>
      ) : null}

      {!configured ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-950 px-4 py-3 text-sm mb-6">
          <p className="font-medium">Configure a folder path</p>
          <p className="mt-1 text-amber-900/90">
            Set{" "}
            <code className="text-xs bg-white/80 px-1 py-0.5 rounded border border-amber-200">
              NEXT_PUBLIC_DAS_FORMS_FOLDER
            </code>{" "}
            and/or{" "}
            <code className="text-xs bg-white/80 px-1 py-0.5 rounded border border-amber-200">
              NEXT_PUBLIC_PROJECT_FOLDERS_ROOT
            </code>
            , then redeploy (these are baked in at build time).
          </p>
        </div>
      ) : null}

      {dasRoot ? (
        <>
          <p className="text-xs text-slate-500 mb-4">
            DAS 140, DAS 142 &amp; setup forms library:{" "}
            <span className="font-mono text-slate-700">{dasRoot}</span>
          </p>
          <FolderCard
            title="DAS 140 / DAS 142 / setup sheet"
            path={dasRoot}
            copied={copiedKey === "__das__"}
            onCopied={() => {
              setCopiedKey("__das__");
              window.setTimeout(() => setCopiedKey(null), 2000);
            }}
            onOpenResult={showFolderFeedback}
          />
          <p className="mt-4 text-[11px] text-slate-400 max-w-2xl">
            Includes setup sheet (e.g. &quot;1 DAS 140 and 142 Setup Sheet&quot;), instructions, PDF
            templates by office/region, and tracking spreadsheets.
          </p>
        </>
      ) : base ? (
        <>
          <p className="text-xs text-slate-500 mb-4">
            Root: <span className="font-mono text-slate-700">{base}</span> — each row opens a
            subfolder named after the checklist item.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TEMPLATE_CATEGORIES.map((cat) => (
              <FolderCard
                key={cat}
                title={cat}
                path={joinTemplateFolderPath(base, cat)}
                copied={copiedKey === cat}
                onCopied={() => {
                  setCopiedKey(cat);
                  window.setTimeout(() => setCopiedKey(null), 2000);
                }}
                onOpenResult={showFolderFeedback}
              />
            ))}
          </div>
        </>
      ) : null}

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-brand-dark mb-1">Project Folders</h2>
        <p className="text-sm text-slate-500 mb-4">
          Click &quot;Open folder&quot; to copy the path for File Explorer. Per-project paths are set
          on each project row in the Board view (&quot;Project Folder&quot; column).
        </p>

        {projectRoot ? (
          <div className="mb-4">
            <FolderCard
              title="Project folders root"
              path={projectRoot}
              copied={copiedKey === "__projects_root__"}
              onCopied={() => {
                setCopiedKey("__projects_root__");
                window.setTimeout(() => setCopiedKey(null), 2000);
              }}
              onOpenResult={showFolderFeedback}
            />
          </div>
        ) : null}

        {projectsWithFolder.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            No projects have a folder path set yet. Add one from the Board view&apos;s
            &quot;Project Folder&quot; column
            {projectRoot ? (
              <>
                {" "}
                (typically under{" "}
                <span className="font-mono text-xs text-slate-600">{projectRoot}</span>)
              </>
            ) : null}
            .
          </div>
        ) : (
          <>
            {projectsWithFolder.length > 5 && (
              <div className="relative max-w-md mb-4">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search projects..."
                  className="w-full pl-8 pr-8 py-1.5 text-sm border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-brand"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtered.map((p) => (
                <FolderCard
                  key={p.id}
                  title={
                    <>
                      <span className="text-brand font-mono mr-1.5">{p.code}</span>
                      {p.name}
                    </>
                  }
                  path={p.sharepointUrl!}
                  copied={copiedKey === p.id}
                  onCopied={() => {
                    setCopiedKey(p.id);
                    window.setTimeout(() => setCopiedKey(null), 2000);
                  }}
                  onOpenResult={showFolderFeedback}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {configured ? (
        <p className="mt-6 text-[11px] text-slate-400 max-w-2xl">
          Browsers block opening local folders directly from a website. &quot;Open folder&quot;
          copies the path so you can paste it into File Explorer&apos;s address bar.
        </p>
      ) : null}
    </div>
  );
}

function FolderCard({
  title,
  path,
  copied,
  onCopied,
  onOpenResult
}: {
  title: ReactNode;
  path: string;
  copied: boolean;
  onCopied: () => void;
  onOpenResult: (result: "copied" | "prompted" | "failed") => void;
}) {
  const [opening, setOpening] = useState(false);

  async function copyPath() {
    try {
      await navigator.clipboard.writeText(path);
      onCopied();
    } catch {
      window.prompt("Copy this path:", path);
    }
  }

  async function openFolder() {
    setOpening(true);
    try {
      const result = await openLocalFolderPath(path);
      onOpenResult(result);
      if (result === "copied") onCopied();
    } finally {
      setOpening(false);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 flex flex-col gap-2 max-w-xl">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <p className="text-[11px] text-slate-500 font-mono break-all mt-1">{path}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void openFolder()}
          disabled={opening || !path}
          className="btn-primary text-xs inline-flex items-center gap-1.5 disabled:opacity-40"
        >
          <FolderOpen size={14} />
          {opening ? "Copying…" : "Open folder"}
        </button>
        <button
          type="button"
          onClick={() => void copyPath()}
          disabled={!path}
          className="btn-ghost text-xs border border-slate-200 inline-flex items-center gap-1.5 disabled:opacity-40"
        >
          <Copy size={14} />
          {copied ? "Copied!" : "Copy path"}
        </button>
      </div>
    </div>
  );
}
