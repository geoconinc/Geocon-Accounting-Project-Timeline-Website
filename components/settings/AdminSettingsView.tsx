"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronUp, Database, Plus, Save, Trash2 } from "lucide-react";
import type { OfficeAssigneeRow } from "@/lib/domain/officeAssigneeResolve";
import type { GeoconRoleAssigneesFile } from "@/lib/types/roleAssigneeData";

interface DbStats {
  driver: string;
  dbSizeBytes: number | null;
  dbSizePretty: string | null;
  dbMaxBytes: number | null;
  dbMaxPretty: string | null;
  usagePercent: number | null;
  tableStats: { name: string; rows: number; sizeBytes: number; sizePretty: string }[];
}

type PM = GeoconRoleAssigneesFile["projectManagers"][number];
type Director = GeoconRoleAssigneesFile["projectDirectors"][number];

export function AdminSettingsView() {
  const [officeAssignees, setOfficeAssignees] = useState<OfficeAssigneeRow[]>([]);
  const [projectManagers, setProjectManagers] = useState<PM[]>([]);
  const [projectDirectors, setProjectDirectors] = useState<Director[]>([]);
  const [rosterSource, setRosterSource] = useState("admin");
  const [meta, setMeta] = useState<{ updatedAt: string | null; updatedByEmail: string | null }>({
    updatedAt: null,
    updatedByEmail: null
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"pm" | "director" | "office">("pm");
  const [dbStats, setDbStats] = useState<DbStats | null>(null);
  const [dbLoading, setDbLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/db-stats");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as DbStats;
        if (!cancelled) setDbStats(data);
      } catch { /* ignore */ }
      finally { if (!cancelled) setDbLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/site-config");
      if (res.status === 403) {
        setErr("You do not have access to this page.");
        return;
      }
      if (!res.ok) throw new Error(`Load failed (${res.status})`);
      const data = (await res.json()) as {
        officeAssignees: OfficeAssigneeRow[];
        roleAssignees: GeoconRoleAssigneesFile | null;
        meta: { updatedAt: string | null; updatedByEmail: string | null };
      };
      setOfficeAssignees(data.officeAssignees);
      const ra = data.roleAssignees;
      setProjectManagers(ra?.projectManagers ?? []);
      setProjectDirectors(ra?.projectDirectors ?? []);
      setRosterSource(ra?.source ?? "admin");
      setMeta(data.meta);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setErr(null);
    setOk(null);

    const emptyPm = projectManagers.find((p) => !p.name.trim() || !p.email.trim());
    if (emptyPm) {
      setErr("Every project manager must have a name and email.");
      return;
    }
    const emptyDir = projectDirectors.find((d) => !d.name.trim() || !d.email.trim());
    if (emptyDir) {
      setErr("Every project director must have a name and email.");
      return;
    }

    const roleAssignees: GeoconRoleAssigneesFile = {
      source: rosterSource,
      projectManagers,
      projectDirectors
    };

    setSaving(true);
    try {
      const res = await fetch("/api/admin/site-config", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ officeAssignees, roleAssignees })
      });
      if (res.status === 403) {
        setErr("You do not have permission to save.");
        return;
      }
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `Save failed (${res.status})`);
      }
      setOk("Saved successfully. Reload the board so dropdowns pick up changes.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-slate-500 text-sm">Loading admin settings…</div>;
  }

  const tabs = [
    { key: "pm" as const, label: "Project Managers", count: projectManagers.length },
    { key: "director" as const, label: "Project Directors", count: projectDirectors.length },
    { key: "office" as const, label: "Office Directory", count: officeAssignees.length }
  ];

  return (
    <div className="p-6 overflow-auto h-full max-w-5xl">
      <div className="mb-4 flex items-center gap-4">
        <Link
          href="/settings"
          className="text-slate-500 hover:text-brand inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft size={16} /> Settings
        </Link>
      </div>
      <h1 className="text-xl font-semibold text-brand-dark mb-1">Admin · site data</h1>
      <p className="text-sm text-slate-500 mb-2">
        Manage project managers, directors, and office directory. Changes here update the
        dropdowns across the board.
      </p>
      {meta.updatedAt && (
        <p className="text-[11px] text-slate-400 mb-4">
          Last saved {new Date(meta.updatedAt).toLocaleString()}
          {meta.updatedByEmail ? ` by ${meta.updatedByEmail}` : ""}
        </p>
      )}

      <DatabaseUsageCard stats={dbStats} loading={dbLoading} />

      {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
      {ok && <p className="text-sm text-green-700 mb-3">{ok}</p>}

      <div className="flex border-b border-slate-200 mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === t.key
                ? "text-brand border-b-2 border-brand"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
            <span className="ml-1.5 text-[10px] bg-slate-100 text-slate-600 rounded-full px-1.5 py-0.5">
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {activeTab === "pm" && (
        <ProjectManagersTable
          managers={projectManagers}
          onChange={setProjectManagers}
        />
      )}
      {activeTab === "director" && (
        <ProjectDirectorsTable
          directors={projectDirectors}
          onChange={setProjectDirectors}
        />
      )}
      {activeTab === "office" && (
        <OfficeDirectoryTable
          rows={officeAssignees}
          onChange={setOfficeAssignees}
        />
      )}

      <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="btn-primary text-sm inline-flex items-center gap-2 disabled:opacity-50"
        >
          <Save size={16} /> {saving ? "Saving…" : "Save all changes"}
        </button>
        <button type="button" onClick={() => void load()} className="btn-ghost text-sm" disabled={saving}>
          Reload
        </button>
      </div>
    </div>
  );
}

