"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutGrid,
  PieChart,
  CalendarRange,
  Folder,
  Settings as SettingsIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Board", icon: LayoutGrid },
  { href: "/dashboard", label: "Dashboard", icon: PieChart },
  { href: "/timeline", label: "Timeline", icon: CalendarRange },
  { href: "/documents", label: "Documents", icon: Folder },
  { href: "/settings", label: "Settings", icon: SettingsIcon }
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 bg-white border-r border-slate-200 text-slate-700 flex flex-col shrink-0">
      <div className="h-20 flex flex-col items-center justify-center gap-1.5 px-4 border-b border-slate-200">
        <Image src="/logo.png" alt="Geocon" width={140} height={36} className="h-8 w-auto" />
        <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
          Project Management
        </span>
      </div>
      <nav className="flex-1 p-2 flex flex-col gap-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                active
                  ? "bg-brand/10 text-brand-dark"
                  : "text-slate-600 hover:bg-slate-100 hover:text-brand-dark"
              )}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 text-[10px] text-slate-400 border-t border-slate-200 text-center">
        Geocon · v0.1
      </div>
    </aside>
  );
}
