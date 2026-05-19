# Frontend

## App Router Structure

### Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `Board` | Main project board — grouped by Current / Future / Completed |
| `/dashboard` | `DashboardView` | Project health overview with stats, charts, due dates |
| `/timeline` | `TimelineView` | 60-day Gantt-style timeline |
| `/team` | `TeamView` | Team member directory |
| `/documents` | `DocumentsView` | Document templates (DAS forms, local network paths) |
| `/settings` | `SettingsView` | User notification preferences |
| `/settings/admin` | `AdminSettingsView` | Office assignees and role roster management (super-admin only) |
| `/login` | `LoginPage` | Microsoft SSO sign-in |

### Route Groups

- **`app/(app)/`** — Authenticated shell. The layout fetches the current user, redirects to `/login` if unauthenticated, and renders Sidebar + TopBar chrome.
- **`app/login/`** — Public login page. Uses MSAL popup flow.
- **`app/api/`** — API routes. Each `route.ts` re-exports handlers from `lib/server/features/`.

### Layouts

- **`app/layout.tsx`** — Root HTML shell with Tailwind globals and `<Providers>` (MSAL).
- **`app/(app)/layout.tsx`** — Authenticated layout: `Sidebar` + `TopBar` + content area. Redirects to `/login` if no session.
- **`app/providers.tsx`** — Initializes MSAL `PublicClientApplication` and wraps children in `<MsalProvider>`.

## Components

### Shell
- **`TopBar`** — User avatar, name, and logout button with confirmation dialog.
- **`nav/Sidebar`** — Navigation links for Board, Dashboard, Timeline, Team, Documents, Settings.

### Board (`components/features/board/`)
Core project management grid:

| Component | Purpose |
|-----------|---------|
| `Group` | Renders a project group (Current/Future/Completed) with add-project button |
| `ProjectRow` | Expandable project row with inline-editable cells |
| `SubitemRow` | Task row within an expanded project |
| `Toolbar` | Search, filters (status, owner, "my items"), hide-completed toggle |
| `AddProjectDialog` | Modal for creating new projects with office/PM/director selection |
| `StatusCell` | Project and subitem status dropdowns with color indicators |
| `OwnerCell` | User picker popover with search |
| `DateCell` | Date picker cell |
| `TextCell` | Inline-editable text cell |
| `FilesCell` | File upload button + file list with download links |
| `NotificationButton` | Send email update to project assignees with optional attachments |
| `SharePointCell` | Link to project SharePoint folder |
| `Avatar` | User avatar with initials |
| `Popover` | Reusable click-outside-to-close popover hook |

### State Management

**`components/features/board/state.ts`** — `useBoardState` hook:
- Initializes from server-rendered `BoardData` prop.
- Subscribes to SSE events for real-time updates.
- Polls `/api/projects` every 30 seconds as a fallback (required for serverless deployments).
- Exposes `dispatch` for optimistic local updates.

No global state library — each view fetches its own data from `/api/projects` on mount.

## Client API Layer

**`lib/client/boardApi.ts`** — Typed fetch wrappers for all API endpoints. Components call `api.patchProject()`, `api.requestUploadSas()`, etc. rather than raw `fetch()`.

**`lib/client/roleAssigneesApi.ts`** — Fetches project manager and director rosters.

## Styling

Tailwind CSS with a custom brand palette defined in `tailwind.config.ts`. Status colors (`status-completed`, `status-progress`, `status-missing`, etc.) are used throughout the board cells and dashboard.
