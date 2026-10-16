/**
 * Last name for sorting. Roster names are "Last, First M." while Microsoft display names
 * are usually "First Last", so both shapes are handled.
 */
export function lastNameSortKey(name: string): string {
  const trimmed = name.trim();
  const comma = trimmed.indexOf(",");
  if (comma > 0) return trimmed.slice(0, comma).trim();
  const parts = trimmed.split(/\s+/);
  return parts[parts.length - 1] ?? trimmed;
}

/** Alphabetical by last name, then by full name so ties stay stable. */
export function compareByLastName(a: { name: string }, b: { name: string }): number {
  return (
    lastNameSortKey(a.name).localeCompare(lastNameSortKey(b.name), undefined, { sensitivity: "base" }) ||
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
}
