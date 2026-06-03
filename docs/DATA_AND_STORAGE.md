# Data & Storage

## Domain Model

Types in `lib/types/`:

| Type | Fields | Description |
|------|--------|-------------|
| `User` | id, email, name, initials, phone, photoUrl, createdAt | Team member |
| `Session` | token, userId, expiresAt | Auth session (httpOnly cookie) |
| `Project` | id, code, name, ownerId, status, group, startDate, timelineStart/End, office, projectManagerId, projectDirectorId, notes, etc. | Top-level project |
| `Subitem` | id, projectId, name, ownerId, status, dueDate, dateCompleted, notes, position, createdAt | Task within a project |
| `FileRef` | id, parentType, parentId, blobPath, filename, size, uploadedBy, uploadedAt | File attachment metadata |
| `ActivityEvent` | id, actorId, entityType, entityId, action, payload, createdAt | Audit log entry |

Enums: `ProjectStatus` (New, InProgress, Completed, Missing, Future), `ProjectGroup` (Current, Future, Completed), `SubitemStatus` (Completed, InProgress, Missing, NotStarted, NA).

## Storage Abstraction

`lib/storage/index.ts` defines the `Storage` interface covering CRUD operations for all entity types. A singleton `storage` is selected at import time by `STORAGE_DRIVER`:

- **`postgres`** (production) — `lib/storage/postgresStore.ts` using Drizzle ORM.
- **`json`** (local dev) — `lib/storage/jsonStore.ts` backed by `data/db.json`.

Both implementations provide identical behavior including:
- Case-insensitive user email matching on upsert.
- Automatic `group` assignment when project `status` changes.
- `dateCompleted` auto-set when subitem status becomes `Completed`.
- Activity log trimming (keeps last 200 entries per entity in JSON mode).

## Postgres Schema

Defined in `lib/db/schema.ts` using Drizzle ORM table builders:

```
users           — id (uuid PK), email (unique), name, initials, phone, photo_url, created_at
sessions        — token (text PK), user_id (FK users), expires_at
projects        — id (uuid PK), code, name, owner_id, status, group, dates, office, PM/director IDs, notes, position
subitems        — id (uuid PK), project_id (FK projects CASCADE), name, owner_id, status, due_date, date_completed, notes, position, created_at
files           — id (uuid PK), parent_type, parent_id, blob_path, filename, size, uploaded_by, uploaded_at
activity        — id (uuid PK), actor_id, entity_type, entity_id, action, payload (jsonb), created_at
site_config     — key (text PK), value (jsonb), updated_at, updated_by
```

Custom Postgres enums: `project_status`, `project_group`, `subitem_status`, `file_parent`.

## Migrations

SQL migration files in `lib/db/migrations/`, applied sequentially by `scripts/migrate.ts`:

| File | Description |
|------|-------------|
| `0001_init.sql` | Create all tables, enums, and indexes |
| `0002_project_manager_director.sql` | Add PM and director columns to projects |
| `0003_notification_prefs_global.sql` | Notification preferences schema changes |
| `0004_drop_notification_prefs.sql` | Remove notification_prefs table |
| `0005_site_config.sql` | Create site_config key-value table |
| `0006_subitem_created_at.sql` | Add `created_at` to subitems for one-week reminder cron |

Run migrations: `DATABASE_URL="postgresql://..." npm run db:migrate`

The script automatically enables SSL for Azure Postgres connections.

## File Storage

File bytes are stored externally; only metadata lives in Postgres.

### SharePoint (primary)
When `FILE_STORAGE_DRIVER=sharepoint`:
1. Server creates a Graph upload session via `lib/fileStorage/sharepointAttachments.ts`.
2. Client uploads directly to the Graph upload URL.
3. The returned drive item ID is encoded as `sp1.<base64>` and stored in `files.blob_path`.
4. Downloads resolve the `sp1.` prefix and fetch a temporary download URL from Graph.

### Azure Blob (fallback)
When `FILE_STORAGE_DRIVER=blob`:
1. Server generates a SAS URL via `lib/blob/sas.ts`.
2. Client uploads directly to Blob Storage.
3. The blob path is stored in `files.blob_path`.
4. Downloads generate a read SAS URL.

## Admin Site Config

The `site_config` Postgres table stores office assignee mappings and role rosters as a JSON blob under the key `admin_site_config`. This replaces the filesystem-based `data/admin-site-config.json` for serverless compatibility.

Managed through `lib/server/site-data/adminSiteConfigStore.ts` with automatic fallback to bundled JSON files (`data/officeAssigneeDirectory.json`, `data/geoconRoleAssignees.json`) when no admin override exists.
