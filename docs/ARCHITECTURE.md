# Architecture

## Overview

Next.js 14 App Router application. Authenticated Microsoft users manage **projects**, **subitems** (tasks), **file attachments**, and **notification preferences**. The primary interface is a board-style grid with supporting dashboard, timeline, team, documents, and admin settings views.

## System Layers

```
┌─────────────────────────────────────────────────────┐
│  Browser                                            │
│  ┌──────────────┐  ┌────────────────┐               │
│  │ Pages/Views   │  │ lib/client/    │               │
│  │ (components/) │  │ boardApi.ts    │               │
│  └──────┬───────┘  └──────┬─────────┘               │
│         │                  │ fetch(/api/...)          │
└─────────┼──────────────────┼────────────────────────┘
          │                  │
┌─────────┼──────────────────┼────────────────────────┐
│  Next.js Server            │                         │
│  ┌─────────────────────────▼──────────────────────┐ │
│  │ app/api/**/route.ts  (thin re-exports)         │ │
│  └──────────────────────────┬─────────────────────┘ │
│                              │                       │
│  ┌───────────────────────────▼────────────────────┐ │
│  │ lib/server/features/   (route handlers)        │ │
│  │   auth-session/  cron/  events/  files/        │ │
│  │   notifications/  projects/  role-assignees/   │ │
│  │   users/                                       │ │
│  └────────┬──────────┬───────────┬────────────────┘ │
│           │          │           │                   │
│  ┌────────▼──┐ ┌─────▼────┐ ┌───▼──────────────┐   │
│  │ Storage   │ │ Events   │ │ Notifications     │   │
│  │ interface │ │ bus.ts   │ │ Graph email       │   │
│  └────┬──────┘ └──────────┘ └───────────────────┘   │
│       │                                              │
│  ┌────▼──────────────────────────────────────────┐  │
│  │ Postgres (postgresStore)  or  JSON (jsonStore) │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

## Key Design Decisions

### Route handler separation
`app/api/**/route.ts` files are kept minimal — they re-export functions from `lib/server/features/`. This keeps Next.js route segment config (`dynamic`, `runtime`) next to the URL while business logic lives in testable modules.

### Storage abstraction
`lib/storage/index.ts` defines a `Storage` interface. The active implementation is selected by `STORAGE_DRIVER`:
- **`postgres`** — `postgresStore.ts` using Drizzle ORM against Azure Postgres.
- **`json`** — `jsonStore.ts` for local development (file-backed, single-node only).

### File attachments
Uploads go directly to **SharePoint** via Microsoft Graph upload sessions (or Azure Blob SAS as fallback). Only metadata (blob path, filename, size) is stored in Postgres. The `blobPath` field uses a `sp1.base64` encoding for SharePoint drive item references.

### Admin site config
Office assignees and role rosters are stored in the `site_config` Postgres table (JSON column) when using Postgres, falling back to `data/admin-site-config.json` for local dev. This ensures config survives serverless ephemeral filesystems.

## Authentication Flow

```
Browser (MSAL popup)
  → acquireToken (User.Read scope)
  → POST /api/microsoft-login { accessToken }

Server
  → Graph GET /v1.0/me (verify token)
  → Enforce @geoconinc.com domain
  → Upsert user in storage
  → Issue httpOnly session_token cookie (30 days)

Subsequent requests
  → middleware.ts checks session_token cookie
  → Unauthenticated → redirect to /login (pages) or 401 (API)
```

## Access Control

- **Board admins** (`BOARD_ADMIN_EMAILS`) — see and manage all projects/subitems.
- **Project owners** — see their full project including all subitems and files.
- **Subitem owners** — see the parent project row plus their assigned subitems and files.
- **Super admin** (`NEXT_PUBLIC_SUPER_ADMIN_EMAIL`) — access to `/settings/admin` for managing role rosters and office assignees.

Enforced server-side in `lib/server/access.ts`, not just hidden in the UI.

## Real-time Updates

Route handlers call `bus.publish()` after mutations. The `/api/events` SSE endpoint streams typed events to connected browsers. Clients also poll every 30 seconds as a fallback (required for serverless deployments where SSE connections may not persist).

Event types: `project.upsert`, `project.delete`, `subitem.upsert`, `subitem.delete`, `subitem.reorder`, `file.added`.

## Database Schema

Managed by Drizzle ORM. Tables: `users`, `sessions`, `projects`, `subitems`, `files`, `activity`, `site_config`. Schema defined in `lib/db/schema.ts`, migrations in `lib/db/migrations/`.

See [DATA_AND_STORAGE.md](./DATA_AND_STORAGE.md) for full schema details.

## Extension Guidelines

1. **New API endpoint** — Add handler in `lib/server/features/<area>/`, re-export from `app/api/.../route.ts`.
2. **New persisted field** — Update `lib/types/`, `lib/db/schema.ts`, add migration, update both storage implementations.
3. **New UI feature** — Use `lib/client/` for API wrappers; keep components presentational.
4. **Background job** — Follow the `/api/cron/due-dates` pattern: shared secret header, handler in `lib/server/features/cron/`.
