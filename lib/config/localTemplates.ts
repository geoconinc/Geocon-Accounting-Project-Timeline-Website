/**
 * Local template folder paths (not uploaded to the app).
 * Set NEXT_PUBLIC_LOCAL_TEMPLATES_BASE to the root folder on disk or a UNC path,
 * e.g. C:\\Geocon\\Templates or \\\\fileserver\\Geocon\\Templates
 */

export function getLocalTemplatesBase(): string {
  const raw =
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_LOCAL_TEMPLATES_BASE?.trim() : "";
  return raw ?? "";
}

/** Shared Accounting drive: DAS 140, DAS 142, setup sheet, regional folders (see env example). */
export function getDasFormsFolder(): string {
  const raw =
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_DAS_FORMS_FOLDER?.trim() : "";
  return raw ?? "";
}

/** Root folder for project working directories (e.g. S:\\WPJOB\\G3000). */
export function getProjectFoldersRoot(): string {
  const raw =
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_PROJECT_FOLDERS_ROOT?.trim() : "";
  return raw ?? "";
}

/** Append a subfolder named after the template category (sanitized). */
export function joinTemplateFolderPath(base: string, category: string): string {
  const b = base.trim().replace(/[/\\]+$/, "");
  const safe = category.replace(/[/\\:*?"<>|]+/g, "_").replace(/^\.+/, "").trim() || "General";
  const sep = base.includes("\\") ? "\\" : "/";
  return `${b}${sep}${safe}`;
}

/** Best-effort file: URL for opening in the browser (often blocked from https origins). */
export function localPathToFileUrl(localPath: string): string {
  const p = localPath.trim();
  if (!p) return "";
  if (p.startsWith("\\\\")) {
    const rest = p.slice(2).replace(/\\/g, "/");
    return `file://${encodeURI(`//${rest}`)}`;
  }
  const forward = p.replace(/\\/g, "/");
  if (/^[A-Za-z]:\//.test(forward)) {
    return `file:///${encodeURI(forward)}`;
  }
  if (forward.startsWith("/")) {
    return `file://${encodeURI(forward)}`;
  }
  return `file:///${encodeURI(forward)}`;
}