function ProjectManagersTable({
  managers,
  onChange
}: {
  managers: PM[];
  onChange: (next: PM[]) => void;
}) {
  function add() {
    onChange([...managers, { name: "", email: "", job: "", office: "" }]);
  }
  function update(i: number, patch: Partial<PM>) {
    const next = [...managers];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  }
  function remove(i: number) {
    onChange(managers.filter((_, j) => j !== i));
  }
  function moveUp(i: number) {
    if (i === 0) return;
    const next = [...managers];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    onChange(next);
  }
  function moveDown(i: number) {
    if (i >= managers.length - 1) return;
    const next = [...managers];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    onChange(next);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-500">
          These appear in the PM dropdown when creating or editing projects.
        </p>
        <button type="button" onClick={add} className="btn-primary text-xs inline-flex items-center gap-1">
          <Plus size={14} /> Add PM
        </button>
      </div>
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="text-left px-3 py-2 font-medium w-8">#</th>
              <th className="text-left px-3 py-2 font-medium">Name</th>
              <th className="text-left px-3 py-2 font-medium">Email</th>
              <th className="text-left px-3 py-2 font-medium">Job title</th>
              <th className="text-left px-3 py-2 font-medium">Office</th>
              <th className="w-24" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {managers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-xs text-slate-400">
                  No project managers yet. Click &quot;Add PM&quot; to add one.
                </td>
              </tr>
            )}
            {managers.map((pm, i) => (
              <tr key={i} className="group">
                <td className="px-3 py-1 text-xs text-slate-400">{i + 1}</td>
                <td className="px-2 py-1">
                  <input
                    value={pm.name}
                    onChange={(e) => update(i, { name: e.target.value })}
                    className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-brand outline-none"
                    placeholder="Last, First"
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    value={pm.email}
                    onChange={(e) => update(i, { email: e.target.value })}
                    className="w-full border border-slate-200 rounded px-2 py-1 text-xs font-mono focus:ring-1 focus:ring-brand outline-none"
                    placeholder="email@geoconinc.com"
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    value={pm.job}
                    onChange={(e) => update(i, { job: e.target.value })}
                    className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-brand outline-none"
                    placeholder="Job title"
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    value={pm.office}
                    onChange={(e) => update(i, { office: e.target.value })}
                    className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-brand outline-none"
                    placeholder="Office"
                  />
                </td>
                <td className="px-1 py-1">
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => moveUp(i)} className="p-1 text-slate-300 hover:text-slate-600" title="Move up">
                      <ChevronUp size={14} />
                    </button>
                    <button onClick={() => moveDown(i)} className="p-1 text-slate-300 hover:text-slate-600" title="Move down">
                      <ChevronDown size={14} />
                    </button>
                    <button onClick={() => remove(i)} className="p-1 text-slate-300 hover:text-red-500" title="Remove">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProjectDirectorsTable({
  directors,
  onChange
}: {
  directors: Director[];
  onChange: (next: Director[]) => void;
}) {
  function add() {
    onChange([
      ...directors,
      { chartLabel: "", name: "", email: "", job: "", office: "", inEmployeeList: true }
    ]);
  }
  function update(i: number, patch: Partial<Director>) {
    const next = [...directors];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  }
  function remove(i: number) {
    onChange(directors.filter((_, j) => j !== i));
  }
  function moveUp(i: number) {
    if (i === 0) return;
    const next = [...directors];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    onChange(next);
  }
  function moveDown(i: number) {
    if (i >= directors.length - 1) return;
    const next = [...directors];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    onChange(next);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-500">
          These appear in the Director dropdown when creating or editing projects.
        </p>
        <button type="button" onClick={add} className="btn-primary text-xs inline-flex items-center gap-1">
          <Plus size={14} /> Add Director
        </button>
      </div>
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="text-left px-3 py-2 font-medium w-8">#</th>
              <th className="text-left px-3 py-2 font-medium">Display name</th>
              <th className="text-left px-3 py-2 font-medium">Employee list name</th>
              <th className="text-left px-3 py-2 font-medium">Email</th>
              <th className="text-left px-3 py-2 font-medium">Job</th>
              <th className="text-left px-3 py-2 font-medium">Office</th>
              <th className="w-24" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {directors.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-xs text-slate-400">
                  No project directors yet. Click &quot;Add Director&quot; to add one.
                </td>
              </tr>
            )}
            {directors.map((d, i) => (
              <tr key={i} className="group">
                <td className="px-3 py-1 text-xs text-slate-400">{i + 1}</td>
                <td className="px-2 py-1">
                  <input
                    value={d.chartLabel}
                    onChange={(e) => update(i, { chartLabel: e.target.value })}
                    className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-brand outline-none"
                    placeholder="David Evans"
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    value={d.name}
                    onChange={(e) => update(i, { name: e.target.value })}
                    className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-brand outline-none"
                    placeholder="Evans, Dave B."
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    value={d.email}
                    onChange={(e) => update(i, { email: e.target.value })}
                    className="w-full border border-slate-200 rounded px-2 py-1 text-xs font-mono focus:ring-1 focus:ring-brand outline-none"
                    placeholder="email@geoconinc.com"
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    value={d.job}
                    onChange={(e) => update(i, { job: e.target.value })}
                    className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-brand outline-none"
                    placeholder="Job title"
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    value={d.office}
                    onChange={(e) => update(i, { office: e.target.value })}
                    className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-brand outline-none"
                    placeholder="Office"
                  />
                </td>
                <td className="px-1 py-1">
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => moveUp(i)} className="p-1 text-slate-300 hover:text-slate-600" title="Move up">
                      <ChevronUp size={14} />
                    </button>
                    <button onClick={() => moveDown(i)} className="p-1 text-slate-300 hover:text-slate-600" title="Move down">
                      <ChevronDown size={14} />
                    </button>
                    <button onClick={() => remove(i)} className="p-1 text-slate-300 hover:text-red-500" title="Remove">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OfficeDirectoryTable({
  rows,
  onChange
}: {
  rows: OfficeAssigneeRow[];
  onChange: (next: OfficeAssigneeRow[]) => void;
}) {
  function add() {
    onChange([...rows, { displayName: "", employeeListName: "", email: "" }]);
  }
  function update(i: number, patch: Partial<OfficeAssigneeRow>) {
    const next = [...rows];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  }
  function remove(i: number) {
    onChange(rows.filter((_, j) => j !== i));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-500">
          Maps matrix display names to employee list names and emails for auto-assignment.
        </p>
        <button type="button" onClick={add} className="btn-primary text-xs inline-flex items-center gap-1">
          <Plus size={14} /> Add row
        </button>
      </div>
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Matrix name</th>
              <th className="text-left px-3 py-2 font-medium">Employee list name</th>
              <th className="text-left px-3 py-2 font-medium">Email</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-xs text-slate-400">
                  No office assignees yet. Click &quot;Add row&quot; to add one.
                </td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr key={i} className="group">
                <td className="px-2 py-1">
                  <input
                    value={row.displayName}
                    onChange={(e) => update(i, { displayName: e.target.value })}
                    className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-brand outline-none"
                    placeholder="e.g. Joanne Brightman"
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    value={row.employeeListName}
                    onChange={(e) => update(i, { employeeListName: e.target.value })}
                    className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-brand outline-none"
                    placeholder="e.g. Brightman, Joanne I."
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    value={row.email}
                    onChange={(e) => update(i, { email: e.target.value })}
                    className="w-full border border-slate-200 rounded px-2 py-1 text-xs font-mono focus:ring-1 focus:ring-brand outline-none"
                    placeholder="email@geoconinc.com"
                  />
                </td>
                <td className="px-1 py-1">
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove row"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DatabaseUsageCard({
  stats,
  loading
}: {
  stats: DbStats | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-5 mb-5 animate-pulse">
        <div className="h-4 bg-slate-100 rounded w-40 mb-3" />
        <div className="h-3 bg-slate-100 rounded w-64" />
      </div>
    );
  }

  if (!stats || stats.driver === "json") {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-5 mb-5">
        <div className="flex items-center gap-2 mb-2">
          <Database size={16} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-800">Database</h2>
        </div>
        <p className="text-xs text-slate-500">
          Using local JSON storage. Set <code className="bg-slate-100 px-1 rounded">STORAGE_DRIVER=postgres</code> to
          use PostgreSQL.
        </p>
      </div>
    );
  }

  const pct = stats.usagePercent ?? 0;
  const barColor =
    pct > 85 ? "bg-red-500" : pct > 60 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 mb-5">
      <div className="flex items-center gap-2 mb-3">
        <Database size={16} className="text-brand" />
        <h2 className="text-sm font-semibold text-slate-800">Database Usage</h2>
        <span className="ml-auto text-xs text-slate-500">PostgreSQL</span>
      </div>

      <div className="flex items-end gap-3 mb-3">
        <span className="text-2xl font-bold text-slate-800">{pct}%</span>
        <span className="text-sm text-slate-500 mb-0.5">
          {stats.dbSizePretty} / {stats.dbMaxPretty}
        </span>
      </div>

      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-4">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

      {stats.tableStats.length > 0 && (
        <details className="group">
          <summary className="text-xs text-slate-500 cursor-pointer hover:text-brand select-none">
            Table breakdown
          </summary>
          <div className="mt-2 border border-slate-100 rounded-md overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="text-left px-3 py-1.5 font-medium">Table</th>
                  <th className="text-right px-3 py-1.5 font-medium">Rows</th>
                  <th className="text-right px-3 py-1.5 font-medium">Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {stats.tableStats.map((t) => (
                  <tr key={t.name}>
                    <td className="px-3 py-1.5 font-mono text-slate-700">{t.name}</td>
                    <td className="px-3 py-1.5 text-right text-slate-600">
                      {t.rows.toLocaleString()}
                    </td>
                    <td className="px-3 py-1.5 text-right text-slate-600">{t.sizePretty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
