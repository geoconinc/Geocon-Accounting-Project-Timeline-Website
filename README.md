# Geocon Project Timeline

A Monday.com-style project timeline and management app for Geocon. Built with
Next.js 14 App Router, TypeScript, Tailwind CSS, MSAL, Azure Blob Storage, and a
swappable JSON/Postgres storage layer.

## What It Does

- Microsoft login with Graph `/me` verification and a server-issued session cookie.
- Project groups for Current, Future, and Completed work.
- Project rows with owners, subitems, files, drag ordering, status summaries, and live updates.
- File uploads through Azure Blob SAS URLs.
- Due-date and assignment notifications through Microsoft Graph email.
- Local JSON storage for development, with a Postgres schema and migration path ready.

## Quick Start

```bash
npm install
cp .env.example .env
npm run seed
npm run dev
```

The app runs at `http://localhost:3000`. Fill in the Microsoft auth values in
`.env` before using real sign-in. Local demo data is stored in `data/db.json`,
which is intentionally ignored by git.

## Useful Commands

```bash
npm run dev         # Start the local Next.js dev server
npm run build       # Build the production app
npm run start       # Start a production build
npm run lint        # Run Next.js lint checks
npm run seed        # Seed local JSON storage
npm run db:generate # Generate Drizzle migrations
npm run db:migrate  # Apply the SQL migration script
```

## Environment

Use `.env.example` as the source of truth for required settings. The most
important groups are:

- Microsoft login: `NEXT_PUBLIC_MSAL_CLIENT_ID`,
  `NEXT_PUBLIC_MSAL_TENANT_ID`, `NEXT_PUBLIC_MSAL_REDIRECT_URI`,
  `SESSION_SECRET`, and `ALLOWED_EMAIL_DOMAIN`.
- Board access: `BOARD_ADMIN_EMAILS` for users who can see and manage all
  projects and subitems.
- Storage: `STORAGE_DRIVER`, `DATABASE_URL`, and the local JSON files under
  `data/`.
- Azure Blob uploads: `AZURE_STORAGE_ACCOUNT`, `AZURE_STORAGE_KEY`, and
  `AZURE_STORAGE_CONTAINER`.
- SharePoint templates: `SHAREPOINT_TEMPLATES_URL`.
- Email notifications: `GRAPH_APP_TENANT_ID`, `GRAPH_APP_CLIENT_ID`,
  `GRAPH_APP_CLIENT_SECRET`, `NOTIFY_FROM_ADDRESS`, and `APP_BASE_URL`.
- Scheduled notifications: `CRON_SHARED_SECRET` for `/api/cron/due-dates`.

Detailed setup notes live in `docs/MICROSOFT_AUTH.md` and
`docs/DATA_AND_STORAGE.md`. Production service placement is covered in
`docs/ONLINE_SETUP.md`.

## Repository Structure

```text
app/
  Next.js App Router pages, layouts, providers, and API route entrypoints.
  UI routes live under app/(app)/. API routes live under app/api/.

components/
  React UI components grouped by feature: board, dashboard, documents,
  navigation, settings, team, and timeline.

lib/
  Shared application code. This includes auth helpers, API route handlers,
  storage drivers, database schema and migrations, notification dispatch,
  Azure Blob helpers, demo mode helpers, and shared types.

scripts/
  Local maintenance scripts such as seed and database migration runners.

docs/
  Project documentation. Start with docs/README.md for architecture, API,
  frontend, auth, storage, and database planning notes.

docs/assets/
  Documentation-only screenshots and reference images.

public/
  Static assets served by Next.js. Runtime images referenced as /asset-name
  should live here, including public/logo.png.

data/
  Local JSON storage directory. JSON files are gitignored; data/.gitkeep keeps
  the folder in the repository.

Root config files
  package.json, package-lock.json, next.config.mjs, tsconfig.json,
  tailwind.config.ts, postcss.config.js, drizzle.config.ts, middleware.ts,
  next-env.d.ts, .env.example, and .gitignore configure the app and tooling.
```

## Documentation

- `docs/README.md` indexes all project docs.
- `docs/ARCHITECTURE.md` explains the app layers and data flow.
- `docs/API.md` lists the HTTP routes and their handlers.
- `docs/FRONTEND.md` explains pages, components, and demo mode.
- `docs/DATA_AND_STORAGE.md` explains storage drivers, Drizzle, migrations, and local data.
- `docs/MICROSOFT_AUTH.md` explains Microsoft login and Graph setup.
- `docs/ONLINE_SETUP.md` explains where to put production database, attachment,
  template, email, and access-control settings.
- `docs/DATABASE_PLAN.md` captures the database migration plan.

## Storage Notes

The default local storage driver writes to `data/db.json`. To reset local data,
delete that file and run `npm run seed` again.

Postgres support is structured around `lib/db/schema.ts`,
`lib/db/migrations/0001_init.sql`, and `lib/storage/postgresStore.ts`. Set
`STORAGE_DRIVER=postgres` and `DATABASE_URL=postgres://...` when the Postgres
driver is ready for use.
