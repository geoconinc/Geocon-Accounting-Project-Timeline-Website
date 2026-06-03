# HTTP API Reference

All route handlers live in `lib/server/features/` grouped by domain area. The `app/api/**/route.ts` files are thin re-exports that keep Next.js segment config next to the URL.

## Authentication

| Pattern | Usage |
|---------|-------|
| `authenticateRequest()` | Returns `User` or `Response(401)`. Used by all mutation and data-reading endpoints. |
| `getCurrentUser()` | Soft check — returns `User | null`. Used by SSE and verify-session. |

All non-public endpoints require a valid `session_token` cookie. Middleware redirects unauthenticated page requests to `/login` and returns `401` JSON for API calls.

## Routes

### Auth & Session

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| POST | `/api/microsoft-login` | `microsoftLoginRoute` | Exchange Graph access token for session cookie |
| GET | `/api/verify-session` | `verifySessionRoute` | Check current session validity |
| POST | `/api/logout` | `logoutRoute` | Clear session cookie |

### Projects

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/api/projects` | `projectsRoute` | Board payload: projects, subitems, users, files, `me` (filtered by access) |
| POST | `/api/projects` | `projectsRoute` | Create project with auto-generated subitems |
| PATCH | `/api/projects/[id]` | `projectByIdRoute` | Update project fields; triggers notifications on assignment changes |
| DELETE | `/api/projects/[id]` | `projectByIdRoute` | Delete project and all associated subitems/files |

### Subitems

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| POST | `/api/projects/[id]/subitems` | `subitemsByProjectRoute` | Create subitem |
| PUT | `/api/projects/[id]/subitems` | `subitemsByProjectRoute` | Reorder subitems (`{ orderedIds: [...] }`) |
| PATCH | `/api/subitems/[id]` | `subitemByIdRoute` | Update subitem fields |
| DELETE | `/api/subitems/[id]` | `subitemByIdRoute` | Delete subitem |

### Files

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| POST | `/api/files/sas` | `fileSasRoute` | Get upload URL (SharePoint session or Azure Blob SAS) |
| POST | `/api/files` | `filesRoute` | Record file metadata after upload completes |
| GET | `/api/files/[id]/url` | `fileUrlRoute` | Get download URL (SharePoint or Blob read SAS) |

**Upload flow:**
1. Client calls `POST /api/files/sas` with `{ parentType, parentId, filename, fileSize }`.
2. Server returns `{ provider: "sharepoint", uploadUrl, driveId }` or `{ provider: "blob", uploadUrl, blobPath }`.
3. Client uploads directly to the returned URL.
4. Client calls `POST /api/files` with metadata including the `blobPath`.

### Users

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/api/users` | `usersRoute` | List all users |
| PATCH | `/api/users` | `usersRoute` | Update profile fields |

### Notifications

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| POST | `/api/notifications` | `notificationsRoute` | Send email notification to a user |

### Role Assignees

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/api/role-assignees` | `roleAssigneesRoute` | Get project managers and directors with matched users |

### Admin

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/api/admin/site-config` | (route.ts) | Get office assignees + role roster (super-admin only) |
| PUT | `/api/admin/site-config` | (route.ts) | Update office assignees + role roster (super-admin only) |

### Events & Cron

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/api/events` | `eventsRoute` | SSE stream for real-time board updates |
| POST | `/api/cron/incomplete-week` | `cronIncompleteWeekRoute` | Scheduled job: email assignees when subitems are still incomplete 7 days after creation. Requires `X-Cron-Secret` header. |
| POST | `/api/cron/due-dates` | `cronDueDatesRoute` | Scheduled job: send due-date reminder emails. Requires `X-Cron-Secret` header. |

## Error Responses

All endpoints return JSON error bodies:

```json
{ "error": "error_code", "message": "Human-readable description" }
```

Common codes: `unauthorized` (401), `forbidden` (403), `not_found` (404), `invalid_json` (400).
