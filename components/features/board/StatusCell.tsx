"use client";

import { usePopover } from "./Popover";
import type { ProjectStatus, SubitemStatus } from "@/lib/types";

const projectColors: Record<ProjectStatus, string> = {
  New: "bg-status-new",
  Completed: "bg-status-completed",
  InProgress: "bg-status-progress",
  Missing: "bg-status-missing",
  Future: "bg-status-future"
};
const projectLabel: Record<ProjectStatus, string> = {
  New: "New",
  Completed: "Completed",
  InProgress: "In Progress",
  Missing: "Missing",
  Future: "Future"
};

const subColors: Record<SubitemStatus, string> = {
  Completed: "bg-status-completed",
  InProgress: "bg-status-progress",
  Missing: "bg-status-missing",
  NotStarted: "bg-status-notstarted",
  NA: "bg-status-na"
};
const subLabel: Record<SubitemStatus, string> = {
  Completed: "Completed",
  InProgress: "In Progress",
  Missing: "Missing",
  NotStarted: "Not Started",
  NA: "N/A"
};

export function ProjectStatusCell({
  value,
  onChange,
  readOnly = false
}: {
  value: ProjectStatus;
  onChange: (s: ProjectStatus) => void;
  readOnly?: boolean;
}) {
  const { open, setOpen, ref } = usePopover();
  const opts: ProjectStatus[] = ["New", "InProgress", "Completed", "Missing", "Future"];
  return (
    <div className="relative w-full h-full" ref={ref}>
      <button
        onClick={() => {
          if (!readOnly) setOpen((o) => !o);
        }}
        disabled={readOnly}
        className={`status-pill ${projectColors[value]} ${readOnly ? "cursor-default" : "hover:brightness-95"}`}
      >
        {projectLabel[value]}
      </button>
      {open && !readOnly && (
        <div className="absolute z-30 top-full left-0 mt-1 bg-white rounded-md shadow-lg border border-slate-200 py-1 min-w-[140px]">
          {opts.map((o) => (
            <button
              key={o}
              onClick={() => {
                onChange(o);
                setOpen(false);
              }}
              className="w-full px-3 py-1.5 text-left text-xs hover:bg-slate-50 flex items-center gap-2"
            >
              <span className={`inline-block w-3 h-3 rounded ${projectColors[o]}`} />
              {projectLabel[o]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SubitemStatusCell({
  value,
  onChange,
  readOnly = false
}: {
  value: SubitemStatus;
  onChange: (s: SubitemStatus) => void;
  readOnly?: boolean;
}) {
  const { open, setOpen, ref } = usePopover();
  const opts: SubitemStatus[] = ["NotStarted", "InProgress", "Completed", "Missing", "NA"];
  return (
    <div className="relative w-full h-full" ref={ref}>
      <button
        onClick={() => {
          if (!readOnly) setOpen((o) => !o);
        }}
        disabled={readOnly}
        className={`status-pill ${subColors[value]} ${readOnly ? "cursor-default" : "hover:brightness-95"}`}
      >
        {subLabel[value]}
      </button>
      {open && !readOnly && (
        <div className="absolute z-30 top-full left-0 mt-1 bg-white rounded-md shadow-lg border border-slate-200 py-1 min-w-[140px]">
          {opts.map((o) => (
            <button
              key={o}
              onClick={() => {
                onChange(o);
                setOpen(false);
              }}
              className="w-full px-3 py-1.5 text-left text-xs hover:bg-slate-50 flex items-center gap-2"
            >
              <span className={`inline-block w-3 h-3 rounded ${subColors[o]}`} />
              {subLabel[o]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { projectColors, projectLabel, subColors, subLabel };
