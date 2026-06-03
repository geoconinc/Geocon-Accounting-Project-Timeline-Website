export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function appBaseUrl(): string | null {
  return process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_MSAL_REDIRECT_URI ?? null;
}

export function firstNameFromDisplayName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "there";
  if (trimmed.includes(",")) return trimmed.split(",")[0].trim();
  return trimmed.split(/\s+/)[0] ?? trimmed;
}
