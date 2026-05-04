"use client";

import { useEffect, useReducer, useRef } from "react";
import type { FileRef, Project, Subitem, User } from "@/lib/types";
import { DEMO_MODE } from "@/lib/demo/config";
import { loadDb } from "@/lib/demo/localStore";

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

function reducer(state: BoardData, a: Action): BoardData {
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
    case "deleteProject":
      return {
        ...state,
        projects: state.projects.filter((p) => p.id !== a.id),
        subitems: state.subitems.filter((s) => s.projectId !== a.id),
        files: state.files.filter((f) => !(f.parentType === "project" && f.parentId === a.id))
      };
    case "upsertSubitem": {
      const i = state.subitems.findIndex((s) => s.id === a.subitem.id);
      const subitems = [...state.subitems];
      if (i >= 0) subitems[i] = a.subitem;
      else subitems.push(a.subitem);
      return { ...state, subitems };
    }
    case "deleteSubitem":
      return { ...state, subitems: state.subitems.filter((s) => s.id !== a.id) };
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
    default:
      return state;
  }
}

function reloadFromDemoStorage(): BoardData {
  const db = loadDb();
  const me = db.users[0]?.id ?? "demo-user";
  return {
    projects: db.projects,
    subitems: db.subitems,
    users: db.users,
    files: db.files,
    me
  };
}

export function useBoardState(initial: BoardData) {
  const [state, dispatch] = useReducer(reducer, initial);
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  useEffect(() => {
    if (DEMO_MODE) {
      dispatchRef.current({ type: "set", data: reloadFromDemoStorage() });
      const onChange = () =>
        dispatchRef.current({ type: "set", data: reloadFromDemoStorage() });
      window.addEventListener("geocon-demo-change", onChange);
      window.addEventListener("storage", onChange);
      return () => {
        window.removeEventListener("geocon-demo-change", onChange);
        window.removeEventListener("storage", onChange);
      };
    }

    const es = new EventSource("/api/events");
    const refetch = async () => {
      const res = await fetch(`/api/projects`);
      if (!res.ok) return;
      const data = (await res.json()) as BoardData;
      dispatchRef.current({ type: "set", data });
    };

    es.addEventListener("project.upsert", refetch);
    es.addEventListener("project.delete", (ev: MessageEvent) => {
      const { id } = JSON.parse(ev.data) as { id: string };
      dispatchRef.current({ type: "deleteProject", id });
    });
    es.addEventListener("subitem.upsert", refetch);
    es.addEventListener("subitem.delete", (ev: MessageEvent) => {
      const { id } = JSON.parse(ev.data) as { id: string };
      dispatchRef.current({ type: "deleteSubitem", id });
    });
    es.addEventListener("subitem.reorder", refetch);
    es.addEventListener("file.added", refetch);
    return () => es.close();
  }, []);

  return { state, dispatch };
}
