"use client";

import { useEffect, useState } from "react";
import { loadDb } from "@/lib/demo/localStore";
import { DEMO_MODE } from "@/lib/demo/config";
import type { Project, ProjectStatus, Subitem, SubitemStatus, User } from "@/lib/types";
import type { BoardData } from "@/components/features/board/state";
import { projectColors, projectLabel, subColors, subLabel } from "@/components/features/board/StatusCell";
import { Avatar } from "@/components/features/board/Avatar";
import { formatRelativeTime } from "@/lib/utils";
import { differenceInCalendarDays, format, isValid, parse, parseISO } from "date-fns";
import { AlertTriangle, CheckCircle2, Clock, FolderOpen } from "lucide-react";

const projectStatuses: ProjectStatus[] = ["New", "InProgress", "Completed", "Missing", "Future"];
const subStatuses: SubitemStatus[] = ["Completed", "InProgress", "Missing", "NotStarted", "NA"];

function safeParseDateStr(v: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const d = parse(v, "yyyy-MM-dd", new Date());
    return isValid(d) ? d : new Date(v);
  }
  return parseISO(v);
}

export function DashboardView() {
  const [projects, setProjects] = useState<Project[]>(() =>
    DEMO_MODE ? loadDb().projects : []
  );
  const [subitems, setSubitems] = useState<Subitem[]>(() =>
    DEMO_MODE ? loadDb().subitems : []
  );
  const [users, setUsers] = useState<User[]>(() =>
    DEMO_MODE ? loadDb().users : []
  );
  const [loading, setLoading] = useState(!DEMO_MODE);

  useEffect(() => {
    if (DEMO_MODE) {
      const refresh = () => {
        const db = loadDb();
        setProjects(db.projects);
        setSubitems(db.subitems);
        setUsers(db.users);
      };
      refresh();
      window.addEventListener("geocon-demo-change", refresh);
      window.addEventListener("storage", refresh);
      return () => {
        window.removeEventListener("geocon-demo-change", refresh);
        window.removeEventListener("storage", refresh);
      };
    }

    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/projects");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as BoardData;
        setProjects(data.projects);
        setSubitems(data.subitems);
        setUsers(data.users);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <div className="p-8 text-slate-500 text-sm">Loading dashboard...</div>;
  }

  const today = new Date();

  const projByStatus = projectStatuses.map((s) => ({
    status: s,
    count: projects.filter((p) => p.status === s).length
  }));
  const subByStatus = subStatuses.map((s) => ({
    status: s,
    count: subitems.filter((x) => x.status === s).length
  }));
  const totalCounted = subitems.filter((s) => s.status !== "NA").length;
  const completedCounted = subitems.filter((s) => s.status === "Completed").length;
  const completionPct = totalCounted ? Math.round((completedCounted / totalCounted) * 100) : 0;

  const dueSoon = subitems
    .filter((s) => s.dueDate && s.status !== "Completed" && s.status !== "NA")
    .map((s) => ({
      sub: s,
      project: projects.find((p) => p.id === s.projectId)!,
      days: differenceInCalendarDays(safeParseDateStr(s.dueDate!), today)
    }))
    .filter((x) => x.project)
    .sort((a, b) => a.days - b.days)
    .slice(0, 6);

  const overdue = dueSoon.filter((x) => x.days < 0).length;
  const recent = [...projects]
    .sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime())
    .slice(0, 5);

  return (
    <div className="p-6 overflow-auto h-full">
      <div className="mb-6 flex items-center gap-3">
        <img
          src="/logo.png"
          alt="Geocon"
          className="w-12 h-12 rounded-lg bg-white border border-slate-200 p-1.5 shadow-sm"
        />
        <div>
          <h1 className="text-xl font-semibold text-brand-dark">Dashboard</h1>
          <p className="text-sm text-slate-500">A quick view of project health across the team.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<FolderOpen size={18} />}
          label="Total projects"
          value={projects.length}
          accent="bg-brand"
        />
        <StatCard
          icon={<Clock size={18} />}
          label="In progress"
          value={projects.filter((p) => p.status === "InProgress").length}
          accent="bg-status-progress"
        />
        <StatCard
          icon={<CheckCircle2 size={18} />}
          label="Subitem completion"
          value={`${completionPct}%`}
          subtext={`${completedCounted}/${totalCounted}`}
          accent="bg-status-completed"
        />
        <StatCard
          icon={<AlertTriangle size={18} />}
          label="Overdue subitems"
          value={overdue}
          accent="bg-status-missing"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card title="Projects by status">
          <div className="flex flex-col gap-2">
            {projByStatus.map((row) => (
              <BarRow
                key={row.status}
                label={projectLabel[row.status]}
                count={row.count}
                total={projects.length}
                color={projectColors[row.status]}
              />
            ))}
          </div>
        </Card>
        <Card title="Subitems by status">
          <div className="flex flex-col gap-2">
            {subByStatus.map((row) => (
              <BarRow
                key={row.status}
                label={subLabel[row.status]}
                count={row.count}
                total={subitems.length}
                color={subColors[row.status]}
              />
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Coming up / overdue">
          {dueSoon.length === 0 ? (
            <p className="text-xs text-slate-400">No upcoming or overdue subitems.</p>
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
                      days < 0
                        ? "text-red-600"
                        : days === 0
                          ? "text-amber-600"
                          : "text-slate-500"
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
        <Card title="Recently updated">
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
    <div className="bg-white rounded-lg border border-slate-200 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-md text-white grid place-items-center ${accent}`}>
        {icon}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[11px] uppercase tracking-wide text-slate-500">{label}</span>
        <span className="text-2xl font-semibold text-brand-dark leading-tight">{value}</span>
        {subtext && <span className="text-[11px] text-slate-400">{subtext}</span>}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
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
        <div className={color} style={{ width: `${pct}%`, height: "100%" }} />
      </div>
    </div>
  );
}

function RecentRow({ project, users }: { project: Project; users: User[] }) {
  const owner = users.find((u) => u.id === project.ownerId) ?? null;
  return (
    <li className="py-2 flex items-center gap-3">
      <Avatar user={owner} size={26} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate">
          {project.code} · {project.name}
        </div>
        <div className="text-[11px] text-slate-500">
          {projectLabel[project.status]}
          {project.timelineStart && project.timelineEnd
            ? ` · ${format(safeParseDateStr(project.timelineStart), "MMM d")} – ${format(
                safeParseDateStr(project.timelineEnd),
                "MMM d"
              )}`
            : ""}
        </div>
      </div>
      <div className="text-[11px] text-slate-400">{formatRelativeTime(project.lastUpdatedAt)}</div>
    </li>
  );
}
