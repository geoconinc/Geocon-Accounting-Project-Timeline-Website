"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mail, Phone } from "lucide-react";
import type { User } from "@/lib/types";
import type { BoardData } from "@/components/features/board/state";
import { Avatar } from "@/components/features/board/Avatar";
import { debounce } from "@/lib/utils";

export function TeamView() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const cancelledRef = useRef(false);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/projects?includeFiles=false");
      if (!res.ok || cancelledRef.current) return;
      const data = (await res.json()) as BoardData;
      setUsers(data.users);
    } catch {
      /* ignore background refresh errors */
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    refetch().finally(() => {
      if (!cancelledRef.current) setLoading(false);
    });

    const scheduleRefetch = debounce(() => void refetch(), 400);

    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/events");
      es.addEventListener("project.upsert", scheduleRefetch);
      es.addEventListener("subitem.upsert", scheduleRefetch);
    } catch {
      /* SSE not available */
    }

    const poll = setInterval(() => void refetch(), 30_000);

    return () => {
      cancelledRef.current = true;
      es?.close();
      clearInterval(poll);
    };
  }, [refetch]);

  if (loading) {
    return <div className="p-8 text-slate-500 text-sm">Loading team...</div>;
  }

  return (
    <div className="p-6 overflow-auto h-full">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-brand-dark">Team</h1>
        <p className="text-sm text-slate-500">Everyone with access to this board.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Member</th>
              <th className="text-left px-4 py-2 font-medium">Email</th>
              <th className="text-left px-4 py-2 font-medium">Phone</th>
              <th className="text-left px-4 py-2 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-3">
                    <Avatar user={u} size={32} />
                    <span className="font-medium">{u.name}</span>
                  </div>
                </td>
                <td className="px-4 py-2 text-slate-600">
                  <a href={`mailto:${u.email}`} className="hover:text-brand inline-flex items-center gap-1">
                    <Mail size={12} /> {u.email}
                  </a>
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {u.phone ? (
                    <span className="inline-flex items-center gap-1"><Phone size={12} /> {u.phone}</span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="px-4 py-2 text-slate-500">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
