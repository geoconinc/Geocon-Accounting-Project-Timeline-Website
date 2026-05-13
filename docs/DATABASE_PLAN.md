# Database & Storage Plan — Geocon Project Management

This is the **target architecture**. Today, the app is running on a swappable
storage layer (`lib/storage/index.ts`) that defaults to a local JSON file
(`data/db.json`). The Postgres schema is already drafted in `lib/db/schema.ts`
and `lib/db/migrations/0001_init.sql` and ready to apply. SharePoint integration
is **not implemented yet** — this doc is the blueprint we'll build against.

---

## 1. Where each kind of data lives

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│   PostgreSQL (Azure Database for PostgreSQL — Flexible Server)   │
│   ───────────────────────────────────────────────────────────    │
│   Source of truth for:                                           │
│     • Users, sessions                                            │
│     • Projects, subitems                                         │
│     • Notification preferences                                   │
│     • Activity log                                               │
│     • File METADATA (not bytes)                                  │
│     • Document-template METADATA (not bytes)                     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                  │                                 │
                  │ stores SharePoint pointers      │
                  ▼                                 ▼
┌─────────────────────────────────┐   ┌────────────────────────────┐
│                                 │   │                            │
│   Microsoft SharePoint Online   │   │    Microsoft Entra ID      │
│   (Geocon tenant)               │   │    + Microsoft Graph       │
│   ─────────────────────────     │   │    ──────────────────      │
│   File BYTES live here.         │   │   Login (MSAL),            │
│   One document library, with    │   │   directory data,          │
│   folder-per-project structure. │   │   email sending.           │
│                                 │   │                            │
└─────────────────────────────────┘   └────────────────────────────┘
```

**No file ever transits through our database.** The bytes go straight from the
browser (or our backend) to SharePoint via Microsoft Graph. The DB only stores
the SharePoint pointer (`driveId`, `itemId`, `webUrl`).

---

## 2. PostgreSQL schema (target)

The schema below is what we already have in `lib/db/schema.ts` (Drizzle ORM)
plus the SharePoint-related changes we'll make when we cut over.

### 2.1 `users`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | `gen_random_uuid()` |
| email | text UNIQUE NOT NULL | lowercased, must end with `@geoconinc.com` |
| name | text NOT NULL | from Microsoft Graph `displayName` |
| initials | text NOT NULL | derived |
| phone | text | optional |
| photo_url | text | optional, future |
| azure_oid | text UNIQUE | Microsoft user object id (for cross-system join) |
| role | text NOT NULL DEFAULT `'member'` | `member` \| `manager` \| `admin` |
| created_at | timestamptz NOT NULL DEFAULT now() |

Indexes: `(email)`, `(azure_oid)`.

### 2.2 `sessions`

| Column | Type | Notes |
|---|---|---|
| token | text PK | random 64-byte hex; sent as `httpOnly` cookie |
| user_id | uuid FK → users(id) ON DELETE CASCADE |
| expires_at | timestamptz NOT NULL |
| created_at | timestamptz NOT NULL DEFAULT now() |
| user_agent | text | optional, for audit |
| ip | inet | optional |

Indexes: `(user_id)`, `(expires_at)`.

### 2.3 `projects`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| code | text NOT NULL | e.g. `W16288802` |
| name | text NOT NULL | |
| owner_id | uuid FK → users(id) ON DELETE SET NULL | the project manager |
| status | enum `project_status` NOT NULL DEFAULT `'New'` | `New \| InProgress \| Missing \| Future \| Completed` |
| group | enum `project_group` NOT NULL DEFAULT `'Current'` | `Current \| Future \| Completed` |
| start_date | date | |
| timeline_start | date | |
| timeline_end | date | |
| dir_number | text | |
| union | boolean NOT NULL DEFAULT false | |
| reporting_systems | text | |
| cpr_contact | text | free text |
| notes | text | |
| **sharepoint_folder_id** | text | Graph drive item id of `/Projects/{code} - {name}/` |
| **sharepoint_folder_url** | text | webUrl of that folder |
| last_updated_at | timestamptz NOT NULL DEFAULT now() |
| last_updated_by | uuid FK → users(id) ON DELETE SET NULL |
| position | int NOT NULL DEFAULT 0 |
| created_at | timestamptz NOT NULL DEFAULT now() |

Indexes: `(group)`, `(owner_id)`, `(status)`.

### 2.4 `subitems`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK → projects(id) ON DELETE CASCADE |
| name | text NOT NULL | |
| owner_id | uuid FK → users(id) ON DELETE SET NULL |
| status | enum `subitem_status` NOT NULL DEFAULT `'NotStarted'` | `Completed \| InProgress \| Missing \| NotStarted \| NA` |
| due_date | date | |
| date_completed | date | |
| notes | text | |
| position | int NOT NULL DEFAULT 0 | for drag-reorder |
| created_at | timestamptz NOT NULL DEFAULT now() |

Indexes: `(project_id, position)`, `(owner_id)`, `(due_date)`.

### 2.5 `files`  *(metadata only — bytes live in SharePoint)*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | our own id |
| parent_type | enum `file_parent` NOT NULL | `project` \| `subitem` |
| parent_id | uuid NOT NULL | FK enforced via trigger or app code |
| filename | text NOT NULL | display name |
| mime_type | text | optional |
| size_bytes | bigint NOT NULL | |
| **sharepoint_drive_id** | text NOT NULL | drive id |
| **sharepoint_item_id** | text NOT NULL | drive item id |
| **sharepoint_web_url** | text NOT NULL | what we open when user clicks |
| **sharepoint_etag** | text | for concurrency / cache busting |
| uploaded_by | uuid FK → users(id) ON DELETE SET NULL |
| uploaded_at | timestamptz NOT NULL DEFAULT now() |
| deleted_at | timestamptz | soft delete; null = active |

Indexes: `(parent_type, parent_id)`, `(sharepoint_item_id)`, `(uploaded_by)`.

Constraint: `UNIQUE (parent_type, parent_id, sharepoint_item_id)` — same SharePoint
file can't be linked twice to the same row.

### 2.6 `documents`  *(template hub — also SharePoint-backed)*

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text NOT NULL | display name (e.g. "DAS 140 template v3") |
| category | text NOT NULL | one of the default subitem names (DAS 140, etc.) |
| filename | text NOT NULL | original filename |
| size_bytes | bigint NOT NULL | |
| sharepoint_drive_id | text NOT NULL | |
| sharepoint_item_id | text NOT NULL | |
| sharepoint_web_url | text NOT NULL | |
| uploaded_by | uuid FK → users(id) ON DELETE SET NULL |
| uploaded_at | timestamptz NOT NULL DEFAULT now() |

Index: `(category)`.

### 2.7 `notification_prefs`

| Column | Type | Notes |
|---|---|---|
| user_id | uuid FK → users(id) ON DELETE CASCADE |
| project_id | uuid FK → projects(id) ON DELETE CASCADE | nullable = global |
| mute | boolean NOT NULL DEFAULT false |

PK `(user_id, project_id)`.

### 2.8 `activity`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| actor_id | uuid FK → users(id) ON DELETE SET NULL |
| entity_type | text NOT NULL | `'project' \| 'subitem' \| 'file'` |
| entity_id | uuid NOT NULL | |
| action | text NOT NULL | `'created' \| 'status.changed' \| 'owner.assigned' \| 'file.uploaded' \| 'file.deleted'` |
| payload | jsonb NOT NULL DEFAULT `'{}'::jsonb` | before/after diffs |
| created_at | timestamptz NOT NULL DEFAULT now() |

Indexes: `(entity_type, entity_id)`, `(actor_id, created_at DESC)`, `(created_at DESC)`.

### 2.9 `email_outbox` *(new — to make sending durable)*

When an owner is assigned, we'll enqueue an email here. A background worker /
Azure Function picks it up and sends via Microsoft Graph `/sendMail`.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| to_email | text NOT NULL | |
| to_name | text | |
| subject | text NOT NULL | |
| body_html | text NOT NULL | |
| related_entity_type | text | optional |
| related_entity_id | uuid | optional |
| status | text NOT NULL DEFAULT `'pending'` | `pending \| sent \| failed` |
| attempts | int NOT NULL DEFAULT 0 |
| last_error | text | |
| send_after | timestamptz NOT NULL DEFAULT now() | for retries |
| sent_at | timestamptz | |
| created_at | timestamptz NOT NULL DEFAULT now() |

Indexes: `(status, send_after)`.

---

## 3. SharePoint integration (the file part)

### 3.1 What lives where

- **Site**: a single SharePoint site at e.g.
  `https://geoconinc.sharepoint.com/sites/projectmanagement`.
