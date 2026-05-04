# Data and storage

## Domain model (application types)

Types live under **`lib/types/`**:

- **`enums.ts`** — `ProjectStatus`, `ProjectGroup`, `SubitemStatus`.
- **`entities.ts`** — `User`, `Session`, `FileRef`, `Project`, `Subitem`, `NotificationPref`, `ActivityEvent`.
- **`index.ts`** — Re-exports everything; imports continue to use `@/lib/types`.

These are the shapes used by the UI, API handlers, and JSON storage. They should stay aligned with **`lib/db/schema.ts`** when using Postgres.

## Storage abstraction

**`lib/storage/index.ts`** defines the **`Storage`** interface (users, sessions, projects, subitems, files, notification preferences, activity). The singleton **`storage`** is:

- **`jsonStore`** when `STORAGE_DRIVER` is unset or not `postgres` (default).
- **`postgresStore`** when `STORAGE_DRIVER=postgres` (currently a stub that throws until queries are implemented).

Environment:

- **`STORAGE_DRIVER`** — `json` (default) or `postgres`.
- **`DATABASE_URL`** — Required for Postgres path; used by Drizzle config.

## JSON store

**`lib/storage/jsonStore.ts`** persists data to the filesystem (implementation details remain in that module). Suitable for single-node deployment and local development.

## Postgres path

1. **`lib/db/schema.ts`** — Drizzle table definitions and enums mirroring the app model.
2. **`lib/db/migrations/`** — SQL migrations (for example `0001_init.sql`).
3. **`drizzle.config.ts`** — Drizzle Kit entry.
4. **`lib/storage/postgresStore.ts`** — Must implement **`Storage`**; today it is a typed skeleton.

Scripts: **`npm run seed`**, **`npm run db:generate`**, **`npm run db:migrate`** (see root **`package.json`**).

## Activity log

**`appendActivity`** on storage records **`ActivityEvent`** rows (actor, entity type/id, action, payload). Project PATCH handlers append an `"update"` activity for audit-style history.
