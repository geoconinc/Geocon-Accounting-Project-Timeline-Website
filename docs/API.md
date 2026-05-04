# HTTP API

All handlers are implemented under **`lib/server/routes/`** and re-exported from **`app/api/**/route.ts`** so URLs stay stable and Next.js route config stays in `app/api` where required.

## Auth patterns

| Pattern | Use case |
|---------|----------|
| **`authenticateRequest()`** | Mutations and reads that need a logged-in user; returns `User` or `Response` (401). |
| **`getCurrentUser()`** | Soft check (for example SSE and verify-session). |

## Routes (summary)

| Method | Path | Handler module | Notes |
|--------|------|----------------|-------|
| GET | `/api/projects` | `projectsRoute` | Bundle: projects, subitems, users, files, `me`. |
| POST | `/api/projects` | `projectsRoute` | Create project; publishes bus event. |
| PATCH | `/api/projects/[id]` | `projectByIdRoute` | Update; notifications + activity on certain fields. |
| DELETE | `/api/projects/[id]` | `projectByIdRoute` | |
| POST | `/api/projects/[id]/subitems` | `subitemsByProjectRoute` | Create subitem. |
| PUT | `/api/projects/[id]/subitems` | `subitemsByProjectRoute` | Reorder `orderedIds`. |
| PATCH | `/api/subitems/[id]` | `subitemByIdRoute` | |
| DELETE | `/api/subitems/[id]` | `subitemByIdRoute` | |
| POST | `/api/files` | `filesRoute` | Record metadata after blob upload. |
| POST | `/api/files/sas` | `fileSasRoute` | Upload SAS URL when Azure blob env is set. |
| GET | `/api/files/[id]/url` | `fileUrlRoute` | Read SAS for download. |
| GET, PATCH | `/api/users` | `usersRoute` | List users; patch profile fields. |
| POST | `/api/notifications` | `notificationsRoute` | Internal-style notify dispatch. |
| GET, POST | `/api/notification-prefs` | `notificationPrefsRoute` | Query string `projectId` on GET. |
| POST | `/api/microsoft-login` | `microsoftLoginRoute` | Graph token → session cookie. |
| GET | `/api/verify-session` | `verifySessionRoute` | |
| POST | `/api/logout` | `logoutRoute` | |
| GET | `/api/events` | `eventsRoute` | SSE; `dynamic` + `runtime` exported from `app/api/events/route.ts`. |
| POST | `/api/cron/due-dates` | `cronDueDatesRoute` | Header `X-Cron-Secret` must match `CRON_SHARED_SECRET`. |

Request/response bodies match the previous inline `route.ts` implementations (this refactor moved code only).

## Blob storage

**`lib/blob/sas.ts`** — helpers for Azure Blob SAS URLs. File routes return `503` with `blob_not_configured` when environment variables are missing.
