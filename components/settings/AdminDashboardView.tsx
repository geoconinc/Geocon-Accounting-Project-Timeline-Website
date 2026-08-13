"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FolderOpen,
  ListChecks,
  RefreshCw,
  Search,
  Target,
  Timer,
  Users,
  X
} from "lucide-react";
import type { ActivityEvent } from "@/lib/types";
import { formatDaysMetric, formatPctMetric } from "@/lib/domain/workStats";
import { EmployeeDetailModal } from "./EmployeeDetailModal";

interface EmployeeSummary {
  id: string;
  name: string;
  email: string;
  initials: string;
  ongoingCount: number;
  completedCount: number;
  assignedTasks: number;
  openTasks: number;
  completionPct: number;
  overdueCount: number;
  avgCompletionDays: number | null;
  medianCompletionDays: number | null;
  onTimePct: number | null;
  lastLoginAt: string | null;
}

const ACTIVE_LOGIN_DAYS = 5;

function loggedInWithinDays(lastLoginAt: string | null, days: number): boolean {
  if (!lastLoginAt) return false;
  const login = new Date(lastLoginAt).getTime();
  if (Number.isNaN(login)) return false;
  return login >= Date.now() - days * 24 * 60 * 60 * 1000;
}

interface AuditEntry extends ActivityEvent {
  actorName: string;
  entityName: string;
}

interface DashboardStats {
  totalProjects: number;
  ongoingTotal: number;
  completedTotal: number;
  activeEmployees: number;
  totalEmployees: number;
  assignedTasks: number;
  openTasks: number;
  completionPct: number;
  overdueCount: number;
  avgCompletionDays: number | null;
  medianCompletionDays: number | null;
  onTimePct: number | null;
}

interface DashboardData {
  stats: DashboardStats;
  employees: EmployeeSummary[];
  auditLog: AuditEntry[];
}

type StatusFilter = "all" | "active" | "inactive";

