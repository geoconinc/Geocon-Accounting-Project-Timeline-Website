"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, FolderOpen, X } from "lucide-react";

interface ProjectLed {
  id: string;
  code: string;
  name: string;
  status: string;
  office: string | null;
  roles: string[];
}

interface EmployeeTask {
  id: string;
  name: string;
  status: string;
  dueDate: string | null;
  projectId: string;
  projectCode: string;
  projectName: string;
}

interface EmployeeActivity {
  id: string;
  action: string;
  entityType: string;
  createdAt: string;
  entityName: string;
}

interface EmployeeDetail {
  employee: {
    id: string;
    name: string;
    initials: string;
    lastLoginAt: string | null;
    activeNow: boolean;
  };
  projectsLed: ProjectLed[];
  tasks: EmployeeTask[];
  activity: EmployeeActivity[];
}

export function EmployeeDetailModal({
  employeeId,
  employeeName,
  onClose
}: {
  employeeId: string;
  employeeName: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`/api/admin/employees/${employeeId}`);
        if (!res.ok) throw new Error(`Load failed (${res.status})`);
        const json = (await res.json()) as EmployeeDetail;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  const emp = data?.employee;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 grid place-items-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-6 border-b border-slate-100 sticky top-0 bg-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full bg-brand text-white grid place-items-center text-sm font-semibold shrink-0">
              {emp?.initials ?? employeeName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-brand-dark truncate">
                {emp?.name ?? employeeName}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                {emp?.activeNow ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active now
                  </span>
                ) : (
                  <span>Last login: {emp?.lastLoginAt ? formatRelative(emp.lastLoginAt) : "Never"}</span>
                )}
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {loading && <p className="text-sm text-slate-500">Loading…</p>}
          {err && <p className="text-sm text-red-600">{err}</p>}

          {data && (
            <>
              <Section title="Projects" icon={<FolderOpen size={15} />} count={data.projectsLed.length}>
                {data.projectsLed.length === 0 ? (
                  <Empty>No projects led.</Empty>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {data.projectsLed.map((p) => (
                      <li key={p.id} className="py-2 flex items-center gap-3">
                        <Link
                          href={`/?focusProject=${p.id}`}
                          className="min-w-0 flex-1 group"
                          title="Open on the board"
                        >
                          <span className="text-sm font-medium text-slate-800 group-hover:text-brand truncate block">
                            <span className="font-mono text-xs text-slate-400 mr-1.5">{p.code}</span>
                            {p.name}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {p.roles.join(", ")}
                            {p.office ? ` · ${p.office}` : ""}
                          </span>
                        </Link>
                        <StatusPill status={p.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="Assigned tasks" icon={<Clock size={15} />} count={data.tasks.length}>
                {data.tasks.length === 0 ? (
                  <Empty>No tasks assigned.</Empty>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {data.tasks.map((t) => (
                      <li key={t.id} className="py-2 flex items-center gap-3">
                        <Link href={`/?focusProject=${t.projectId}`} className="min-w-0 flex-1 group">
                          <span className="text-sm text-slate-800 group-hover:text-brand truncate block">
                            {t.name}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            <span className="font-mono">{t.projectCode}</span> · {t.projectName}
                            {t.dueDate ? ` · due ${t.dueDate}` : ""}
                          </span>
                        </Link>
                        <StatusPill status={t.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="Recent activity" icon={<CheckCircle2 size={15} />} count={data.activity.length}>
                {data.activity.length === 0 ? (
                  <Empty>No recent activity.</Empty>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {data.activity.map((a) => (
                      <li key={a.id} className="py-2 flex items-center justify-between gap-3">
                        <span className="text-sm text-slate-700 truncate">
                          <span className="capitalize font-medium">{a.action}</span>{" "}
                          <span className="text-slate-400 capitalize">{a.entityType}</span> {a.entityName}
                        </span>
                        <span className="text-[11px] text-slate-400 whitespace-nowrap">
                          {formatRelative(a.createdAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  count,
  children
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 text-slate-700">
        <span className="text-brand">{icon}</span>
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-[10px] bg-slate-100 text-slate-600 rounded-full px-1.5 py-0.5">{count}</span>
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-slate-400 py-2">{children}</p>;
}

function StatusPill({ status }: { status: string }) {
  const completed = status === "Completed" || status === "NA";
  return (
    <span
      className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${
        completed
          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
          : "bg-amber-50 text-amber-700 border-amber-100"
      }`}
    >
      {status}
    </span>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