- **Document library**: `Project Files` (one library is enough).
- **Folder layout**:
  ```
  Project Files/
  ├── Projects/
  │   ├── W16288802 - Aroviste/
  │   │   ├── (project-level files)
  │   │   └── Subitems/
  │   │       ├── DAS 140/
  │   │       ├── DAS 142/
  │   │       └── Certified Payroll Reporting/
  │   └── ...
  └── Templates/
      ├── DAS 140/
      ├── DAS 142/
      └── ...
  ```
- We read **siteId**, **driveId**, and folder ids from Graph the first time we
  touch them and cache them in the project row (`sharepoint_folder_id`).

### 3.2 Auth model — pick one

Two valid patterns; we'll start with **A** for clarity, with **B** as the
fallback if Geocon IT prefers app-only access.

**A. Delegated (per-user) — recommended.**
- User's MSAL token (already issued for `User.Read`) is exchanged on the server
  for a Graph token using the
  [On-Behalf-Of (OBO) flow](https://learn.microsoft.com/azure/active-directory/develop/v2-oauth2-on-behalf-of-flow).
- Required additional Graph scopes (delegated):
  - `Files.ReadWrite.All` (or `Sites.ReadWrite.All` if you want to scope by site)
- Pros: every action shows the **real user** in SharePoint history.
- Cons: needs admin consent for the new scopes; needs OBO handler in the API.

**B. App-only (service principal).**
- Backend uses a client secret + `Sites.Selected` scoped to the one library.
- All uploads attributed to the app account ("Geocon Project Mgmt App").
- Pros: simpler, no per-user token juggling.
- Cons: fewer audit signals in SharePoint; admin must grant the app per-site
  permission via Graph PUT `/sites/{siteId}/permissions`.

### 3.3 Upload flow (browser → SharePoint, never via our DB)

```
Browser                      Our Backend                       Graph / SharePoint
   │                              │                                    │
   │  PUT /api/files/sas          │                                    │
   │  { parentType, parentId,     │                                    │
   │    filename, size }          │                                    │
   │ ────────────────────────────►│                                    │
   │                              │  Ensure project SP folder exists   │
   │                              │  (create if first upload)          │
   │                              │ ──────────────────────────────────►│
   │                              │                                    │
   │                              │  POST /createUploadSession         │
   │                              │ ──────────────────────────────────►│
   │                              │                                    │
   │  { uploadUrl, expires }      │                                    │
   │ ◄────────────────────────────│                                    │
   │                              │                                    │
   │  PUT chunked bytes ──────────────────────────────────────────────►│
   │ ◄──────────────────── 201 + driveItem json ──────────────────────│
   │                              │                                    │
   │  POST /api/files (record)    │                                    │
   │  { spDriveId, spItemId,      │                                    │
   │    webUrl, size, parent }    │                                    │
   │ ────────────────────────────►│  INSERT INTO files ...             │
   │                              │  + activity row                    │
   │ ◄──────────── 200 ───────────│                                    │
```

The upload session URL is short-lived (~60 min) and pre-authorized — bytes go
straight from the browser to SharePoint with no proxy through our server, so
even huge files don't hit our infra.

### 3.4 Open / click flow

When the user clicks a chip in the Files cell:

1. We already have `sharepoint_web_url` in the row.
2. `window.open(file.sharepointWebUrl, "_blank")`.
3. SharePoint authenticates the user (they're already signed into M365) and
   opens the file in Office Online or downloads it.

If you want a "preview without leaving the app" later, switch to Graph
`/preview` to get an iframe-embedable URL instead of `webUrl`.

### 3.5 Delete

On delete, soft-delete the DB row (`deleted_at = now()`), then call
`DELETE /drives/{driveId}/items/{itemId}` so SharePoint mirrors. If Graph fails
(e.g. user lacks permission), we keep the soft-delete flag and surface a "Could
not remove from SharePoint — contact IT" toast.

---

## 4. The current → target migration path

### Phase 1 — switch storage driver to Postgres
- `STORAGE_DRIVER=postgres` + `DATABASE_URL=...` in `.env.local`.
- `psql "$DATABASE_URL" -f lib/db/migrations/0001_init.sql`.
- Implement `lib/storage/postgresStore.ts` (currently a stub) using Drizzle.
- `npm run db:generate` for any further schema diffs.

### Phase 2 — keep Azure Blob for attachments
- Store project and subitem attachment bytes in Azure Blob Storage.
- Store only file metadata in Postgres.
- Keep `FilesCell` using SAS upload/read URLs through `lib/blob/sas.ts`.

### Phase 3 — wire SharePoint for `/documents` (template hub)
- Register Graph scopes on the existing Entra app (`Files.ReadWrite.All` or
  `Sites.Selected`).
- Folders should live under `Templates/{category}/`.
- Templates page already groups by default subitem name — those names map 1:1
  to `Templates/` subfolders.

### Phase 4 — durable email + Graph sendMail
- Graph `sendMail` is implemented through `lib/notify/email.ts`.
- For higher volume, add an `email_outbox` table and have an Azure Function
  flush queued mail on a 1-minute timer.

### Phase 5 — RBAC tightening
- Use `users.role` (`member`/`manager`/`admin`).
- Server-side gate "create project" to `manager`/`admin`.
- "Show all" toggle on the board only available to `manager`/`admin`; everyone
  else is forced to the "Only mine" view.

---

## 5. Open questions to decide before we build it

1. **One SharePoint library for both project files and templates, or two?**
   One is simpler; two gives you separate permissions (e.g. read-only on
   templates).
2. **Delegated (OBO) vs app-only?** Drives the audit story. *Default
   recommendation: delegated.*
3. **Soft-delete vs hard-delete on file rows?** Soft is safer for audits;
   recommended.
4. **Where does the cron worker run for `email_outbox`?** Easiest is a Vercel
   cron / Azure Function on a 1-minute schedule hitting `/api/cron/email`
   (we already have `/api/cron/due-dates` as the model).
5. **Do we want "shared with whole team" per project, or strict ACLs?** SharePoint
   inherits from the parent library; per-project breaks-of-inheritance are
   possible but expensive at scale.
