import { localPathToFileUrl } from "@/lib/config/localTemplates";

export type OpenLocalFolderResult = "copied" | "prompted" | "failed";

/**
 * Browsers block file:// navigation from https pages, so "open" cannot launch
 * Explorer reliably. Copy the path (best UX) and best-effort try file://.
 */
export async function openLocalFolderPath(localPath: string): Promise<OpenLocalFolderResult> {
  const path = localPath.trim();
  if (!path) return "failed";

  const fileUrl = localPathToFileUrl(path);
  if (fileUrl) {
    try {
      window.open(fileUrl, "_blank", "noopener,noreferrer");
    } catch {
      /* ignored — Chromium typically blocks file:// from https */
    }
  }

  try {
    await navigator.clipboard.writeText(path);
    return "copied";
  } catch {
    window.prompt("Copy this path and paste it into File Explorer:", path);
    return "prompted";
  }
}
