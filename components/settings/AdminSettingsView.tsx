"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import type { OfficeAssigneeRow } from "@/lib/domain/officeAssigneeResolve";
import type { GeoconRoleAssigneesFile } from "@/lib/types/roleAssigneeData";

export function AdminSettingsView() {
  const [officeAssignees, setOfficeAssignees] = useState<OfficeAssigneeRow[]>([]);
  const [roleJson, setRoleJson] = useState("");
  const [meta, setMeta] = useState<{ updatedAt: string | null; updatedByEmail: string | null }>({
    updatedAt: null,
    updatedByEmail: null
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

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
      setRoleJson(JSON.stringify(data.roleAssignees ?? {}, null, 2));
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

  function addRow() {
    setOfficeAssignees((rows) => [
      ...rows,
      { displayName: "", employeeListName: "", email: "" }
    ]);
  }

  function updateRow(i: number, patch: Partial<OfficeAssigneeRow>) {
    setOfficeAssignees((rows) => {
      const next = [...rows];
      next[i] = { ...next[i], ...patch };
      return next;
    });
  }

  function removeRow(i: number) {
    setOfficeAssignees((rows) => rows.filter((_, j) => j !== i));
  }

  async function save() {
    setErr(null);
    setOk(null);
    let roleAssignees: GeoconRoleAssigneesFile | null;
    try {
      roleAssignees = JSON.parse(roleJson) as GeoconRoleAssigneesFile;
    } catch {
      setErr("Project roster JSON is not valid JSON.");
      return;
    }
    if (
      !roleAssignees ||
      typeof roleAssignees !== "object" ||
      !Array.isArray(roleAssignees.projectDirectors) ||
      !Array.isArray(roleAssignees.projectManagers)
    ) {
      setErr('Roster JSON must include "projectDirectors" and "projectManagers" arrays.');
      return;
    }

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
      setOk("Saved. Reload the board so dropdowns pick up roster changes.");
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

  return (
    <div className="p-6 overflow-auto h-full max-w-5xl">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/settings"
          className="text-slate-500 hover:text-brand inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft size={16} /> Settings
        </Link>
      </div>
      <h1 className="text-xl font-semibold text-brand-dark mb-1">Admin · site data</h1>
      <p className="text-sm text-slate-500 mb-2">
        Office directory (matrix display name → employee list name → email) drives subitem
        auto-assignment. Project roster JSON drives PM / director dropdowns and user sync.
      </p>
      {meta.updatedAt && (
        <p className="text-[11px] text-slate-400 mb-6">
          Last saved {new Date(meta.updatedAt).toLocaleString()}
          {meta.updatedByEmail ? ` by ${meta.updatedByEmail}` : ""}
        </p>
      )}

      {err && <p className="text-sm text-red-600 mb-4">{err}</p>}
      {ok && <p className="text-sm text-green-700 mb-4">{ok}</p>}

      <section className="mb-10">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">Office assignee directory</h2>
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
              {officeAssignees.map((row, i) => (
                <tr key={i}>
                  <td className="px-2 py-1">
                    <input
                      value={row.displayName}
                      onChange={(e) => updateRow(i, { displayName: e.target.value })}
                      className="w-full border border-slate-200 rounded px-2 py-1 text-xs"
                      placeholder="e.g. Joanne Brightman"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      value={row.employeeListName}
                      onChange={(e) => updateRow(i, { employeeListName: e.target.value })}
                      className="w-full border border-slate-200 rounded px-2 py-1 text-xs"
                      placeholder="e.g. Brightman, Joanne I."
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      value={row.email}
                      onChange={(e) => updateRow(i, { email: e.target.value })}
                      className="w-full border border-slate-200 rounded px-2 py-1 text-xs font-mono"
                      placeholder="email@geoconinc.com"
                    />
                  </td>
                  <td className="px-1">
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="text-slate-300 hover:text-red-500 p-1"
                      title="Remove row"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-2 border-t border-slate-100">
            <button type="button" onClick={addRow} className="btn-ghost text-xs inline-flex items-center gap-1">
              <Plus size={14} /> Add row
            </button>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">Project roster (PM &amp; director JSON)</h2>
        <p className="text-[11px] text-slate-500 mb-2">
          Same shape as <code className="bg-slate-100 px-1 rounded">data/geoconRoleAssignees.json</code> —
          must include <code className="bg-slate-100 px-1 rounded">projectDirectors</code> and{" "}
          <code className="bg-slate-100 px-1 rounded">projectManagers</code>.
        </p>
        <textarea
          value={roleJson}
          onChange={(e) => setRoleJson(e.target.value)}
          spellCheck={false}
          className="w-full min-h-[320px] font-mono text-xs border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-brand bg-white"
        />
      </section>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="btn-primary text-sm inline-flex items-center gap-2 disabled:opacity-50"
        >
          <Save size={16} /> {saving ? "Saving…" : "Save changes"}
        </button>
        <button type="button" onClick={() => void load()} className="btn-ghost text-sm" disabled={saving}>
          Reload
        </button>
      </div>
    </div>
  );
}
