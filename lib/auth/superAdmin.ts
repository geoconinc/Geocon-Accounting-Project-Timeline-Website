/**
 * Single app owner. The owner is the only account allowed to change who is an
 * admin and to edit site configuration (rosters, office directory). The owner is
 * always an admin. Public env so client nav can match server-side checks.
 */
export const OWNER_EMAIL = (
  process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL ?? "mundra@geoconinc.com"
)
  .trim()
  .toLowerCase();

export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === OWNER_EMAIL;
}

export function isOwnerUser(user: { email: string } | null | undefined): boolean {
  return isOwnerEmail(user?.email);
}

/** @deprecated Use OWNER_EMAIL. Kept as an alias to limit churn. */
export const SUPER_ADMIN_EMAIL = OWNER_EMAIL;
/** @deprecated Use isOwnerEmail. */
export const isSuperAdminEmail = isOwnerEmail;
/** @deprecated Use isOwnerUser. */
export const isSuperAdminUser = isOwnerUser;
