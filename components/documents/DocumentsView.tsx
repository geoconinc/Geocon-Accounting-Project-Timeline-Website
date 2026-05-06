"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { File as FileIcon, Trash2, Upload } from "lucide-react";
import { format } from "date-fns";
import {
  DEFAULT_SUBITEM_NAMES,
  demoStore,
  loadDb,
  type DocumentRef
} from "@/lib/demo/localStore";
import { DEMO_USER } from "@/lib/demo/config";

const TEMPLATE_CATEGORIES = DEFAULT_SUBITEM_NAMES;

export function DocumentsView() {
  const [docs, setDocs] = useState<DocumentRef[]>([]);
  const [busyCat, setBusyCat] = useState<string | null>(null);

  function refresh() {
    setDocs(loadDb().documents);
  }

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener("geocon-demo-change", onChange);
    return () => window.removeEventListener("geocon-demo-change", onChange);
  }, []);

  async function uploadInto(category: string, fileList: FileList | null) {
    if (!fileList) return;
    setBusyCat(category);
    try {
      for (const f of Array.from(fileList)) {
        await demoStore.addDocument({
          name: f.name,
          category,
          file: f,
          uploadedBy: DEMO_USER.id
        });
      }
      window.dispatchEvent(new CustomEvent("geocon-demo-change"));
    } finally {
      setBusyCat(null);
    }
  }

  function open(doc: DocumentRef) {
    const url = demoStore.getDocumentUrl(doc.id);
    if (url) window.open(url, "_blank", "noopener");
  }

  function remove(id: string) {
    if (!confirm("Delete this template?")) return;
    demoStore.deleteDocument(id);
    window.dispatchEvent(new CustomEvent("geocon-demo-change"));
  }

  return (
    <div className="p-6 overflow-auto h-full max-w-5xl">
      <div className="mb-6 flex items-center gap-3">
        <Image src="/logo.png" alt="Geocon" width={36} height={36} />
        <div>
          <h1 className="text-xl font-semibold text-brand-dark">Document Templates</h1>
          <p className="text-sm text-slate-500">
            Upload and manage the standard template for each project subitem.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TEMPLATE_CATEGORIES.map((cat) => {
          const items = docs.filter((d) => d.category === cat);
          return (
            <TemplateCard
              key={cat}
              title={cat}
              items={items}
              busy={busyCat === cat}
              onUpload={(files) => uploadInto(cat, files)}
              onOpen={open}
              onRemove={remove}
            />
          );
        })}
      </div>
    </div>
  );
}

function TemplateCard({
  title,
  items,
  busy,
  onUpload,
  onOpen,
  onRemove
}: {
  title: string;
  items: DocumentRef[];
  busy: boolean;
  onUpload: (files: FileList | null) => void;
  onOpen: (doc: DocumentRef) => void;
  onRemove: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          <p className="text-[11px] text-slate-400">
            {items.length} {items.length === 1 ? "template" : "templates"}
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => onUpload(e.target.files)}
        />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="btn-primary text-xs disabled:opacity-50 shrink-0"
        >
          <Upload size={12} /> {busy ? "Uploading..." : "Upload"}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-xs text-slate-400 text-center py-6 border border-dashed border-slate-200 rounded">
          No template uploaded yet.
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-slate-100">
          {items.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-2 py-2 group"
            >
              <button
                onClick={() => onOpen(d)}
                className="flex items-center gap-2 min-w-0 text-left text-slate-700 hover:text-brand"
              >
                <FileIcon size={14} className="shrink-0 text-slate-400" />
                <span className="text-sm font-medium truncate">{d.name}</span>
              </button>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[11px] text-slate-400">
                  {format(new Date(d.uploadedAt), "MMM d, yyyy")}
                </span>
                <span className="text-[11px] text-slate-400">
                  {(d.size / 1024).toFixed(1)} KB
                </span>
                <button
                  onClick={() => onRemove(d.id)}
                  className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
