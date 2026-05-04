# Frontend

## App Router structure

- **`app/(app)/`** — Authenticated shell: layout, home, dashboard, timeline, documents, team, settings.
- **`app/login/`** — Microsoft sign-in flow (MSAL).
- **`app/layout.tsx`**, **`app/providers.tsx`** — Root layout and client providers.

## Components

- **`components/AppShell.tsx`**, **`TopBar.tsx`**, **`nav/Sidebar.tsx`** — Chrome and navigation.
- **`components/board/*`** — Board, rows, cells, drag-and-drop, dialogs. These import the HTTP/demo facade from **`@/lib/client/boardApi`** (`api`, `uploadFileDemo`).
- **`components/dashboard/`**, **`timeline/`**, **`documents/`**, **`team/`**, **`settings/`** — Feature views.

## Demo mode

**`lib/demo/config.ts`** — `NEXT_PUBLIC_DEMO_MODE` gates client behavior.

When demo is on:

- **`lib/client/boardApi.ts`** uses **`lib/demo/localStore`** instead of network calls for board operations.
- **`middleware.ts`** skips auth enforcement so the app can be explored without Microsoft login.

Production deployments typically set demo mode off and configure auth + storage + blob env vars as described in **`docs/ARCHITECTURE.md`** and **`docs/DATA_AND_STORAGE.md`**.

## Styling

Tailwind CSS (**`tailwind.config.ts`**, **`app/globals.css`**). Use existing utility patterns when adding UI.
