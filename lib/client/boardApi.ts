"use client";

import type { FileRef, Project, Subitem } from "@/lib/types";

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

export const api = {
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

  async uploadFile(
    parentType: "project" | "subitem",
    parentId: string,
    file: File
  ): Promise<FileRef> {
    const form = new FormData();
    form.append("parentType", parentType);
    form.append("parentId", parentId);
    form.append("file", file);
    const res = await fetch("/api/files", { method: "POST", body: form });
    if (!res.ok) {
      let detail = "";
      try {
        const j = (await res.json()) as { message?: string; error?: string };
        detail = j.message ?? j.error ?? "";
      } catch { /* ignore */ }
      throw new Error(detail || `Upload failed (${res.status})`);
    }
    const { file: ref } = (await res.json()) as { file: FileRef };
    return ref;
  },

  fileDownloadUrl: (id: string) => `/api/files/${id}/url`
};
