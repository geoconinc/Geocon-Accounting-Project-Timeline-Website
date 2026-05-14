"use client";

import { usePopover } from "./Popover";
import type { Subitem, SubitemStatus } from "@/lib/types";
import { subColors, subLabel } from "./StatusCell";

const order: SubitemStatus[] = ["Completed", "InProgress", "Missing", "NotStarted"];

export function SubitemsStatusCell({ subitems }: { subitems: Subitem[] }) {
  const { open, setOpen, ref } = usePopover();
  const counted = subitems.filter((s) => s.status !== "NA");
  const total = counted.length;
  const completed = counted.filter((s) => s.status === "Completed").length;
  const tooltip = total
    ? `Completed ${completed}/${total} ${Math.round((completed / total) * 100)}%`
    : "No subitems";

  if (total === 0) {
    return <div className="w-full h-full flex items-center justify-center text-slate-300">—</div>;
  }

  return (
    <div className="relative w-full h-full px-2" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full h-full flex items-center"
        title={tooltip}
      >
        <div className="flex w-full h-3 rounded overflow-hidden bg-slate-200">
          {order.map((st) => {
            const n = counted.filter((s) => s.status === st).length;
            if (!n) return null;
            const pct = (n / total) * 100;
            return <div key={st} style={{ width: `${pct}%` }} className={subColors[st]} />;
          })}
        </div>
      </button>
      {open && (
        <div className="absolute z-30 top-full left-0 mt-1 bg-white border border-slate-200 rounded shadow-lg p-2 w-72">
          <div className="text-xs font-semibold mb-1">{tooltip}</div>
          <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
            {subitems.map((s) => (
              <div key={s.id} className="flex items-center gap-2 text-xs">
                <span className={`w-3 h-3 rounded ${subColors[s.status]}`} />
                <span className="flex-1 truncate">{s.name}</span>
                <span className="text-slate-500">{subLabel[s.status]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