export function AdminDashboardView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeSummary | null>(null);
  const [liveActive, setLiveActive] = useState<number | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/dashboard");
      if (res.status === 403) {
        setErr("You do not have access to this page.");
        return;
      }
      if (!res.ok) throw new Error(`Load failed (${res.status})`);
      setData(await res.json());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Live count of people currently on the site via the shared SSE stream. The server
  // sends the current count on connect and broadcasts presence.update as people come/go.
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/events");
      es.addEventListener("presence.update", (ev: MessageEvent) => {
        try {
          const { count } = JSON.parse(ev.data) as { count: number };
          if (typeof count === "number") setLiveActive(count);
        } catch {
          // ignore malformed payloads
        }
      });
    } catch {
      // SSE unavailable — the live card shows a placeholder
    }
    return () => es?.close();
  }, []);

  const filteredEmployees = useMemo(() => {
    if (!data) return [];
    let list = data.employees;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) => e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q)
      );
    }
    if (statusFilter === "active") {
      list = list.filter((e) => loggedInWithinDays(e.lastLoginAt, ACTIVE_LOGIN_DAYS));
    } else if (statusFilter === "inactive") {
      list = list.filter((e) => !loggedInWithinDays(e.lastLoginAt, ACTIVE_LOGIN_DAYS));
    }
    return list;
  }, [data, search, statusFilter]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
        <div className="skeleton h-12 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (err) {
    return <div className="p-8 text-sm text-red-600">{err}</div>;
  }

  if (!data) return null;
  const { stats } = data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Company overview</h2>
        <p className="text-sm text-slate-500">
          Organization-wide project and checklist metrics. Personal dashboards only show each
          employee&apos;s own work.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={<Users size={18} />}
          value={liveActive ?? "—"}
          label="Active now"
          live
          title="People with the site open right now"
        />
        <StatCard icon={<FolderOpen size={18} />} value={stats.totalProjects} label="Total Projects" />
        <StatCard icon={<Clock size={18} />} value={stats.ongoingTotal} label="Ongoing Projects" />
        <StatCard icon={<CheckCircle2 size={18} />} value={stats.completedTotal} label="Completed Projects" />
        <StatCard icon={<Users size={18} />} value={stats.activeEmployees} label="Active (5 days)" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<ListChecks size={18} />}
          value={stats.openTasks}
          label="Open checklist tasks"
          title={`${stats.assignedTasks} total assigned`}
        />
        <StatCard icon={<AlertTriangle size={18} />} value={stats.overdueCount} label="Overdue tasks" />
        <StatCard
          icon={<Timer size={18} />}
          value={formatDaysMetric(stats.avgCompletionDays)}
          label="Avg completion time"
          title="Company mean: created → completed"
        />
        <StatCard
          icon={<Target size={18} />}
          value={formatPctMetric(stats.onTimePct)}
          label="On-time rate"
          title={`Completion rate ${stats.completionPct}% · median ${formatDaysMetric(stats.medianCompletionDays)}`}
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <span className="text-xs font-medium text-slate-500">Filter by Employee:</span>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employees…"
              className="w-full pl-8 pr-8 py-1.5 border border-slate-200 rounded-md text-sm outline-none focus:ring-1 focus:ring-brand"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Filter by Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="border border-slate-200 rounded-md text-sm px-2 py-1.5 outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="all">All Status</option>
            <option value="active">Logged in (5 days)</option>
            <option value="inactive">Not logged in (5 days)</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void load()} className="btn-primary text-xs">
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={() => setShowAuditLog((s) => !s)}
            className={`btn text-xs ${showAuditLog ? "bg-brand text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            <Activity size={14} /> {showAuditLog ? "Hide Audit Log" : "View Audit Log"}
          </button>
        </div>
      </div>

      {showAuditLog && <AuditLogPanel entries={data.auditLog} />}

      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          Employees
          <span className="ml-2 text-sm font-normal text-slate-500">
            ({filteredEmployees.length} of {stats.totalEmployees})
          </span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {filteredEmployees.map((emp) => (
            <EmployeeCard key={emp.id} employee={emp} onClick={() => setSelectedEmployee(emp)} />
          ))}
          {filteredEmployees.length === 0 && (
            <div className="col-span-full text-center py-12 text-sm text-slate-400">
              No employees match the current filters.
            </div>
          )}
        </div>
      </div>

      {selectedEmployee && (
        <EmployeeDetailModal
          employeeId={selectedEmployee.id}
          employeeName={selectedEmployee.name}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
  live = false,
  title
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  live?: boolean;
  title?: string;
}) {
  const display = typeof value === "number" ? value.toLocaleString() : value;
  return (
    <div
      className="bg-white rounded-xl border border-slate-200 p-5 card-hover flex items-center gap-4"
      title={title}
    >
      <div className="w-10 h-10 rounded-lg bg-brand text-white grid place-items-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-semibold text-brand-dark leading-tight flex items-center gap-2">
          {display}
          {live && (
            <span className="relative flex h-2.5 w-2.5" aria-label="live">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
          )}
        </div>
        <div className="text-xs text-slate-500 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function EmployeeCard({
  employee: e,
  onClick
}: {
  employee: EmployeeSummary;
  onClick: () => void;
}) {
  const lastLoginStr = e.lastLoginAt ? formatRelative(e.lastLoginAt) : "Never";

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-slate-200 p-5 card-hover cursor-pointer hover:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-slate-800 truncate">{e.name}</h3>
          <p className="text-xs text-slate-500 truncate">{e.email}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-center">
            <div className="text-lg font-bold text-brand-dark">{e.openTasks}</div>
            <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
              Open
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-brand-dark">{e.completionPct}%</div>
            <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
              Done
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-slate-500">
        <div>
          <div className="font-semibold text-slate-700">{formatDaysMetric(e.avgCompletionDays)}</div>
          <div className="text-[9px] uppercase tracking-wider text-slate-400">Avg time</div>
        </div>
        <div>
          <div className="font-semibold text-slate-700">{formatPctMetric(e.onTimePct)}</div>
          <div className="text-[9px] uppercase tracking-wider text-slate-400">On time</div>
        </div>
        <div>
          <div className={`font-semibold ${e.overdueCount ? "text-red-600" : "text-slate-700"}`}>
            {e.overdueCount}
          </div>
          <div className="text-[9px] uppercase tracking-wider text-slate-400">Overdue</div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex justify-between gap-2">
        <span>
          Projects {e.ongoingCount} open / {e.completedCount} done
        </span>
        <span>Login: {lastLoginStr}</span>
      </div>
    </button>
  );
}

function AuditLogPanel({ entries }: { entries: AuditEntry[] }) {
  const [visibleCount, setVisibleCount] = useState(25);
  const visible = entries.slice(0, visibleCount);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
        <Activity size={16} className="text-brand" />
        <h3 className="text-sm font-semibold text-slate-800">Audit Log</h3>
        <span className="ml-auto text-xs text-slate-400">{entries.length} entries</span>
      </div>
      <div className="max-h-96 overflow-y-auto scrollbar-thin">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 sticky top-0">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Time</th>
              <th className="text-left px-4 py-2 font-medium">Actor</th>
              <th className="text-left px-4 py-2 font-medium">Action</th>
              <th className="text-left px-4 py-2 font-medium">Entity</th>
              <th className="text-left px-4 py-2 font-medium">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {visible.map((entry) => (
              <tr key={entry.id} className="hover:bg-slate-50/50">
                <td className="px-4 py-2 text-slate-500 whitespace-nowrap">
                  {formatRelative(entry.createdAt)}
                </td>
                <td className="px-4 py-2 font-medium text-slate-700">{entry.actorName}</td>
                <td className="px-4 py-2">
                  <ActionBadge action={entry.action} entityType={entry.entityType} />
                </td>
                <td className="px-4 py-2 text-slate-600">
                  <span className="capitalize text-slate-400 mr-1">{entry.entityType}</span>
                  {entry.entityName}
                </td>
                <td className="px-4 py-2 text-slate-400 max-w-xs truncate">
                  {summarizePayload(entry.payload)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visibleCount < entries.length && (
          <div className="p-3 text-center border-t border-slate-100">
            <button
              onClick={() => setVisibleCount((c) => c + 25)}
              className="text-xs text-brand hover:text-brand-dark font-medium"
            >
              Show more ({entries.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ActionBadge({ action, entityType }: { action: string; entityType: string }) {
  const label = `${action} ${entityType}`;
  const colors: Record<string, string> = {
    create: "bg-slate-100 text-slate-700 border-slate-200",
    update: "bg-slate-100 text-slate-700 border-slate-200",
    delete: "bg-slate-100 text-slate-700 border-slate-200",
    upload: "bg-slate-100 text-slate-700 border-slate-200"
  };
  const cls = colors[action] ?? "bg-slate-50 text-slate-600 border-slate-200";
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border ${cls}`}>
      {label}
    </span>
  );
}

function summarizePayload(payload: Record<string, unknown>): string {
  const keys = Object.keys(payload);
  if (keys.length === 0) return "—";
  const parts = keys.slice(0, 3).map((k) => {
    const v = payload[k];
    if (typeof v === "string") return `${k}: ${v.length > 30 ? v.slice(0, 30) + "…" : v}`;
    return k;
  });
  if (keys.length > 3) parts.push(`+${keys.length - 3} more`);
  return parts.join(", ");
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
