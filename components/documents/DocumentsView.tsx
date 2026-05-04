"use client";

import { useEffect, useRef, useState } from "react";
import { File as FileIcon, Trash2, Upload, FolderPlus } from "lucide-react";
import { demoStore, loadDb, type DocumentRef } from "@/lib/demo/localStore";
import { DEMO_USER } from "@/lib/demo/config";
import { format } from "date-fns";

const DEFAULT_CATEGORIES = ["Setup Forms", "Templates", "Reports", "Other"];

export function DocumentsView() {
  const [docs, setDocs] = useState<DocumentRef[]>([]);
  const [category, setCategory] = useState("Templates");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [filterCat, setFilterCat] = useState<string | null>(null);
  const [extraCats, setExtraCats] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  function refresh() {
    setDocs(loadDb().documents);
  }

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener("geocon-demo-change", onChange);
    return () => window.removeEventListener("geocon-demo-change", onChange);
  }, []);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    setBusy(true);
    try {
      for (const f of Array.from(fileList)) {
        await demoStore.addDocument({
          name: name.trim() || f.name,
          category,
          file: f,
          uploadedBy: DEMO_USER.id
        });
      }
      window.dispatchEvent(new CustomEvent("geocon-demo-change"));
      setName("");
    } finally {
      setBusy(false);
    }
  }

  function open(doc: DocumentRef) {
    const url = demoStore.getDocumentUrl(doc.id);
    if (url) window.open(url, "_blank", "noopener");
  }

  function remove(id: string) {
    if (!confirm("Delete this document?")) return;
    demoStore.deleteDocument(id);
    window.dispatchEvent(new CustomEvent("geocon-demo-change"));
  }

  function addCategory() {
    const newCat = prompt("New category name?")?.trim();
    if (!newCat) return;
    if (!allCategories.includes(newCat)) setExtraCats((c) => [...c, newCat]);
    setCategory(newCat);
  }

  const allCategories = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...extraCats, ...docs.map((d) => d.category)])
  );
  const visible = filterCat ? docs.filter((d) => d.category === filterCat) : docs;

  return (
    <div className="p-6 overflow-auto h-full">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-brand-dark">Document Hub</h1>
        <p className="text-sm text-slate-500">Templates and reusable documents for your team.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
          Upload a document
        </h2>
        <div className="flex flex-wrap gap-2 items-end">
          <label className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <span className="text-[11px] text-slate-500">Display name (optional)</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. DAS 140 template"
              className="border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand"
            />
          </label>
          <label className="flex flex-col gap-1 min-w-[180px]">
            <span className="text-[11px] text-slate-500">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="border rounded px-3 py-2 text-sm bg-white"
            >
              {allCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <button onClick={addCategory} className="btn-ghost text-sm">
            <FolderPlus size={14} /> New category
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="btn-primary text-sm disabled:opacity-50"
          >
            <Upload size={14} /> {busy ? "Uploading..." : "Upload file"}
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-3 flex-wrap">
        <button
          onClick={() => setFilterCat(null)}
          className={`text-xs px-3 py-1 rounded-full border ${
            filterCat === null
              ? "bg-brand text-white border-brand"
              : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
          }`}
        >
          All ({docs.length})
        </button>
        {allCategories.map((c) => {
          const count = docs.filter((d) => d.category === c).length;
          if (count === 0) return null;
          return (
            <button
              key={c}
              onClick={() => setFilterCat(c)}
              className={`text-xs px-3 py-1 rounded-full border ${
                filterCat === c
                  ? "bg-brand text-white border-brand"
                  : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
              }`}
            >
              {c} ({count})
            </button>
          );
        })}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {visible.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            No documents yet. Upload a template above.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Name</th>
                <th className="text-left px-4 py-2 font-medium">Category</th>
                <th className="text-left px-4 py-2 font-medium">Size</th>
                <th className="text-left px-4 py-2 font-medium">Uploaded</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <button
                      onClick={() => open(d)}
                      className="flex items-center gap-2 text-slate-700 hover:text-brand"
                    >
                      <FileIcon size={14} />
                      <span className="font-medium">{d.name}</span>
                      <span className="text-[11px] text-slate-400">{d.filename}</span>
                    </button>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{d.category}</td>
                  <td className="px-4 py-2 text-slate-500">{(d.size / 1024).toFixed(1)} KB</td>
                  <td className="px-4 py-2 text-slate-500">
                    {format(new Date(d.uploadedAt), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => remove(d.id)}
                      className="text-slate-300 hover:text-red-500"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
