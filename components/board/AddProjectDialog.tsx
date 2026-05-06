"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { ProjectGroup, ProjectStatus } from "@/lib/types";
import { api } from "@/lib/client/boardApi";

const statusByGroup: Record<ProjectGroup, ProjectStatus> = {
  Current: "New",
  Future: "Future",
  Completed: "Completed"
};

export function AddProjectDialog({
  group,
  open,
  onClose
}: {
  group: ProjectGroup;
  open: boolean;
  onClose: () => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCode("");
      setName("");
      setErr(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open, onClose]);

  if (!open) return null;

  async function submit() {
    if (!name.trim()) {
      setErr("Project name is required");
      return;
    }
    setBusy(true);
    try {
      await api.createProject({
        code: code.trim() || "NEW",
        name: name.trim(),
        group,
        status: statusByGroup[group]
      });
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create project");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 grid place-items-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-brand-dark">
            New project · {group}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Code</span>
            <input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. W16288802"
              className="border border-slate-300 rounded px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-brand"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Project name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aroviste"
              onKeyDown={(e) => e.key === "Enter" && submit()}
              className="border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand"
            />
          </label>
          {err && <p className="text-xs text-red-600">{err}</p>}
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={onClose} className="btn-ghost text-sm">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={busy || !name.trim()}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {busy ? "Creating..." : "Create project"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
