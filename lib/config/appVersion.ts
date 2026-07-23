/**
 * Single source of truth for the app version shown in the UI.
 * Value is injected at build time from package.json via next.config.mjs.
 */
export const APP_VERSION = (process.env.NEXT_PUBLIC_APP_VERSION ?? "").trim() || "0.0.0";

/** e.g. "v1.0.0" */
export function formatAppVersion(version: string = APP_VERSION): string {
  const v = version.trim() || "0.0.0";
  return v.startsWith("v") ? v : `v${v}`;
}

/** e.g. "Geocon · v1.0.0" — used in sidebar / help menu. */
export function formatAppVersionLabel(version: string = APP_VERSION): string {
  return `Geocon · ${formatAppVersion(version)}`;
}
