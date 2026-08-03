"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronUp, Database, LayoutDashboard, Plus, Save, Settings, Trash2, AlertTriangle } from "lucide-react";
import type { OfficeAssigneeRow } from "@/lib/domain/officeAssigneeResolve";
import type { GeoconRoleAssigneesFile } from "@/lib/types/roleAssigneeData";
import { formatAppVersion } from "@/lib/config/appVersion";
import {
  EMAIL_TEMPLATE_DEFS,
  NOTIFICATION_CATEGORIES,
  type EmailTemplate,
  type EmailTemplateKey,
  type NotificationCategory,
  type NotificationConfigAdminView
} from "@/lib/notifications/emailConfigTypes";
import { AdminDashboardView } from "./AdminDashboardView";

/** Categories delivered by the scheduled cron jobs (vs. instant, event-driven emails). */
const CRON_CATEGORIES = new Set<NotificationCategory>([
  "dueDateReminder",
  "dasFollowup",
  "incompleteWeek"
]);

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

export function AdminSettingsView({ isOwner = false }: { isOwner?: boolean }) {
  const [topTab, setTopTab] = useState<"dashboard" | "settings">("dashboard");
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

  const [boardAdminEmails, setBoardAdminEmails] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<
    "pm" | "director" | "office" | "admins" | "email" | "notifications" | "danger"
  >("pm");
  const [dbStats, setDbStats] = useState<DbStats | null>(null);
  const [dbLoading, setDbLoading] = useState(true);

  const [notifForm, setNotifForm] = useState<NotificationConfigAdminView | null>(null);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [emailOk, setEmailOk] = useState<string | null>(null);
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetErr, setResetErr] = useState<string | null>(null);
  const [resetOk, setResetOk] = useState<string | null>(null);

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
        boardAdminEmails?: string[];
        meta: { updatedAt: string | null; updatedByEmail: string | null };
      };
      setOfficeAssignees(data.officeAssignees);
      const ra = data.roleAssignees;
      setProjectManagers(ra?.projectManagers ?? []);
      setProjectDirectors(ra?.projectDirectors ?? []);
      setRosterSource(ra?.source ?? "admin");
      setBoardAdminEmails(data.boardAdminEmails ?? []);
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

  const loadEmail = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/email-config");
      if (!res.ok) return;
      const data = (await res.json()) as NotificationConfigAdminView;
      setNotifForm(data);
    } catch {
      /* ignore: notification settings fall back to built-in defaults */
    }
  }, []);

  useEffect(() => {
    void loadEmail();
  }, [loadEmail]);

  function patchNotif(patch: Partial<NotificationConfigAdminView>) {
    setNotifForm((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function toggleCategory(key: NotificationCategory, value: boolean) {
    setNotifForm((prev) =>
      prev ? { ...prev, eventToggles: { ...prev.eventToggles, [key]: value } } : prev
    );
  }

  function patchTemplate(key: EmailTemplateKey, patch: Partial<EmailTemplate>) {
    setNotifForm((prev) =>
      prev
        ? { ...prev, templates: { ...prev.templates, [key]: { ...prev.templates[key], ...patch } } }
        : prev
    );
  }

  async function saveEmail() {
    if (!notifForm) return;
    setEmailErr(null);
    setEmailOk(null);
    setEmailSaving(true);
    try {
      const res = await fetch("/api/admin/email-config", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          emailEnabled: notifForm.emailEnabled,
          testMode: notifForm.testMode,
          testRecipients: notifForm.testRecipients,
          eventToggles: notifForm.eventToggles,
          templates: notifForm.templates
        })
      });
      if (res.status === 403) {
        setEmailErr("You do not have permission to save notification settings.");
        return;
      }
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `Save failed (${res.status})`);
      }
      const updated = (await res.json()) as NotificationConfigAdminView;
      setNotifForm(updated);
      setEmailOk("Notification settings saved.");
    } catch (e) {
      setEmailErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setEmailSaving(false);
    }
  }

  async function resetBoard() {
    setResetErr(null);
    setResetOk(null);
    if (resetConfirm !== "RESET") {
      setResetErr('Type RESET in the box to enable the reset button.');
      return;
    }
    if (
      !confirm(
        "This permanently deletes ALL projects, checklist items, and uploaded files, and clears the activity log.\n\nUsers and site settings are kept.\n\nContinue?"
      )
    ) {
      return;
    }
    setResetting(true);
    try {
      const res = await fetch("/api/admin/reset-board", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirm: "RESET" })
      });
      if (res.status === 403) {
        setResetErr("Only the app owner can reset the board.");
        return;
      }
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
        throw new Error(j.message ?? j.error ?? `Reset failed (${res.status})`);
      }
      const data = (await res.json()) as { projectsDeleted: number; activityCleared: number };
      setResetConfirm("");
      setResetOk(
        `Board reset. Deleted ${data.projectsDeleted} project(s). Reloading the board…`
      );
      // Hard navigation so Next.js doesn't serve a cached board with old projects.
      window.setTimeout(() => {
        window.location.assign("/?reset=" + Date.now());
      }, 600);
    } catch (e) {
      setResetErr(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setResetting(false);
    }
  }

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
        body: JSON.stringify({ officeAssignees, roleAssignees, boardAdminEmails })
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

  if (loading && topTab === "settings") {
    return (
      <div className="h-full w-full overflow-y-auto p-8 text-slate-500 text-sm">
        Loading admin settings…
      </div>
    );
  }

  const settingsTabs: { key: typeof activeTab; label: string; count?: number }[] = [
    { key: "pm", label: "Project Managers", count: projectManagers.length },
    { key: "director", label: "Project Directors", count: projectDirectors.length },
    { key: "office", label: "Office Directory", count: officeAssignees.length },
    { key: "admins", label: "Board Admins", count: boardAdminEmails.length },
    { key: "email", label: "Email Templates" },
    { key: "notifications", label: "Notifications" },
    { key: "danger", label: "Danger zone" }
  ];

  const hideRosterSave = activeTab === "email" || activeTab === "notifications" || activeTab === "danger";

  return (
    <div className="h-full w-full min-w-0 overflow-y-auto p-6 lg:p-8">
      <div className="mb-4 flex items-center gap-4">
        <Link
          href="/"
          className="text-slate-500 hover:text-brand inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft size={16} /> Board
        </Link>
      </div>
      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-xl font-semibold text-brand-dark">Admin Panel</h1>
        <span className="text-[11px] font-medium text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
          {formatAppVersion()}
        </span>
      </div>
      <p className="text-sm text-slate-500 mb-4">
        Overview of employee activity, project status, and site configuration.
      </p>

      {/* Top-level tabs: Dashboard / Settings */}
      <div className="flex border-b border-slate-200 mb-6">
        <button
          onClick={() => setTopTab("dashboard")}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors ${
            topTab === "dashboard"
              ? "text-brand border-b-2 border-brand"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <LayoutDashboard size={16} /> Dashboard
        </button>
        {isOwner && (
          <button
            onClick={() => setTopTab("settings")}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors ${
              topTab === "settings"
                ? "text-brand border-b-2 border-brand"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Settings size={16} /> Site Settings
          </button>
        )}
      </div>

      {topTab === "dashboard" && <AdminDashboardView />}

      {topTab === "settings" && isOwner && (
        <>
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
            {settingsTabs.map((t) => (
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
                {typeof t.count === "number" && (
                  <span className="ml-1.5 text-[10px] bg-slate-100 text-slate-600 rounded-full px-1.5 py-0.5">
                    {t.count}
                  </span>
                )}
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
          {activeTab === "admins" && (
            <BoardAdminsTable
              emails={boardAdminEmails}
              onChange={setBoardAdminEmails}
            />
          )}
          {activeTab === "email" && (
            <EmailTemplatesTab
              form={notifForm}
              onPatchTemplate={patchTemplate}
              saving={emailSaving}
              err={emailErr}
              ok={emailOk}
              onSave={() => void saveEmail()}
              onReload={() => void loadEmail()}
            />
          )}
          {activeTab === "notifications" && (
            <NotificationTogglesTab
              form={notifForm}
              onPatch={patchNotif}
              onToggle={toggleCategory}
              saving={emailSaving}
              err={emailErr}
              ok={emailOk}
              onSave={() => void saveEmail()}
              onReload={() => void loadEmail()}
            />
          )}
          {activeTab === "danger" && (
            <DangerZoneTab
              confirmText={resetConfirm}
              onConfirmText={setResetConfirm}
              resetting={resetting}
              err={resetErr}
              ok={resetOk}
              onReset={() => void resetBoard()}
            />
          )}

          {!hideRosterSave && (
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
          )}
        </>
      )}
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
    const label = managers[i]?.name?.trim() || "this project manager";
    if (!confirm(`Remove ${label} from the list?`)) return;
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
    const label = directors[i]?.chartLabel?.trim() || directors[i]?.name?.trim() || "this project director";
    if (!confirm(`Remove ${label} from the list?`)) return;
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
    const label = rows[i]?.displayName?.trim() || "this row";
    if (!confirm(`Remove ${label} from the office directory?`)) return;
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

function BoardAdminsTable({
  emails,
  onChange
}: {
  emails: string[];
  onChange: (next: string[]) => void;
}) {
  function add() {
    onChange([...emails, ""]);
  }
  function update(i: number, value: string) {
    const next = [...emails];
    next[i] = value;
    onChange(next);
  }
  function remove(i: number) {
    const label = emails[i]?.trim() || "this admin";
    if (!confirm(`Remove ${label} from board admins?`)) return;
    onChange(emails.filter((_, j) => j !== i));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-500">
          Board admins can see and edit all projects. Add emails of users who should have full access.
        </p>
        <button type="button" onClick={add} className="btn-primary text-xs inline-flex items-center gap-1">
          <Plus size={14} /> Add admin
        </button>
      </div>
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="text-left px-3 py-2 font-medium w-8">#</th>
              <th className="text-left px-3 py-2 font-medium">Email</th>
              <th className="w-12" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {emails.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-xs text-slate-400">
                  No board admins configured. Click &quot;Add admin&quot; to add one.
                </td>
              </tr>
            )}
            {emails.map((email, i) => (
              <tr key={i} className="group">
                <td className="px-3 py-1 text-xs text-slate-400">{i + 1}</td>
                <td className="px-2 py-1">
                  <input
                    value={email}
                    onChange={(e) => update(i, e.target.value)}
                    className="w-full border border-slate-200 rounded px-2 py-1 text-xs font-mono focus:ring-1 focus:ring-brand outline-none"
                    placeholder="email@geoconinc.com"
                  />
                </td>
                <td className="px-1 py-1">
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove admin"
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

interface EmailTabShared {
  saving: boolean;
  err: string | null;
  ok: string | null;
  onSave: () => void;
  onReload: () => void;
}

function EmailSaveBar({ saving, err, ok, onSave, onReload }: EmailTabShared) {
  return (
    <>
      {err && <p className="text-sm text-red-600 mt-4">{err}</p>}
      {ok && <p className="text-sm text-green-700 mt-4">{ok}</p>}
      <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="btn-primary text-sm inline-flex items-center gap-2 disabled:opacity-50"
        >
          <Save size={16} /> {saving ? "Saving…" : "Save changes"}
        </button>
        <button type="button" onClick={onReload} className="btn-ghost text-sm" disabled={saving}>
          Reload
        </button>
      </div>
    </>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  mono = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  mono?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-brand outline-none ${
          mono ? "font-mono" : ""
        }`}
      />
    </label>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 py-2.5 cursor-pointer">
      <span className="min-w-0">
        <span className="text-sm font-medium text-slate-800 block">{label}</span>
        {description && <span className="text-xs text-slate-500">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`shrink-0 mt-0.5 relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          checked ? "bg-brand" : "bg-slate-300"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}

function EmailTemplatesTab({
  form,
  onPatchTemplate,
  saving,
  err,
  ok,
  onSave,
  onReload
}: EmailTabShared & {
  form: NotificationConfigAdminView | null;
  onPatchTemplate: (key: EmailTemplateKey, patch: Partial<EmailTemplate>) => void;
}) {
  if (!form) return <p className="text-sm text-slate-500">Loading templates…</p>;

  return (
    <div className="max-w-3xl">
      <p className="text-xs text-slate-500 mb-4">
        Edit the subject and wording of each notification email. Use the{" "}
        <code className="font-mono">{"{{token}}"}</code> placeholders — they are replaced with the
        real values (recipient name, project code, due date, …) when the email is sent. Clear a
        field to fall back to the built-in default. The Geocon header, button, and footer are added
        automatically.
      </p>

      <div className="space-y-5">
        {EMAIL_TEMPLATE_DEFS.map((def) => {
          const current = form.templates[def.key] ?? def.default;
          const isDefault =
            current.subject === def.default.subject && current.body === def.default.body;
          return (
            <fieldset key={def.key} className="border border-slate-200 rounded-lg p-4">
              <legend className="text-xs font-semibold text-slate-700 px-1">{def.label}</legend>
              <p className="text-xs text-slate-500 mb-3">{def.description}</p>

              <div className="mb-3 flex flex-wrap gap-1.5">
                {def.tokens.map((t) => (
                  <span
                    key={t.name}
                    title={t.description}
                    className="font-mono text-[10px] bg-slate-100 text-slate-600 rounded px-1.5 py-0.5"
                  >
                    {`{{${t.name}}}`}
                  </span>
                ))}
              </div>

              <LabeledInput
                label="Subject"
                value={current.subject}
                onChange={(v) => onPatchTemplate(def.key, { subject: v })}
                placeholder={def.default.subject}
              />

              <label className="block mt-3">
                <span className="text-xs font-medium text-slate-600">Body</span>
                <textarea
                  value={current.body}
                  onChange={(e) => onPatchTemplate(def.key, { body: e.target.value })}
                  rows={6}
                  placeholder={def.default.body}
                  className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm font-mono focus:ring-1 focus:ring-brand outline-none"
                />
              </label>

              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {isDefault ? "Using default wording" : "Customized"}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onPatchTemplate(def.key, {
                      subject: def.default.subject,
                      body: def.default.body
                    })
                  }
                  disabled={isDefault}
                  className="text-xs text-slate-500 hover:text-brand disabled:opacity-40"
                >
                  Reset to default
                </button>
              </div>
            </fieldset>
          );
        })}
      </div>

      <EmailSaveBar saving={saving} err={err} ok={ok} onSave={onSave} onReload={onReload} />
    </div>
  );
}

function NotificationTogglesTab({
  form,
  onPatch,
  onToggle,
  saving,
  err,
  ok,
  onSave,
  onReload
}: EmailTabShared & {
  form: NotificationConfigAdminView | null;
  onPatch: (patch: Partial<NotificationConfigAdminView>) => void;
  onToggle: (key: NotificationCategory, value: boolean) => void;
}) {
  if (!form) return <p className="text-sm text-slate-500">Loading notification settings…</p>;

  return (
    <div className="max-w-2xl">
      <div className="rounded-lg border border-slate-200 p-4 mb-4">
        <ToggleRow
          label="Email notifications"
          description="Master switch. When off, no emails are sent (in-app notifications still work)."
          checked={form.emailEnabled}
          onChange={(v) => onPatch({ emailEnabled: v })}
        />
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 mb-4">
        <ToggleRow
          label="Test mode (safe for going live)"
          description="Emails are still generated and sent, but every one is redirected to the test recipients below instead of real employees. The intended recipient is shown in the subject."
          checked={form.testMode}
          onChange={(v) => onPatch({ testMode: v })}
        />
        <label className="block mt-3">
          <span className="text-xs font-medium text-slate-600">Test recipients</span>
          <input
            type="text"
            value={form.testRecipients.join(", ")}
            onChange={(e) =>
              onPatch({
                testRecipients: e.target.value
                  .split(",")
                  .map((r) => r.trim())
                  .filter((r) => r.length > 0)
              })
            }
            placeholder="you@geoconinc.com, colleague@geoconinc.com"
            className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm font-mono focus:ring-1 focus:ring-brand outline-none"
          />
          <span className="text-[11px] text-slate-400">
            Comma-separated. Defaults to the app owner if left blank.
          </span>
        </label>
        {form.testMode && (
          <p className="mt-3 text-xs font-medium text-amber-800">
            Test mode is ON — no real employees will receive emails, even ones triggered by GMS.
          </p>
        )}
      </div>

      <div className={form.emailEnabled ? "" : "opacity-50 pointer-events-none"}>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
          Instant emails (sent as things happen)
        </p>
        <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 px-4 mb-5">
          {NOTIFICATION_CATEGORIES.filter((c) => !CRON_CATEGORIES.has(c.key)).map((c) => (
            <ToggleRow
              key={c.key}
              label={c.label}
              description={c.description}
              checked={form.eventToggles[c.key] !== false}
              onChange={(v) => onToggle(c.key, v)}
            />
          ))}
        </div>

        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
          Scheduled reminders (sent by the cron jobs)
        </p>
        <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 px-4">
          {NOTIFICATION_CATEGORIES.filter((c) => CRON_CATEGORIES.has(c.key)).map((c) => (
            <ToggleRow
              key={c.key}
              label={c.label}
              description={c.description}
              checked={form.eventToggles[c.key] !== false}
              onChange={(v) => onToggle(c.key, v)}
            />
          ))}
        </div>
      </div>

      <EmailSaveBar saving={saving} err={err} ok={ok} onSave={onSave} onReload={onReload} />
    </div>
  );
}

function DangerZoneTab({
  confirmText,
  onConfirmText,
  resetting,
  err,
  ok,
  onReset
}: {
  confirmText: string;
  onConfirmText: (value: string) => void;
  resetting: boolean;
  err: string | null;
  ok: string | null;
  onReset: () => void;
}) {
  const ready = confirmText === "RESET";

  return (
    <div className="max-w-xl">
      <div className="rounded-lg border border-red-200 bg-red-50/70 p-5">
        <div className="flex items-start gap-3 mb-3">
          <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={18} />
          <div>
            <h2 className="text-sm font-semibold text-red-800">Reset board for production</h2>
            <p className="text-xs text-red-700/90 mt-1 leading-relaxed">
              Permanently deletes <strong>all projects</strong>, checklist items, and uploaded files,
              and clears the activity log. Use this once before go-live so the board starts empty.
            </p>
            <p className="text-xs text-red-700/90 mt-2">
              Kept: users, login sessions, office directory, admins, and email/notification settings.
            </p>
          </div>
        </div>

        <label className="block mt-4">
          <span className="text-xs font-medium text-red-800">
            Type <code className="font-mono bg-white/80 px-1 rounded">RESET</code> to confirm
          </span>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => onConfirmText(e.target.value)}
            placeholder="RESET"
            autoComplete="off"
            className="mt-1 w-full border border-red-200 rounded px-2 py-1.5 text-sm font-mono focus:ring-1 focus:ring-red-400 outline-none bg-white"
          />
        </label>

        {err && <p className="text-sm text-red-700 mt-3">{err}</p>}
        {ok && <p className="text-sm text-green-800 mt-3">{ok}</p>}

        <button
          type="button"
          onClick={onReset}
          disabled={!ready || resetting}
          className="mt-4 inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:hover:bg-red-600"
        >
          <Trash2 size={16} />
          {resetting ? "Resetting…" : "Delete all projects"}
        </button>
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
