/** Single super-admin (site config). Public env so client nav can match server checks. */
export const SUPER_ADMIN_EMAIL = (
  process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL ?? "mundra@geoconinc.com"
)
  .trim()
  .toLowerCase();

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === SUPER_ADMIN_EMAIL;
}

export function isSuperAdminUser(user: { email: string } | null | undefined): boolean {
  return isSuperAdminEmail(user?.email);
}
