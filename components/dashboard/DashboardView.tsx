"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Project, ProjectStatus, Subitem, SubitemStatus, User } from "@/lib/types";
import type { BoardData } from "@/components/features/board/state";
import { projectColors, projectLabel, subColors, subLabel } from "@/components/features/board/StatusCell";
import { Avatar } from "@/components/features/board/Avatar";
import { debounce, formatRelativeTime } from "@/lib/utils";
import { format } from "date-fns";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  FolderOpen,
  ListChecks,
  Target,
  Timer
} from "lucide-react";
import {
  computeWorkStats,
  daysUntilDue,
  formatDaysMetric,
  formatPctMetric,
  parseWorkDate,
  projectsForUser,
  subitemsForUser
} from "@/lib/domain/workStats";

const projectStatuses: ProjectStatus[] = ["New", "InProgress", "Completed", "Missing", "Future"];
const subStatuses: SubitemStatus[] = ["Completed", "InProgress", "Missing", "NotStarted", "NA"];

export function DashboardView({ initialData }: { initialData?: BoardData }) {
  const [projects, setProjects] = useState<Project[]>(initialData?.projects ?? []);
  const [subitems, setSubitems] = useState<Subitem[]>(initialData?.subitems ?? []);
  const [users, setUsers] = useState<User[]>(initialData?.users ?? []);
  const [meId, setMeId] = useState(initialData?.me ?? "");
  const [isAdmin, setIsAdmin] = useState(Boolean(initialData?.isAdmin));
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  const cancelledRef = useRef(false);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/projects?includeFiles=false");
      if (cancelledRef.current) return;
      if (!res.ok) return;
      const data = (await res.json()) as BoardData;
      setProjects(data.projects);
      setSubitems(data.subitems);
      setUsers(data.users);
      setMeId(data.me);
      setIsAdmin(Boolean(data.isAdmin));
      setError(null);
    } catch {
      /* ignore background refresh errors */
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;

    if (!initialData) {
      refetch().finally(() => {
        if (!cancelledRef.current) setLoading(false);
      });
    }

    const scheduleRefetch = debounce(() => void refetch(), 400);

    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/events");
      es.addEventListener("project.upsert", scheduleRefetch);
      es.addEventListener("project.delete", scheduleRefetch);
      es.addEventListener("subitem.upsert", scheduleRefetch);
      es.addEventListener("subitem.delete", scheduleRefetch);
      es.addEventListener("subitem.reorder", scheduleRefetch);
    } catch {
      /* SSE not available */
    }

    const poll = setInterval(() => void refetch(), 30_000);

    return () => {
      cancelledRef.current = true;
      es?.close();
      clearInterval(poll);
    };
  }, [initialData, refetch]);

  const mySubitems = useMemo(
    () => (meId ? subitemsForUser(subitems, meId) : []),
    [subitems, meId]
  );
  const myProjects = useMemo(
    () => (meId ? projectsForUser(projects, meId, mySubitems) : []),
    [projects, meId, mySubitems]
  );
  const me = useMemo(() => users.find((u) => u.id === meId) ?? null, [users, meId]);

  const stats = useMemo(() => computeWorkStats(mySubitems), [mySubitems]);

  const dueSoon = useMemo(() => {
    const today = new Date();
    return mySubitems
      .map((s) => {
        const days = daysUntilDue(s, today);
        if (days === null) return null;
        const project = myProjects.find((p) => p.id === s.projectId);
        if (!project) return null;
        return { sub: s, project, days };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x))
      .sort((a, b) => a.days - b.days)
      .slice(0, 8);
  }, [mySubitems, myProjects]);

  const recent = useMemo(
    () =>
      [...myProjects]
        .sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime())
        .slice(0, 5),
    [myProjects]
  );

  const projByStatus = useMemo(
    () =>
      projectStatuses.map((s) => ({
        status: s,
        count: myProjects.filter((p) => p.status === s).length
      })),
    [myProjects]
  );

  const subByStatus = useMemo(
    () =>
      subStatuses.map((s) => ({
        status: s,
        count: stats.byStatus.find((row) => row.status === s)?.count ?? 0
      })),
    [stats.byStatus]
  );

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="skeleton w-12 h-12 rounded-lg" />
          <div className="space-y-2">
            <div className="skeleton w-28 h-5" />
            <div className="skeleton w-48 h-3" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-20 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="skeleton h-48 rounded-lg" />
          <div className="skeleton h-48 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="p-6 overflow-auto h-full">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 p-1.5 shadow-sm grid place-items-center">
            <Image src="/logo.png" alt="Geocon" width={36} height={13} priority />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-brand-dark">My dashboard</h1>
            <p className="text-sm text-slate-500">
              {me ? `Your assigned work, ${me.name.split(" ")[0]}.` : "Your assigned checklist work."}
            </p>
          </div>
        </div>
        {isAdmin ? (
          <Link
            href="/settings/admin"
            className="text-xs font-medium text-brand hover:text-brand-dark px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
          >
            Company-wide stats →
          </Link>
        ) : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 stagger-children">
        <StatCard
          icon={<ListChecks size={18} />}
          label="My open tasks"
          value={stats.openCount}
          subtext={`${stats.assignedCount} assigned`}
          accent="bg-brand"
        />
        <StatCard
          icon={<CheckCircle2 size={18} />}
          label="Completion rate"
          value={`${stats.completionPct}%`}
          subtext={`${stats.completedCount} done · ${stats.assignedCount - stats.naCount} counted`}
          accent="bg-status-completed"
        />
        <StatCard
          icon={<AlertTriangle size={18} />}
          label="Overdue"
          value={stats.overdueCount}
          subtext={stats.dueSoonCount ? `${stats.dueSoonCount} due within 7d` : "None due soon"}
          accent="bg-status-missing"
        />
        <StatCard
          icon={<FolderOpen size={18} />}
          label="My projects"
          value={myProjects.length}
          subtext={`${myProjects.filter((p) => p.status === "InProgress").length} in progress`}
          accent="bg-status-progress"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 stagger-children">
        <StatCard
          icon={<Timer size={18} />}
          label="Avg completion time"
          value={formatDaysMetric(stats.avgCompletionDays)}
          subtext="Created → completed"
          accent="bg-slate-600"
        />
        <StatCard
          icon={<Clock size={18} />}
          label="Median completion"
          value={formatDaysMetric(stats.medianCompletionDays)}
          subtext="Typical turnaround"
          accent="bg-slate-500"
        />
        <StatCard
          icon={<Target size={18} />}
          label="On-time rate"
          value={formatPctMetric(stats.onTimePct)}
          subtext={
            stats.lateCompletedCount
              ? `${stats.lateCompletedCount} finished late`
              : "Vs due date"
          }
          accent="bg-emerald-700"
        />
        <StatCard
          icon={<CalendarClock size={18} />}
          label="Due within 7 days"
          value={stats.dueSoonCount}
          subtext="Open tasks only"
          accent="bg-amber-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6 stagger-children">
        <Card title="My projects by status">
          {myProjects.length === 0 ? (
            <p className="text-xs text-slate-400">No projects linked to your assignments yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {projByStatus.map((row) => (
                <BarRow
                  key={row.status}
                  label={projectLabel[row.status]}
                  count={row.count}
                  total={myProjects.length}
                  color={projectColors[row.status]}
                />
              ))}
            </div>
          )}
        </Card>
        <Card title="My tasks by status">
          {mySubitems.length === 0 ? (
            <p className="text-xs text-slate-400">No checklist items are assigned to you.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {subByStatus.map((row) => (
                <BarRow
                  key={row.status}
                  label={subLabel[row.status]}
                  count={row.count}
                  total={mySubitems.length}
                  color={subColors[row.status]}
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 stagger-children">
        <Card title="Coming up / overdue">
          {dueSoon.length === 0 ? (
            <p className="text-xs text-slate-400">No upcoming or overdue items on your list.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-slate-100">
              {dueSoon.map(({ sub, project, days }) => (
                <li key={sub.id} className="py-2 flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${subColors[sub.status]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{sub.name}</div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {project.code} · {project.name}
                    </div>
                  </div>
                  <div
                    className={`text-[11px] font-medium ${
                      days < 0 ? "text-red-600" : days === 0 ? "text-amber-600" : "text-slate-500"
                    }`}
                  >
                    {days < 0
                      ? `${Math.abs(days)}d overdue`
                      : days === 0
                        ? "Due today"
                        : `In ${days}d`}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Recently updated (your projects)">
          {recent.length === 0 ? (
            <p className="text-xs text-slate-400">No projects yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-slate-100">
              {recent.map((p) => (
                <RecentRow key={p.id} project={p} users={users} />
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtext,
  accent
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  subtext?: string;
  accent: string;
}) {
  return (
    <div className="card-hover bg-white rounded-lg border border-slate-200 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-md text-white grid place-items-center ${accent}`}>{icon}</div>
      <div className="flex flex-col min-w-0">
        <span className="text-[11px] uppercase tracking-wide text-slate-500">{label}</span>
        <span className="text-2xl font-semibold text-brand-dark leading-tight">{value}</span>
        {subtext && <span className="text-[11px] text-slate-400 truncate">{subtext}</span>}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-hover bg-white rounded-lg border border-slate-200 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">{title}</h2>
      {children}
    </div>
  );
}

function BarRow({
  label,
  count,
  total,
  color
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">{count}</span>
      </div>
      <div className="h-2 rounded bg-slate-100 overflow-hidden">
        <div className={`${color} animate-bar-fill`} style={{ width: `${pct}%`, height: "100%" }} />
      </div>
    </div>
  );
}

function RecentRow({ project, users }: { project: Project; users: User[] }) {
  const owner = users.find((u) => u.id === project.ownerId) ?? null;
  const start = project.timelineStart ? parseWorkDate(project.timelineStart) : null;
  const end = project.timelineEnd ? parseWorkDate(project.timelineEnd) : null;
  return (
    <li className="py-2 flex items-center gap-3">
      <Avatar user={owner} size={26} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate">
          {project.code} · {project.name}
        </div>
        <div className="text-[11px] text-slate-500">
          {projectLabel[project.status]}
          {start && end ? ` · ${format(start, "MMM d")} – ${format(end, "MMM d")}` : ""}
        </div>
      </div>
      <div className="text-[11px] text-slate-400">{formatRelativeTime(project.lastUpdatedAt)}</div>
    </li>
  );
}
