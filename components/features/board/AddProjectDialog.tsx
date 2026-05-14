"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { ProjectGroup, ProjectStatus, User } from "@/lib/types";
import { api } from "@/lib/client/boardApi";
import { OFFICES, type Office } from "@/lib/domain/offices";
import { DEMO_MODE } from "@/lib/demo/config";
import { loadDb } from "@/lib/demo/localStore";
import { syncDemoRoleRosterUsersOnce } from "@/lib/demo/syncRoleRosterToDemo";
import { fetchRoleAssignees } from "@/lib/client/roleAssigneesApi";
import {
  usersMatchingDirectorRoster,
  usersMatchingPmRoster
} from "@/lib/domain/roleAssigneeRoster";
import roster from "@/data/geoconRoleAssignees.json";

const statusByGroup: Record<ProjectGroup, ProjectStatus> = {
  Current: "New",
  Future: "Future",
  Completed: "Completed"
};

const pmJobByEmail = new Map(
  roster.projectManagers.map((p) => [p.email.trim().toLowerCase(), p.job])
);
const directorLabelByEmail = new Map(
  roster.projectDirectors
    .filter((d) => d.email?.trim())
    .map((d) => [d.email.trim().toLowerCase(), d.chartLabel])
);

function pmOptionLabel(u: User): string {
  const job = pmJobByEmail.get(u.email.toLowerCase());
  return job ? `${u.name} — ${u.email} — ${job}` : `${u.name} — ${u.email}`;
}

function directorOptionLabel(u: User): string {
  const chart = directorLabelByEmail.get(u.email.toLowerCase());
  return chart ? `${chart} — ${u.email}` : `${u.name} — ${u.email}`;
}

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
  const [office, setOffice] = useState<Office | "">("");
  const [projectManagerId, setProjectManagerId] = useState("");
  const [projectDirectorId, setProjectDirectorId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pmUsers, setPmUsers] = useState<User[]>([]);
  const [directorUsers, setDirectorUsers] = useState<User[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  const directorsNotInExport = useMemo(
    () => roster.projectDirectors.filter((d) => !d.inEmployeeList),
    []
  );

  useEffect(() => {
    if (open) {
      setCode("");
      setName("");
      setOffice("");
      setProjectManagerId("");
      setProjectDirectorId("");
      setErr(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      setRosterLoading(true);
      try {
        if (DEMO_MODE) {
          syncDemoRoleRosterUsersOnce();
          const db = loadDb();
          if (!cancelled) {
            setPmUsers(usersMatchingPmRoster(db.users));
            setDirectorUsers(usersMatchingDirectorRoster(db.users));
          }
        } else {
          const data = await fetchRoleAssignees();
          if (!cancelled) {
            setPmUsers(data.projectManagers.map((x) => x.user));
            setDirectorUsers(data.projectDirectors.map((x) => x.user));
          }
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Could not load role roster");
      } finally {
        if (!cancelled) setRosterLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
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
    if (!office) {
      setErr("Office is required — it determines who is auto-assigned to subitems");
      return;
    }
    if (!projectManagerId) {
      setErr("Project manager is required");
      return;
    }
    setBusy(true);
    try {
      await api.createProject({
        code: code.trim() || "NEW",
        name: name.trim(),
        group,
        status: statusByGroup[group],
        office,
        projectManagerId,
        projectDirectorId: projectDirectorId || null
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
        className="bg-white rounded-lg shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
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
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Office</span>
            <select
              value={office}
              onChange={(e) => setOffice(e.target.value as Office | "")}
              className="border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand bg-white"
            >
              <option value="">Select office…</option>
              {OFFICES.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-400">
              Subitems are auto-assigned based on the office.
            </span>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Project manager</span>
            <select
              value={projectManagerId}
              onChange={(e) => setProjectManagerId(e.target.value)}
              disabled={rosterLoading}
              className="border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand bg-white disabled:opacity-50"
            >
              <option value="">{rosterLoading ? "Loading roster…" : "Select project manager…"}</option>
              {pmUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {pmOptionLabel(u)}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-400">
              From employee list: job title contains engineer, geologist, or scientist. They receive an
              email to set up the DAS 140 form when the project is created.
            </span>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Project director</span>
            <select
              value={projectDirectorId}
              onChange={(e) => setProjectDirectorId(e.target.value)}
              disabled={rosterLoading}
              className="border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand bg-white disabled:opacity-50"
            >
              <option value="">— Optional —</option>
              {directorUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {directorOptionLabel(u)}
                </option>
              ))}
            </select>
          </label>
          {directorsNotInExport.length > 0 && (
            <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-100 rounded px-2 py-1.5">
              Not in the employee export (no email on file):{" "}
              {directorsNotInExport.map((d) => d.chartLabel).join(", ")}.
            </p>
          )}
          {err && <p className="text-xs text-red-600">{err}</p>}
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={onClose} className="btn-ghost text-sm">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={busy || !name.trim() || !projectManagerId || rosterLoading}
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
