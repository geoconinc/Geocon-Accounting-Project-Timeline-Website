"use client";

import { format } from "date-fns";
import { usePopover } from "./Popover";

export function DateCell({
  value,
  onChange,
  placeholder = ""
}: {
  value: string | null;
  onChange: (d: string | null) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="date"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="w-full h-full bg-transparent border-0 outline-none text-xs px-1 cursor-pointer"
      placeholder={placeholder}
    />
  );
}

export function DateDisplay({ value }: { value: string | null }) {
  if (!value) return <span className="text-slate-300">—</span>;
  try {
    return <span>{format(new Date(value), "MMM d")}</span>;
  } catch {
    return <span>{value}</span>;
  }
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
      ? `${format(new Date(start), "MMM d")} – ${format(new Date(end), "MMM d")}`
      : start
      ? format(new Date(start), "MMM d")
      : "—";

  return (
    <div className="relative w-full h-full" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full h-full flex items-center justify-center hover:bg-slate-50"
        title="Click to edit timeline"
      >
        {start || end ? (
          <span className="bg-brand-accent/20 text-brand-dark text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
            {label}
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </button>
      {open && (
        <div className="absolute z-30 top-full left-0 mt-1 bg-white border border-slate-200 rounded shadow-lg p-3 flex gap-2 min-w-[260px]">
          <label className="flex flex-col text-[10px] text-slate-500 gap-1 flex-1">
            Start
            <input
              type="date"
              value={start ?? ""}
              onChange={(e) => onChange(e.target.value || null, end)}
              className="border rounded px-2 py-1 text-xs"
            />
          </label>
          <label className="flex flex-col text-[10px] text-slate-500 gap-1 flex-1">
            End
            <input
              type="date"
              value={end ?? ""}
              onChange={(e) => onChange(start, e.target.value || null)}
              className="border rounded px-2 py-1 text-xs"
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
