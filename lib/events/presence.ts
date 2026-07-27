// Tracks which users currently have a live SSE connection open, so we can show a
// real-time "active users" count and an active-now indicator per employee.
//
// Single-instance only (same constraint as lib/events/bus.ts): the registry lives
// in this Node process. For multi-instance scale-out this must move to a shared
// store (Redis) keyed by user id.
//
// Keyed by userId with a connection refcount, so multiple tabs/views from the same
// person count as one active user. A user is "active" while at least one
// connection is open.

const g = globalThis as unknown as { __geoconPresence?: Map<string, number> };
if (!g.__geoconPresence) g.__geoconPresence = new Map();
const connectionsByUser = g.__geoconPresence;

/** Register a new live connection for a user. Returns the new distinct-user count. */
export function addConnection(userId: string): number {
  connectionsByUser.set(userId, (connectionsByUser.get(userId) ?? 0) + 1);
  return connectionsByUser.size;
}

/** Drop one live connection for a user. Returns the new distinct-user count. */
export function removeConnection(userId: string): number {
  const next = (connectionsByUser.get(userId) ?? 0) - 1;
  if (next <= 0) connectionsByUser.delete(userId);
  else connectionsByUser.set(userId, next);
  return connectionsByUser.size;
}

/** Number of distinct users with at least one live connection. */
export function getActiveCount(): number {
  return connectionsByUser.size;
}

/** True when the given user has at least one live connection. */
export function isUserActive(userId: string): boolean {
  return connectionsByUser.has(userId);
}
