import { randomUUID } from "node:crypto";
import { getGraphAppAccessToken } from "@/lib/graph/appAccessToken";

function hostname(): string | null {
  const h = process.env.SHAREPOINT_HOSTNAME?.trim();
  return h || null;
}

function sitePath(): string | null {
  const p = process.env.SHAREPOINT_SITE_PATH?.trim().replace(/^\/+/, "");
  return p || null;
}

function libraryName(): string {
  return process.env.SHAREPOINT_LIBRARY_NAME?.trim() || "Documents";
}

function folderRoot(): string {
  return process.env.SHAREPOINT_FOLDER_ROOT?.trim() || "Geocon Project Timeline";
}

export function isSharePointAttachmentsConfigured(): boolean {
  if (process.env.FILE_STORAGE_DRIVER !== "sharepoint") return false;
  return Boolean(hostname() && sitePath() && process.env.GRAPH_APP_TENANT_ID && process.env.GRAPH_APP_CLIENT_ID && process.env.GRAPH_APP_CLIENT_SECRET);
}

let cachedSiteId: string | null = null;
let cachedDriveId: string | null = null;

async function graphFetch(path: string, init: RequestInit): Promise<Response> {
  const token = await getGraphAppAccessToken();
  if (!token) throw new Error("graph_token_unavailable");
  return fetch(`https://graph.microsoft.com/v1.0${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {})
    }
  });
}

async function resolveSiteId(): Promise<string> {
  if (cachedSiteId) return cachedSiteId;
  const host = hostname();
  const sp = sitePath();
  if (!host || !sp) throw new Error("sharepoint_site_not_configured");
  const path = `/sites/${encodeURIComponent(host)}:/${sp}:`;
  const res = await graphFetch(path, { method: "GET" });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`sharepoint_site_resolve_failed:${res.status}:${t.slice(0, 200)}`);
  }
  const j = (await res.json()) as { id: string };
  cachedSiteId = j.id;
  return j.id;
}

async function resolveDriveId(): Promise<string> {
  if (cachedDriveId) return cachedDriveId;
  const siteId = await resolveSiteId();
  const res = await graphFetch(`/sites/${encodeURIComponent(siteId)}/drives`, { method: "GET" });
  if (!res.ok) throw new Error("sharepoint_drives_list_failed");
  const j = (await res.json()) as { value: Array<{ id: string; name: string }> };
  const want = libraryName();
  const drive = j.value.find((d) => d.name === want) ?? j.value[0];
  if (!drive) throw new Error("sharepoint_no_drives");
  cachedDriveId = drive.id;
  return drive.id;
}

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function remoteItemPath(
  parentType: "project" | "subitem",
  parentId: string,
  filename: string
): string {
  const root = folderRoot();
  const safe = safeFilename(filename);
  const unique = `${randomUUID()}-${safe}`;
  const sub = parentType === "project" ? `projects/${parentId}` : `subitems/${parentId}`;
  return `${root}/${sub}/${unique}`;
}

export async function createSharePointUploadSession(input: {
  parentType: "project" | "subitem";
  parentId: string;
  filename: string;
  fileSize: number;
}): Promise<{ uploadUrl: string; driveId: string }> {
  const driveId = await resolveDriveId();
  const itemPath = remoteItemPath(input.parentType, input.parentId, input.filename);
  const encodedPath = itemPath
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");

  const url = `/drives/${encodeURIComponent(driveId)}/root:/${encodedPath}:/createUploadSession`;
  const res = await graphFetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      item: { "@microsoft.graph.conflictBehavior": "rename" },
      deferCommit: false
    })
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`sharepoint_upload_session:${res.status}:${t.slice(0, 240)}`);
  }
  const j = (await res.json()) as { uploadUrl: string };
  if (!j.uploadUrl) throw new Error("sharepoint_no_upload_url");
  return { uploadUrl: j.uploadUrl, driveId };
}

export async function getSharePointDownloadLocationUrl(
  driveId: string,
  itemId: string
): Promise<string | null> {
  const token = await getGraphAppAccessToken();
  if (!token) return null;
  const url = `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}/content`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    redirect: "manual"
  });
  if (res.status >= 300 && res.status < 400) {
    return res.headers.get("location");
  }
  return null;
}

export async function deleteSharePointDriveItem(driveId: string, itemId: string): Promise<void> {
  const res = await graphFetch(`/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}`, {
    method: "DELETE"
  });
  if (!res.ok && res.status !== 404) {
    await res.text().catch(() => "");
  }
}
