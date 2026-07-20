# Geocon Project Timeline

Internal project management application for Geocon's accounting team. Tracks projects, subitems (tasks), file attachments, assignments, and due-date notifications in a Monday.com-style board interface.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Azure Postgres (data + file attachments) · Microsoft Entra / MSAL (auth) · SMTP or Microsoft Graph (email)

## Features

- **Microsoft SSO** — MSAL popup login with server-side Graph `/me` verification and httpOnly session cookies.
- **Project board** — Grouped by Current / Future / Completed with inline editing, drag-and-drop reordering, and live updates via SSE + polling fallback.
- **Subitems** — Per-project task rows with owner assignment, status, due dates, file attachments, and notes.
- **File uploads** — Attachments stored directly in PostgreSQL (`bytea`, 10 MB per-file limit) with access-controlled streaming downloads.
- **Dashboard** — At-a-glance project health: status breakdown, completion percentage, overdue items, recent activity.
- **Timeline** — Gantt-style 60-day view with project bars and date navigation.
- **Email notifications** — Assignment and due-date reminders via SMTP (or Microsoft Graph `sendMail`).
- **Role-based access** — Board admins see everything; project owners see their projects; subitem owners see their assigned items.
- **Admin settings** — Super-admin page for managing office assignees and role rosters (stored in Postgres).

## Quick Start

```bash
npm install
npm run db:migrate             # apply Postgres schema
npm run dev                    # http://localhost:3000
```

> Configuration is managed privately by the administrator and is not documented in
> this repository. Contact the maintainer if you need access to run the app.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | Run Next.js linter |
| `npm run db:migrate` | Apply SQL migrations to Postgres |
| `npm run db:generate` | Generate Drizzle migration files |
| `npm run seed` | Seed local JSON storage (dev only) |

## Project Structure

```
app/                    Next.js App Router
  (app)/                Authenticated pages (board, dashboard, timeline, team, settings)
  api/                  API routes (thin re-exports from lib/server/features/)
  login/                Microsoft sign-in page

components/             React UI
  features/board/       Board grid, rows, cells, dialogs, toolbar
  dashboard/            Dashboard charts and stats
  timeline/             Gantt timeline view
  team/                 Team member directory
  documents/            Document templates view
  settings/             User and admin settings
  nav/                  Sidebar navigation

lib/                    Shared application code
  auth/                 MSAL config, session management, super-admin check
  client/               Browser-side API wrappers (boardApi, roleAssigneesApi)
  config/               Shared config (allowed domain, local templates)
  db/                   Drizzle schema, migrations, client
  domain/               Business rules (offices, project defaults, role rosters)
  events/               In-process SSE pub/sub bus
  graph/                Microsoft Graph app-only access token
  notifications/        Email dispatch, templates
  server/               Server-only code
    features/           Route handlers grouped by area
    site-data/          Admin config store, role/office sync
  storage/              Storage interface + JSON/Postgres implementations
  types/                TypeScript types and enums

scripts/                Migration runner, seed script, data tools
data/                   Static reference data (role assignees, office directory)
docs/                   Technical documentation
```

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | System layers, data flow, auth, real-time updates |
| [API Reference](docs/API.md) | All HTTP routes, request/response shapes |
| [Frontend](docs/FRONTEND.md) | Pages, components, state management |
| [Data & Storage](docs/DATA_AND_STORAGE.md) | Storage drivers, Drizzle schema, migrations |
| [Microsoft Auth](docs/MICROSOFT_AUTH.md) | Azure app registration, MSAL setup, session flow |
| [Deployment](docs/DEPLOYMENT.md) | Azure App Service deployment and production checklist (admin only) |

## License

Proprietary — Geocon internal use only.
