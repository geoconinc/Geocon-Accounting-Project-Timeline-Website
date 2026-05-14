"use client";

import Image from "next/image";
import { useState } from "react";
import { Copy, ExternalLink, FolderOpen } from "lucide-react";
import { DEFAULT_SUBITEM_NAMES } from "@/lib/domain/projectDefaults";
import {
  getDasFormsFolder,
  getLocalTemplatesBase,
  joinTemplateFolderPath,
  localPathToFileUrl
} from "@/lib/config/localTemplates";

const TEMPLATE_CATEGORIES = DEFAULT_SUBITEM_NAMES;

export function DocumentsView() {
  const dasRoot = getDasFormsFolder();
  const base = getLocalTemplatesBase();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const configured = Boolean(dasRoot || base);

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

      {!configured ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-950 px-4 py-3 text-sm mb-6">
          <p className="font-medium">Configure a folder path</p>
          <p className="mt-1 text-amber-900/90">
            Set{" "}
            <code className="text-xs bg-white/80 px-1 py-0.5 rounded border border-amber-200">
              NEXT_PUBLIC_DAS_FORMS_FOLDER
            </code>{" "}
            to the Accounting shared folder (DAS 140, DAS 142, setup sheet), or set{" "}
            <code className="text-xs bg-white/80 px-1 py-0.5 rounded border border-amber-200">
              NEXT_PUBLIC_LOCAL_TEMPLATES_BASE
            </code>{" "}
            for per–checklist-item subfolders. Restart the dev server after changing env.
          </p>
        </div>
      ) : null}

      {dasRoot ? (
        <>
          <p className="text-xs text-slate-500 mb-4">
            DAS 140, DAS 142 &amp; setup forms library:{" "}
            <span className="font-mono text-slate-700">{dasRoot}</span>
          </p>
          <DasFolderCard
            path={dasRoot}
            copied={copiedKey === "__das__"}
            onCopied={() => {
              setCopiedKey("__das__");
              window.setTimeout(() => setCopiedKey(null), 2000);
            }}
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
              <LocalTemplateCard
                key={cat}
                title={cat}
                fullPath={joinTemplateFolderPath(base, cat)}
                copied={copiedKey === cat}
                onCopied={() => {
                  setCopiedKey(cat);
                  window.setTimeout(() => setCopiedKey(null), 2000);
                }}
              />
            ))}
          </div>
        </>
      ) : null}

      {configured ? (
        <p className="mt-6 text-[11px] text-slate-400 max-w-2xl">
          Browsers often block opening <code className="text-[10px]">file://</code> links from web
          pages. If &quot;Open folder&quot; does nothing, use &quot;Copy path&quot; and paste it into
          the File Explorer address bar (Windows) or Finder&apos;s Go → Go to Folder (macOS).
        </p>
      ) : null}
    </div>
  );
}

function DasFolderCard({
  path,
  copied,
  onCopied
}: {
  path: string;
  copied: boolean;
  onCopied: () => void;
}) {
  const fileUrl = path ? localPathToFileUrl(path) : "";

  async function copyPath() {
    try {
      await navigator.clipboard.writeText(path);
      onCopied();
    } catch {
      window.prompt("Copy this path:", path);
    }
  }

  function openFolder() {
    if (!fileUrl) return;
    window.open(fileUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 flex flex-col gap-3 max-w-xl">
      <div>
        <h2 className="text-sm font-semibold text-slate-800">DAS 140 / DAS 142 / setup sheet</h2>
        <p className="text-[11px] text-slate-500 font-mono break-all mt-1">{path}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={openFolder}
          className="btn-primary text-xs inline-flex items-center gap-1.5"
        >
          <FolderOpen size={14} />
          Open folder
        </button>
        <button
          type="button"
          onClick={copyPath}
          className="btn-ghost text-xs border border-slate-200 inline-flex items-center gap-1.5"
        >
          <Copy size={14} />
          {copied ? "Copied!" : "Copy path"}
        </button>
        {fileUrl ? (
          <a
            href={fileUrl}
            className="text-xs text-brand hover:underline inline-flex items-center gap-1 px-2 py-1"
          >
            <ExternalLink size={12} />
            file link
          </a>
        ) : null}
      </div>
    </div>
  );
}

function LocalTemplateCard({
  title,
  fullPath,
  copied,
  onCopied
}: {
  title: string;
  fullPath: string;
  copied: boolean;
  onCopied: () => void;
}) {
  const fileUrl = fullPath ? localPathToFileUrl(fullPath) : "";

  async function copyPath() {
    if (!fullPath) return;
    try {
      await navigator.clipboard.writeText(fullPath);
      onCopied();
    } catch {
      window.prompt("Copy this path:", fullPath);
    }
  }

  function openFolder() {
    if (!fileUrl) return;
    window.open(fileUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        {fullPath ? (
          <p className="text-[11px] text-slate-500 font-mono break-all mt-1">{fullPath}</p>
        ) : (
          <p className="text-[11px] text-slate-400 mt-1">No path configured.</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!fullPath}
          onClick={openFolder}
          className="btn-primary text-xs disabled:opacity-40 inline-flex items-center gap-1.5"
        >
          <FolderOpen size={14} />
          Open folder
        </button>
        <button
          type="button"
          disabled={!fullPath}
          onClick={copyPath}
          className="btn-ghost text-xs border border-slate-200 inline-flex items-center gap-1.5 disabled:opacity-40"
        >
          <Copy size={14} />
          {copied ? "Copied!" : "Copy path"}
        </button>
        {fileUrl ? (
          <a
            href={fileUrl}
            className="text-xs text-brand hover:underline inline-flex items-center gap-1 px-2 py-1"
          >
            <ExternalLink size={12} />
            file link
          </a>
        ) : null}
      </div>
    </div>
  );
}
