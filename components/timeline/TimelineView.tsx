"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from "date-fns";
import { loadDb } from "@/lib/demo/localStore";
import type { Project } from "@/lib/types";
import { projectColors } from "@/components/board/StatusCell";
import { Avatar } from "@/components/board/Avatar";

const DAY_W = 28;
const WINDOW_DAYS = 60;

export function TimelineView() {
  const [db, setDb] = useState(() => loadDb());
  const [anchor, setAnchor] = useState(() => startOfWeek(addDays(new Date(), -14)));

  useEffect(() => {
    const onChange = () => setDb(loadDb());
    window.addEventListener("geocon-demo-change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("geocon-demo-change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const days = useMemo(
    () => Array.from({ length: WINDOW_DAYS }, (_, i) => addDays(anchor, i)),
    [anchor]
  );

  const months: { label: string; span: number; start: number }[] = useMemo(() => {
    const result: { label: string; span: number; start: number }[] = [];
    days.forEach((d, i) => {
      const label = format(d, "MMMM yyyy");
      const last = result[result.length - 1];
      if (last && last.label === label) last.span += 1;
      else result.push({ label, span: 1, start: i });
    });
    return result;
  }, [days]);

  const projects = db.projects.filter((p) => p.timelineStart || p.timelineEnd);

  return (
    <div className="p-6 overflow-auto h-full">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-brand-dark">Timeline</h1>
          <p className="text-sm text-slate-500">All projects across the next 60 days.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setAnchor((a) => addDays(a, -14))}
            className="btn-ghost text-sm"
          >
            ← 2 weeks
          </button>
          <button
            onClick={() => setAnchor(startOfWeek(addDays(new Date(), -14)))}
            className="btn-ghost text-sm"
          >
            Today
          </button>
          <button
            onClick={() => setAnchor((a) => addDays(a, 14))}
            className="btn-ghost text-sm"
          >
            2 weeks →
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-sm text-slate-500 text-center">
          No projects with a timeline yet. Set Start Date and Timeline on a project to see it here.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto scrollbar-thin">
          <div className="min-w-max">
            <div className="flex sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
              <div className="w-64 shrink-0 border-r border-slate-200" />
              <div className="flex flex-col">
                <div className="flex">
                  {months.map((m, i) => (
                    <div
                      key={i}
                      className="text-[11px] font-semibold text-slate-600 border-r border-slate-200 px-2 py-1"
                      style={{ width: m.span * DAY_W }}
                    >
                      {m.label}
                    </div>
                  ))}
                </div>
                <div className="flex">
                  {days.map((d, i) => {
                    const isToday = differenceInCalendarDays(d, new Date()) === 0;
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <div
                        key={i}
                        className={`text-[10px] text-center border-r border-slate-100 py-1 ${
                          isToday ? "bg-brand text-white font-semibold" : isWeekend ? "bg-slate-50 text-slate-400" : "text-slate-500"
                        }`}
                        style={{ width: DAY_W }}
                      >
                        {format(d, "d")}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            {projects.map((p) => (
              <TimelineRow key={p.id} project={p} days={days} users={db.users} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineRow({
  project,
  days,
  users
}: {
  project: Project;
  days: Date[];
  users: { id: string; name: string; email: string; initials: string }[];
}) {
  const owner = users.find((u) => u.id === project.ownerId);
  const start = project.timelineStart ? parseISO(project.timelineStart) : null;
  const end = project.timelineEnd ? parseISO(project.timelineEnd) : start;

  let barLeft = 0;
  let barWidth = 0;
  if (start && end) {
    const startIdx = differenceInCalendarDays(start, days[0]);
    const endIdx = differenceInCalendarDays(end, days[0]);
    const clampedStart = Math.max(0, startIdx);
    const clampedEnd = Math.min(days.length - 1, endIdx);
    if (clampedEnd >= 0 && clampedStart <= days.length - 1) {
      barLeft = clampedStart * DAY_W;
      barWidth = Math.max(DAY_W, (clampedEnd - clampedStart + 1) * DAY_W);
    }
  }

  return (
    <div className="flex border-b border-slate-100 hover:bg-slate-50">
      <div className="w-64 shrink-0 border-r border-slate-200 p-2 flex items-center gap-2">
        <Avatar user={owner ? { ...owner, createdAt: "" } : null} size={24} />
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-medium truncate">{project.code}</span>
          <span className="text-[11px] text-slate-500 truncate">{project.name}</span>
        </div>
      </div>
      <div className="relative" style={{ width: days.length * DAY_W, height: 36 }}>
        {days.map((d, i) => {
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          return (
            <div
              key={i}
              className={`absolute top-0 bottom-0 border-r border-slate-100 ${
                isWeekend ? "bg-slate-50/60" : ""
              }`}
              style={{ left: i * DAY_W, width: DAY_W }}
            />
          );
        })}
        {barWidth > 0 && (
          <div
            className={`${projectColors[project.status]} absolute top-2 bottom-2 rounded-md text-white text-[10px] font-semibold flex items-center px-2 truncate shadow-sm`}
            style={{ left: barLeft, width: barWidth }}
            title={`${project.code} · ${project.name}`}
          >
            {project.name}
          </div>
        )}
      </div>
    </div>
  );
}
