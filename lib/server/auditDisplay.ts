/**
 * Resolve a human-readable name for an audit-log row.
 * Prefers live entities, then snapshots left in the activity payload after hard deletes.
 */
export function resolveAuditEntityName(opts: {
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  projectNameById?: Map<string, string>;
  projectCodeById?: Map<string, string>;
}): string {
  const { entityType, entityId, payload, projectNameById, projectCodeById } = opts;
  const asString = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

  switch (entityType) {
    case "project": {
      return (
        projectNameById?.get(entityId) ??
        projectCodeById?.get(entityId) ??
        asString(payload.name) ??
        asString(payload.code) ??
        entityId.slice(0, 8)
      );
    }
    case "subitem": {
      return asString(payload.name) ?? entityId.slice(0, 8);
    }
    case "file": {
      return asString(payload.filename) ?? entityId.slice(0, 8);
    }
    default: {
      return (
        asString(payload.name) ??
        asString(payload.filename) ??
        asString(payload.code) ??
        entityId.slice(0, 8)
      );
    }
  }
}
