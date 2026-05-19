"use client";

import type { Project, Subitem } from "@/lib/types";

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

/** Response from POST /api/files/sas (Azure Blob vs SharePoint upload session). */
export type PrepareUploadResponse =
  | { provider: "blob"; uploadUrl: string; blobPath: string }
  | { provider: "sharepoint"; uploadUrl: string; driveId: string };

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
  requestUploadSas: (
    parentType: "project" | "subitem",
    parentId: string,
    filename: string,
    fileSize: number
  ) =>
    jsonFetch<PrepareUploadResponse>(`/api/files/sas`, {
      method: "POST",
      body: JSON.stringify({ parentType, parentId, filename, fileSize })
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
  fileUrl: (id: string) => jsonFetch<{ url: string }>(`/api/files/${id}/url`),
  setMute: (projectId: string, mute: boolean) =>
    jsonFetch<{ ok: true }>(`/api/notification-prefs`, {
      method: "POST",
      body: JSON.stringify({ projectId, mute })
    })
};
