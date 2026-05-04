# Geocon Project Timeline

A Monday.com-style project timeline and management app for Geocon. Built with
Next.js 14 (App Router), TypeScript, Tailwind, and MSAL. Authentication is
restricted to `@geoconinc.com` Microsoft accounts.

- Microsoft (MSAL) login → Graph `/me` verification → server-issued session cookie
- Three groups: **Current**, **Future**, **Completed** — projects auto-archive when set to Completed
- Project rows with subitems, drag-reorder, N/A auto-sort, status percentage bar
- Freeze pane: Project / Owner / Status are sticky; horizontal scroll starts at Subitems Status
- File uploads to Azure Blob (SAS upload + read URLs)
- Live multi-user updates via Server-Sent Events
- Email notifications via Microsoft Graph `sendMail`
- Storage layer is swappable: JSON files now (`data/db.json`), Postgres ready as a template

## Quick start (local, JSON storage)

```bash
npm install
cp .env.example .env
# Fill in NEXT_PUBLIC_MSAL_CLIENT_ID / TENANT_ID and SESSION_SECRET at minimum.
npm run seed     # optional, seeds the screenshots' data
npm run dev      # http://localhost:3000
```

You can sign in with any `@geoconinc.com` Microsoft account once the app is
registered (see Azure setup below). For uploads to actually work you need the
Azure Storage env vars; for emails you need the Graph app credentials.

## Environment variables

See `.env.example` for the full list. Highlights:

| Var | Purpose |
| --- | --- |
| `NEXT_PUBLIC_MSAL_CLIENT_ID` / `TENANT_ID` | Geocon AAD app registration |
| `NEXT_PUBLIC_MSAL_REDIRECT_URI` | e.g. `http://localhost:3000` or your prod URL |
| `SESSION_SECRET` | Random string used as a marker; sessions are stored server-side |
| `STORAGE_DRIVER` | `json` (default) or `postgres` |
| `DATABASE_URL` | Postgres connection (only when STORAGE_DRIVER=postgres) |
| `AZURE_STORAGE_ACCOUNT` / `KEY` / `CONTAINER` | Blob storage for file uploads |
| `GRAPH_APP_TENANT_ID` / `CLIENT_ID` / `CLIENT_SECRET` | App-only Graph token for sendMail |
| `NOTIFY_FROM_ADDRESS` | The mailbox email is sent from |
| `CRON_SHARED_SECRET` | Header secret for `/api/cron/due-dates` |
| `ALLOWED_EMAIL_DOMAIN` | Defaults to `geoconinc.com` |

## Azure setup

### 1. App Registration (for MSAL login)

1. Go to **Microsoft Entra ID → App registrations → New registration**.
2. Name: `Geocon Project Timeline`. Supported accounts: *Single tenant (Geocon)*.
3. Redirect URI (SPA): `http://localhost:3000` for dev, plus your production
   URL (e.g. `https://geocon-timeline.azurewebsites.net`).
4. Under **API permissions**, add Microsoft Graph **User.Read** (delegated). Grant admin consent.
5. Copy the **Application (client) ID** → `NEXT_PUBLIC_MSAL_CLIENT_ID`, and
   **Directory (tenant) ID** → `NEXT_PUBLIC_MSAL_TENANT_ID`.

### 2. App Registration (for app-only sendMail) — optional

If you want server-sent emails:

1. Create a second app registration (e.g. `Geocon Timeline Notifier`).
2. **API permissions → Add → Microsoft Graph → Application permissions → Mail.Send**. Grant admin consent.
3. **Certificates & secrets → New client secret**. Copy the secret value.
4. Restrict the app to a single mailbox via an
   [Application Access Policy](https://learn.microsoft.com/en-us/graph/auth-limit-mailbox-access)
   on `NOTIFY_FROM_ADDRESS` so this app can only send from that one mailbox.
5. Set `GRAPH_APP_TENANT_ID`, `GRAPH_APP_CLIENT_ID`, `GRAPH_APP_CLIENT_SECRET`,
   `NOTIFY_FROM_ADDRESS` in env.

### 3. Azure Blob Storage (for file uploads)

1. Create a Storage Account, then a container (e.g. `geocon-files`, private).
2. Add a CORS rule to allow `PUT` from your app origin:
   - Allowed origins: `http://localhost:3000`, `https://geocon-timeline.azurewebsites.net`
   - Allowed methods: `PUT, GET`
   - Allowed headers: `*`
   - Exposed headers: `*`
   - Max age: `3600`
3. Copy the account name + an access key into env, or use a Managed Identity in App Service.

### 4. Azure App Service (deploy)

1. Create a Linux App Service (Node 20 LTS) in your Azure subscription.
2. Set all env vars above under **Configuration → Application settings**.
3. Deploy via GitHub Actions, `az webapp deploy`, or Azure DevOps.
4. Set the App Service **Always On = true** so SSE streams stay healthy.
5. Add the App Service URL to the AAD app's Redirect URIs.

> Note: the in-process SSE bus is single-instance. If you scale out to multiple
> App Service instances, swap `lib/events/bus.ts` for Azure SignalR or
> Redis pub/sub.

### 5. Daily due-date notifications

Configure a daily timer to POST `/api/cron/due-dates` with header
`x-cron-secret: $CRON_SHARED_SECRET`. Easiest options:

- **Azure Logic Apps**: HTTP recurrence trigger, daily at 8am.
- **App Service WebJob**: a tiny shell script + `curl` on a cron schedule.
- **GitHub Actions** scheduled workflow hitting your prod URL.

## Switching from JSON to Azure PostgreSQL

The Postgres schema is already defined in [`lib/db/schema.ts`](lib/db/schema.ts)
and an idempotent migration is at
[`lib/db/migrations/0001_init.sql`](lib/db/migrations/0001_init.sql).

1. Provision **Azure Database for PostgreSQL Flexible Server**. Add your client
   IP / App Service outbound IPs to the firewall.
2. Set `DATABASE_URL=postgres://...` and `STORAGE_DRIVER=postgres`.
3. Apply the migration:
   ```bash
   npm run db:migrate
   ```
   Or run `psql "$DATABASE_URL" -f lib/db/migrations/0001_init.sql`.
4. Implement the queries in `lib/storage/postgresStore.ts` (template provided —
   each method maps 1:1 to its `jsonStore` counterpart). Once that's filled in
   and `STORAGE_DRIVER=postgres`, no other code changes are needed.

The JSON DB lives at `data/db.json` and is gitignored. To reset it, delete that
file and re-run `npm run seed`.

## Project layout

```
app/                 Next.js routes (UI + API)
components/board/    Board, rows, cells, popovers
lib/auth/            MSAL config, session cookie helpers
lib/storage/         json / postgres drivers behind one interface
lib/db/              Drizzle schema + SQL migration
lib/events/bus.ts    SSE pub/sub
lib/blob/sas.ts      Azure Blob SAS helpers
lib/notify/          Graph sendMail + dispatch
scripts/seed.ts      Seeds the screenshots' data
data/                JSON store (gitignored)
public/logo.png      Geocon logo
```

## Deferred (per the requirements doc)

These are intentionally not in v1; the data model already supports them:

- Dashboard view
- Document Hub (template storage)
- Search / Filter / Hide / Sort / Group toolbar UI
