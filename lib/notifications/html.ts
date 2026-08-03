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

/**
 * Link back into the app for an email button. With a projectId it deep-links to that
 * project on the board (scrolls to and highlights it); otherwise it opens the home board.
 * Returns null when no base URL is configured, so the button is simply omitted.
 */
export function boardUrl(projectId?: string | null): string | null {
  const base = appBaseUrl();
  if (!base) return null;
  const trimmed = base.replace(/\/$/, "");
  return projectId ? `${trimmed}/?focusProject=${encodeURIComponent(projectId)}` : trimmed;
}

export function firstNameFromDisplayName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "there";

  // Geocon employee list style: "Lastname, Firstname" → use the given name after the comma.
  if (trimmed.includes(",")) {
    const afterComma = trimmed.split(",").slice(1).join(",").trim();
    if (afterComma) return afterComma.split(/\s+/)[0] ?? afterComma;
  }

  return trimmed.split(/\s+/)[0] ?? trimmed;
}
