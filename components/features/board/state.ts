"use client";

import { useEffect, useReducer, useRef } from "react";
import type { FileRef, Project, Subitem, User } from "@/lib/types";
import { debounce } from "@/lib/utils";

export interface BoardData {
  projects: Project[];
  subitems: Subitem[];
  users: User[];
  files: FileRef[];
  me: string;
}

type Action =
  | { type: "set"; data: BoardData }
  | { type: "upsertProject"; project: Project }
  | { type: "deleteProject"; id: string }
  | { type: "upsertSubitem"; subitem: Subitem }
  | { type: "deleteSubitem"; id: string }
  | { type: "setSubitems"; projectId: string; subitems: Subitem[] }
  | { type: "addFile"; file: FileRef }
  | { type: "deleteFile"; id: string }
  | { type: "addUser"; user: User };

export type BoardAction = Action;

/** Pure board state transitions — exported for unit tests. */
export function boardReducer(state: BoardData, a: Action): BoardData {
  switch (a.type) {
    case "set":
      return a.data;
    case "upsertProject": {
      const i = state.projects.findIndex((p) => p.id === a.project.id);
      const projects = [...state.projects];
      if (i >= 0) projects[i] = a.project;
      else projects.push(a.project);
      return { ...state, projects };
    }
    case "deleteProject": {
      const subIds = new Set(
        state.subitems.filter((s) => s.projectId === a.id).map((s) => s.id)
      );
      return {
        ...state,
        projects: state.projects.filter((p) => p.id !== a.id),
        subitems: state.subitems.filter((s) => s.projectId !== a.id),
        files: state.files.filter((f) => {
          if (f.parentType === "project" && f.parentId === a.id) return false;
          if (f.parentType === "subitem" && subIds.has(f.parentId)) return false;
          return true;
        })
      };
    }
    case "upsertSubitem": {
      const i = state.subitems.findIndex((s) => s.id === a.subitem.id);
      const subitems = [...state.subitems];
      if (i >= 0) subitems[i] = a.subitem;
      else subitems.push(a.subitem);
      return { ...state, subitems };
    }
    case "deleteSubitem":
      return {
        ...state,
        subitems: state.subitems.filter((s) => s.id !== a.id),
        files: state.files.filter((f) => !(f.parentType === "subitem" && f.parentId === a.id))
      };
    case "setSubitems": {
      const others = state.subitems.filter((s) => s.projectId !== a.projectId);
      return { ...state, subitems: [...others, ...a.subitems] };
    }
    case "addFile":
      return { ...state, files: [...state.files, a.file] };
    case "deleteFile":
      return { ...state, files: state.files.filter((f) => f.id !== a.id) };
    case "addUser": {
      if (state.users.some((u) => u.id === a.user.id)) return state;
      return { ...state, users: [...state.users, a.user] };
    }
    default: {
      const _exhaustive: never = a;
      void _exhaustive;
      return state;
    }
  }
}

const POLL_INTERVAL_MS = 30_000;

export function useBoardState(initial: BoardData) {
  const [state, dispatch] = useReducer(boardReducer, initial);
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  useEffect(() => {
    const refetch = async () => {
      try {
        const res = await fetch("/api/projects");
        if (!res.ok) return;
        const data = (await res.json()) as BoardData;
        dispatchRef.current({ type: "set", data });
      } catch {
        // network error — will retry on next poll
      }
    };

    const scheduleRefetch = debounce(() => void refetch(), 400);

    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/events");
      es.addEventListener("project.upsert", scheduleRefetch);
      es.addEventListener("project.delete", (ev: MessageEvent) => {
        const { id } = JSON.parse(ev.data) as { id: string };
        dispatchRef.current({ type: "deleteProject", id });
      });
      es.addEventListener("subitem.upsert", scheduleRefetch);
      es.addEventListener("subitem.delete", (ev: MessageEvent) => {
        const { id } = JSON.parse(ev.data) as { id: string };
        dispatchRef.current({ type: "deleteSubitem", id });
      });
      es.addEventListener("subitem.reorder", scheduleRefetch);
      es.addEventListener("file.added", scheduleRefetch);
      es.addEventListener("file.deleted", (ev: MessageEvent) => {
        const { id } = JSON.parse(ev.data) as { id: string };
        dispatchRef.current({ type: "deleteFile", id });
      });
      es.onerror = scheduleRefetch;
    } catch {
      // SSE not available (serverless) — polling only
    }

    const interval = setInterval(refetch, POLL_INTERVAL_MS);

    return () => {
      es?.close();
      clearInterval(interval);
    };
  }, []);

  return { state, dispatch };
}
