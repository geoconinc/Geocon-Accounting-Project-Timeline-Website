"use client";

import type { Project, Subitem } from "@/lib/types";
import { DEMO_MODE, DEMO_USER } from "@/lib/demo/config";
import { demoStore, getCurrentDemoUserId } from "@/lib/demo/localStore";

function actorId(): string {
  return getCurrentDemoUserId() ?? DEMO_USER.id;
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) }
  });
  if (!res.ok) {
    let detail = "";
    try {
      const j = (await res.json()) as { message?: string; error?: string };
      detail = j.message ?? j.error ?? "";
    } catch {
      /* ignore */
    }
    const suffix = detail ? `: ${detail}` : "";
    throw new Error(`${url}: ${res.status}${suffix}`);
  }
  return (await res.json()) as T;
}

function notify() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("geocon-demo-change"));
  }
}

export const api = DEMO_MODE
  ? {
      patchProject: async (id: string, patch: Partial<Project>) => {
        const project = demoStore.patchProject(id, patch, actorId());
        notify();
        return { project: project! };
      },
      createProject: async (body: Partial<Project>) => {
        const project = demoStore.createProject(body, actorId());
        notify();
        return { project };
      },
      deleteProject: async (id: string) => {
        demoStore.deleteProject(id);
        notify();
        return { ok: true as const };
      },
      createSubitem: async (projectId: string, body: Partial<Subitem>) => {
        const subitem = demoStore.createSubitem(projectId, body);
        notify();
        return { subitem };
      },
      patchSubitem: async (id: string, patch: Partial<Subitem>) => {
        const subitem = demoStore.patchSubitem(id, patch);
        notify();
        return { subitem: subitem! };
      },
      deleteSubitem: async (id: string) => {
        demoStore.deleteSubitem(id);
        notify();
        return { ok: true as const };
      },
      reorderSubitems: async (projectId: string, orderedIds: string[]) => {
        demoStore.reorderSubitems(projectId, orderedIds);
        notify();
        return { ok: true as const };
      },
      requestUploadSas: async () => {
        throw new Error("Use uploadFileDemo in demo mode");
      },
      recordFile: async () => ({ file: { id: "" } }),
      fileUrl: async (id: string) => {
        const url = demoStore.getFileUrl(id);
        if (!url) throw new Error("file not found");
        return { url };
      }
    }
  : {
      patchProject: (id: string, patch: Partial<Project>) =>
        jsonFetch<{ project: Project }>(`/api/projects/${id}`, {
          method: "PATCH",
          body: JSON.stringify(patch)
        }),
      createProject: (body: Partial<Project>) =>
        jsonFetch<{ project: Project }>(`/api/projects`, {
          method: "POST",
          body: JSON.stringify(body)
        }),
      deleteProject: (id: string) =>
        jsonFetch<{ ok: true }>(`/api/projects/${id}`, { method: "DELETE" }),
      createSubitem: (projectId: string, body: Partial<Subitem>) =>
        jsonFetch<{ subitem: Subitem }>(`/api/projects/${projectId}/subitems`, {
          method: "POST",
          body: JSON.stringify(body)
        }),
      patchSubitem: (id: string, patch: Partial<Subitem>) =>
        jsonFetch<{ subitem: Subitem }>(`/api/subitems/${id}`, {
          method: "PATCH",
          body: JSON.stringify(patch)
        }),
      deleteSubitem: (id: string) =>
        jsonFetch<{ ok: true }>(`/api/subitems/${id}`, { method: "DELETE" }),
      reorderSubitems: (projectId: string, orderedIds: string[]) =>
        jsonFetch<{ ok: true }>(`/api/projects/${projectId}/subitems`, {
          method: "PUT",
          body: JSON.stringify({ orderedIds })
        }),
      requestUploadSas: (parentType: "project" | "subitem", parentId: string, filename: string) =>
        jsonFetch<{ uploadUrl: string; blobPath: string }>(`/api/files/sas`, {
          method: "POST",
          body: JSON.stringify({ parentType, parentId, filename })
        }),
      recordFile: (file: {
        parentType: "project" | "subitem";
        parentId: string;
        blobPath: string;
        filename: string;
        size: number;
      }) =>
        jsonFetch<{ file: { id: string } }>(`/api/files`, {
          method: "POST",
          body: JSON.stringify(file)
        }),
      fileUrl: (id: string) => jsonFetch<{ url: string }>(`/api/files/${id}/url`)
    };

export async function uploadFileDemo(
  parentType: "project" | "subitem",
  parentId: string,
  file: File
) {
  const ref = await demoStore.addFile({ parentType, parentId, file, uploadedBy: actorId() });
  notify();
  return ref;
}
