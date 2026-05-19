const PREFIX = "sp1.";

function utf8ToBase64Url(json: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(json, "utf8").toString("base64url");
  }
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToUtf8(b64: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(b64, "base64url").toString("utf8");
  }
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const s = b64.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/** Stored in DB `blob_path` when FILE_STORAGE_DRIVER=sharepoint. */
export function encodeSharePointBlobRef(driveId: string, itemId: string): string {
  return `${PREFIX}${utf8ToBase64Url(JSON.stringify({ driveId, itemId }))}`;
}

export function decodeSharePointBlobRef(blobPath: string): { driveId: string; itemId: string } | null {
  if (!blobPath.startsWith(PREFIX)) return null;
  try {
    const json = base64UrlToUtf8(blobPath.slice(PREFIX.length));
    const o = JSON.parse(json) as { driveId?: string; itemId?: string };
    if (!o.driveId || !o.itemId) return null;
    return { driveId: o.driveId, itemId: o.itemId };
  } catch {
    return null;
  }
}
