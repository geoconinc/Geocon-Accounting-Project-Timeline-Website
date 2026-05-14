"use client";

import { format } from "date-fns";
import { Calendar } from "lucide-react";
import { usePopover } from "./Popover";

function formatShort(value: string): string {
  try {
    return format(new Date(value), "MMM d");
  } catch {
    return value;
  }
}

export function DateCell({
  value,
  onChange,
  placeholder = "Set date"
}: {
  value: string | null;
  onChange: (d: string | null) => void;
  placeholder?: string;
}) {
  const { open, setOpen, ref } = usePopover();

  return (
    <div className="relative w-full h-full" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full h-full flex items-center gap-1.5 px-2 text-[12px] text-slate-700 hover:bg-slate-50"
      >
        <Calendar size={12} className="text-slate-300" />
        {value ? (
          <span className="truncate">{formatShort(value)}</span>
        ) : (
          <span className="text-slate-300">{placeholder}</span>
        )}
      </button>
      {open && (
        <div className="absolute z-30 top-full left-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg p-2 flex items-center gap-2 min-w-[200px]">
          <input
            autoFocus
            type="date"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
            className="border border-slate-200 rounded px-2 py-1 text-xs flex-1 outline-none focus:ring-1 focus:ring-brand"
          />
          {value && (
            <button
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="text-[10px] text-slate-400 hover:text-red-500 px-1"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function DateDisplay({ value }: { value: string | null }) {
  if (!value) return <span className="text-slate-300">—</span>;
  return <span>{formatShort(value)}</span>;
}

export function TimelineCell({
  start,
  end,
  onChange
}: {
  start: string | null;
  end: string | null;
  onChange: (s: string | null, e: string | null) => void;
}) {
  const { open, setOpen, ref } = usePopover();
  const label =
    start && end
      ? `${formatShort(start)} – ${formatShort(end)}`
      : start
      ? formatShort(start)
      : null;

  return (
    <div className="relative w-full h-full" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full h-full flex items-center justify-center hover:bg-slate-50 px-1"
        title="Click to edit timeline"
      >
        {label ? (
          <span className="bg-brand-accent/15 text-brand-dark text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
            {label}
          </span>
        ) : (
          <span className="text-slate-300 text-[12px]">Set range</span>
        )}
      </button>
      {open && (
        <div className="absolute z-30 top-full left-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg p-3 flex gap-2 min-w-[260px]">
          <label className="flex flex-col text-[10px] text-slate-500 gap-1 flex-1">
            Start
            <input
              type="date"
              value={start ?? ""}
              onChange={(e) => onChange(e.target.value || null, end)}
              className="border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-brand"
            />
          </label>
          <label className="flex flex-col text-[10px] text-slate-500 gap-1 flex-1">
            End
            <input
              type="date"
              value={end ?? ""}
              onChange={(e) => onChange(start, e.target.value || null)}
              className="border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-brand"
            />
          </label>
          {(start || end) && (
            <button
              onClick={() => {
                onChange(null, null);
                setOpen(false);
              }}
              className="self-end text-[10px] text-slate-400 hover:text-red-500 pb-1"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
