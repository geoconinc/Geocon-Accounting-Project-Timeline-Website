# Deployment

## Prerequisites

- Azure Postgres database provisioned and accessible
- Microsoft Entra app registrations (see [MICROSOFT_AUTH.md](./MICROSOFT_AUTH.md))
- Database migrations applied: `DATABASE_URL="postgresql://..." npm run db:migrate`

## Render (recommended for test / staging)

The repo includes `render.yaml` for a **Web Service** (Node 22, SSR + API routes). Render runs `next start` as a persistent Node process — SSE and sessions work without serverless workarounds.

### 1. Postgres

**Option A — Render Postgres (simplest)**

1. Render dashboard → **New** → **PostgreSQL**.
2. Create the database in the same region as the web service.
3. Copy the **Internal Database URL** (if web + DB are on Render) or **External Database URL** (if DB is elsewhere).

**Option B — Azure Postgres (already set up)**

1. Azure Portal → Postgres server → **Networking** → allow Render to connect.
   - Easiest for testing: temporarily allow all IPs (`0.0.0.0`–`255.255.255.255`), then tighten later.
   - Or use Render’s [outbound IP list](https://render.com/docs/static-outbound-ip-addresses) on paid plans.
2. Use the Azure connection string as `DATABASE_URL` (must include `sslmode=require`).

### 2. Run migrations (once, before first deploy — and again after pulling schema changes)

From your machine, pointing at the **production** database:

```bash
DATABASE_URL="postgresql://..." npm run db:migrate
```

The migrator tracks applied files in `schema_migrations` and skips ones already run. If you deploy code that expects a new column (e.g. `subitems.created_at`) and forget this step, the app will crash with `column "created_at" does not exist`.

After deploying the one-week email cron, you **must** apply through at least `0006_subitem_created_at.sql`.

Optional seed data:

```bash
DATABASE_URL="postgresql://..." npm run seed
```

### 3. Create the web service

**Blueprint (uses `render.yaml`):**

1. Push this repo to GitHub.
2. Render → **New** → **Blueprint** → connect the repo → apply.

**Or manual Web Service:**

| Setting | Value |
|---------|--------|
| Environment | Node |
| Build Command | `npm ci && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/login` |

Do **not** set `PORT` — Render injects it automatically.

### 4. Environment variables (Render → Environment)

Set these **before the first build** (especially all `NEXT_PUBLIC_*` vars):

| Variable | Value |
|----------|--------|
| `STORAGE_DRIVER` | `postgres` |
| `DATABASE_URL` | Your Postgres connection string |
| `NEXT_PUBLIC_MSAL_CLIENT_ID` | *(already set up)* |
| `NEXT_PUBLIC_MSAL_TENANT_ID` | *(already set up)* |
| `NEXT_PUBLIC_MSAL_REDIRECT_URI` | `https://YOUR-SERVICE.onrender.com` |
| `APP_BASE_URL` | `https://YOUR-SERVICE.onrender.com` |
| `ALLOWED_EMAIL_DOMAIN` | `geoconinc.com` |
| `BOARD_ADMIN_EMAILS` | Your admin email(s), comma-separated |
| `NEXT_PUBLIC_SUPER_ADMIN_EMAIL` | Email for `/settings/admin` |

Add SharePoint / Graph vars if you want file uploads and email (see tables below).

After Render assigns your URL, update **both**:

- Render env: `NEXT_PUBLIC_MSAL_REDIRECT_URI` and `APP_BASE_URL`
- Azure Entra → your login app → **Authentication** → SPA redirect URI: `https://YOUR-SERVICE.onrender.com`

Then trigger **Manual Deploy** so the client bundle picks up the new `NEXT_PUBLIC_*` values.

### 5. Deploy and verify

1. Deploy completes → open `https://YOUR-SERVICE.onrender.com/login`.
2. Sign in with `@geoconinc.com`.
3. Confirm the board loads and you can edit a project.

### 6. Cron job (one-week incomplete reminder)

1. Run migrations on production if you have not since adding `subitems.created_at`:
   `DATABASE_URL="postgresql://..." npm run db:migrate`
2. Generate a random string for `CRON_SHARED_SECRET` and set it on the web service.
3. Render → **New** → **Cron Job**:

- **Schedule:** `0 14 * * *` (daily 2pm UTC — adjust as needed)
- **Command:**  
  `curl -sS -X POST -H "X-Cron-Secret: $CRON_SHARED_SECRET" "$APP_BASE_URL/api/cron/incomplete-week"`

Set `CRON_SHARED_SECRET` and `APP_BASE_URL` on both the web service and the cron job.

### Render notes

- **Free tier** spins down after ~15 minutes idle; first load may take 30–60s.
- **Starter** ($7/mo) avoids spin-down for demos.
- File uploads need SharePoint or Azure Blob configured; the board works without them.

## Netlify

The repo includes `netlify.toml` configured for Next.js via `@netlify/plugin-nextjs`.

### Setup

1. Connect the GitHub repo in Netlify.
2. Set environment variables (see table below).
3. Deploy — Netlify auto-builds on push.

### Limitations on Netlify

- **SSE**: Server-Sent Events may not persist across serverless function invocations. The app includes a 30-second polling fallback.
- **Filesystem**: Ephemeral — admin site config is stored in Postgres (not the filesystem).
- **Cold starts**: First request after idle may be slower.

## Azure App Service (production)

For production with a custom domain, Azure App Service B1 (~$13/mo) provides:
- Persistent Node.js runtime (SSE works natively)
- Same Azure network as Postgres (low latency, simplified firewall)
- Custom domain with free managed SSL

Deployment is automated by `.github/workflows/azure-deploy.yml`, which builds on
GitHub's runners, applies migrations, and ships a **pre-built** artifact so the
B1 instance never has to run `next build` itself.

### 1. Create the App Service

1. Azure Portal → **Create a resource** → **Web App**.
2. Publish: **Code**. Runtime stack: **Node 22 LTS**. Operating System: **Linux**.
3. Region: same as your Postgres server. Plan: **B1** or higher.
4. After creation, open the app → **Configuration** → **General settings**:
   - **Startup Command:** `npm start`
   - Save. (Azure injects `PORT`; `next start` binds to it automatically.)

### 2. Let the app reach Postgres

Azure Portal → your Postgres server → **Networking** → enable
**"Allow public access from any Azure service within Azure"** (or add the App
Service outbound IPs). The `DATABASE_URL` must include `?sslmode=require`.

### 3. Runtime environment variables

App Service → **Configuration** → **Application settings** → add each row from
the [Environment Variables](#environment-variables) tables below. At minimum:
`STORAGE_DRIVER=postgres`, `DATABASE_URL`, `ALLOWED_EMAIL_DOMAIN`, `APP_BASE_URL`,
`BOARD_ADMIN_EMAILS`, the `SMTP_*` / `NOTIFY_*` email vars, `CRON_SHARED_SECRET`,
and `GMS_INTEGRATION_API_KEY`.

> `NEXT_PUBLIC_*` values are baked into the client bundle **at build time**, so
> they are set as **GitHub repo secrets** (step 4), not here. Setting them here
> has no effect on the client bundle.

Leave **`SCM_DO_BUILD_DURING_DEPLOYMENT`** unset/`false` — the artifact is
already built.

### 4. Configure the GitHub Actions deploy

1. In `.github/workflows/azure-deploy.yml`, set `AZURE_WEBAPP_NAME` to your App
   Service name.
2. App Service → **Overview** → **Download publish profile**. Add its full XML
   as the repo secret **`AZURE_WEBAPP_PUBLISH_PROFILE`**
   (GitHub → Settings → Secrets and variables → Actions).
3. Add these repo secrets (used at build/migration time in CI):

   | Secret | Value |
   |--------|-------|
   | `NEXT_PUBLIC_MSAL_CLIENT_ID` | Azure app registration client ID |
   | `NEXT_PUBLIC_MSAL_TENANT_ID` | Azure tenant ID |
   | `NEXT_PUBLIC_MSAL_REDIRECT_URI` | `https://YOUR-APP.azurewebsites.net` (or custom domain) |
   | `NEXT_PUBLIC_SUPER_ADMIN_EMAIL` | Email allowed into `/settings/admin` |
   | `NEXT_PUBLIC_ALLOWED_DOMAIN` | `geoconinc.com` (optional, login page) |
   | `NEXT_PUBLIC_DAS_FORMS_FOLDER` | DAS forms network path (optional) |
   | `DATABASE_URL` | Production Postgres URL (for migrations) |

### 5. Deploy

Push to `main` (or run the workflow manually via **Actions → Deploy to Azure App
Service → Run workflow**). The workflow builds, migrates, prunes dev deps, and
deploys.

### 6. Point auth at the real URL

Azure Entra → your login app registration → **Authentication** → add the SPA
redirect URI `https://YOUR-APP.azurewebsites.net` (and your custom domain). It
must match `NEXT_PUBLIC_MSAL_REDIRECT_URI`.

### 7. Verify

Open `https://YOUR-APP.azurewebsites.net/login`, sign in with `@geoconinc.com`,
confirm the board loads and edits save.

### Cron jobs on Azure

Use **Azure Container Apps Jobs**, a **Logic App**, or any scheduler to `POST`
daily to the cron endpoints with the `X-Cron-Secret` header:

```bash
curl -sS -X POST -H "X-Cron-Secret: <CRON_SHARED_SECRET>" \
  "https://YOUR-APP.azurewebsites.net/api/cron/incomplete-week"
```

Endpoints: `/api/cron/incomplete-week`, `/api/cron/due-dates`, `/api/cron/das-followup`.

## Environment Variables

Set all of these on your hosting platform:

### Required

| Variable | Example | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_MSAL_CLIENT_ID` | `414ffe1f-...` | Azure app registration client ID |
| `NEXT_PUBLIC_MSAL_TENANT_ID` | `0238ea43-...` | Azure tenant ID |
| `NEXT_PUBLIC_MSAL_REDIRECT_URI` | `https://your-site.com` | Must match Azure app registration |
| `ALLOWED_EMAIL_DOMAIN` | `geoconinc.com` | Server-side login domain check |
| `STORAGE_DRIVER` | `postgres` | Must be `postgres` for production |
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db?sslmode=require` | Postgres connection string |
| `APP_BASE_URL` | `https://your-site.com` | Used in email notification links |

### File Storage

Attachments are stored **directly in PostgreSQL** (`files.data` bytea column,
max 10 MB per file). No external storage account or extra configuration is
required — nothing to set here.

### GMS integration (proposal system → project timeline)

| Variable | Example | Description |
|----------|---------|-------------|
| `GMS_INTEGRATION_API_KEY` | `<random string>` | Shared secret GMS sends in the `X-Integration-Key` header |

See [GMS Integration — Caller Spec](#gms-integration--caller-spec) for the exact
request GMS must send.

### Email (SMTP — recommended)

See [EMAIL_NOTIFICATIONS.md](./EMAIL_NOTIFICATIONS.md) for all template types.

| Variable | Example | Description |
|----------|---------|-------------|
| `EMAIL_DRIVER` | `smtp` | `smtp` or `graph` |
| `SMTP_HOST` | `smtp.office365.com` | SMTP server |
| `SMTP_PORT` | `587` | Usually 587 (STARTTLS) |
| `SMTP_SECURE` | `false` | `true` for port 465 only |
| `SMTP_USER` | `notifications@geoconinc.com` | SMTP login |
| `SMTP_PASSWORD` | `<app password>` | Mailbox / app password |
| `NOTIFY_FROM_ADDRESS` | `notifications@geoconinc.com` | From address |
| `NOTIFY_FROM_NAME` | `Geocon Project Management` | Display name |

**Graph email (optional fallback):**

| Variable | Example | Description |
|----------|---------|-------------|
| `GRAPH_APP_TENANT_ID` | `0238ea43-...` | Tenant for Graph app |
| `GRAPH_APP_CLIENT_ID` | `<notifier app id>` | Graph app registration |
| `GRAPH_APP_CLIENT_SECRET` | `<secret>` | Graph app client secret |

### Access Control

| Variable | Example | Description |
|----------|---------|-------------|
| `BOARD_ADMIN_EMAILS` | `admin@geoconinc.com,manager@geoconinc.com` | Comma-separated full-access emails |
| `NEXT_PUBLIC_SUPER_ADMIN_EMAIL` | `mundra@geoconinc.com` | Access to `/settings/admin` |
| `CRON_SHARED_SECRET` | `<random string>` | Auth for `/api/cron/due-dates` |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_ALLOWED_DOMAIN` | `geoconinc.com` | Displayed on login page |
| `NEXT_PUBLIC_DAS_FORMS_FOLDER` | *(none)* | Local network path for DAS forms |

## Production Checklist

- [ ] Azure Postgres firewall allows app host IP (or "Allow Azure services")
- [ ] Database migrations applied (CI runs them, or `DATABASE_URL="..." npm run db:migrate`)
- [ ] MSAL redirect URI matches production URL in Azure app registration
- [ ] All required runtime env vars set in App Service → Application settings
- [ ] `NEXT_PUBLIC_*` set as GitHub repo secrets (baked at build time)
- [ ] SMTP vars set (`EMAIL_DRIVER=smtp`, host, user, password) — see [EMAIL_NOTIFICATIONS.md](./EMAIL_NOTIFICATIONS.md)
- [ ] `CRON_SHARED_SECRET` set and cron jobs scheduled (optional)
- [ ] `GMS_INTEGRATION_API_KEY` set (must match the key GMS sends)
- [ ] Test login flow end-to-end with a real `@geoconinc.com` account
- [ ] Verify file upload and download works on a project/subitem
- [ ] Send a test notification from the board and confirm email delivery
- [ ] Send a test GMS webhook and confirm the project appears (see caller spec)

## Azure Postgres Firewall

If deploying to Render, Netlify, or any non-Azure host, you must allow the host to reach Postgres:

1. Azure Portal → your Postgres server → **Networking**
2. Add firewall rules for the host's IP range
3. Or enable **"Allow public access from any Azure service"** if hosting on Azure

For Netlify, you can also use a connection pooler like PgBouncer or Neon's pooling endpoint to reduce connection overhead from serverless functions.

## GMS Integration — Caller Spec

The Project Timeline is the **receiver**. GMS (the proposal system) must call the
webhook below when a proposal is won. This is the only work required on the GMS
side to link the two systems.

**Endpoint**

```
POST {APP_BASE_URL}/api/integrations/gms/projects
```

**Headers**

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |
| `X-Integration-Key` | Must exactly equal `GMS_INTEGRATION_API_KEY` set on the app |

**Body** (JSON)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `projectNumber` | string | ✅ | Project code; primary dedupe key |
| `projectName` | string | ✅ | |
| `officeCode` | string | ✅ | GMS office code — one of `SD, SA, EB, RK, RV, LA, OC, SB`. Others are ignored (project created with no office). |
| `projectManager` | `{ name, email }` | ✅ | `email` must be `@geoconinc.com` |
| `projectDirector` | `{ name, email }` | ✅ | `email` must be `@geoconinc.com` |
| `gmsProposalId` | string | optional | Secondary dedupe key; store it to allow updates |
| `proposalNumber` | string | optional | Shown in project notes |
| `clientName` | string | optional | Shown in project notes |
| `company` | string | optional | Shown in project notes |
| `officeName` | string | optional | Fallback if `officeCode` is unmapped |
| `feeEstimate` | number | optional | Shown in project notes |
| `wonDate` | string | optional | ISO date; becomes the project start date |
| `dueDate` | string | optional | ISO date; becomes the timeline end date |

**Behavior**

- **Dedupe:** matches an existing project by `projectNumber`, then by
  `gmsProposalId`. If found it **updates**; otherwise it **creates** a new project
  with the default DAS subitems and sends creation emails.
- PM/Director users are auto-created (upserted) if they don't exist.
- Office codes map to timeline offices via `lib/domain/gmsOfficeMap.ts`.

**Responses**

| Status | Meaning |
|--------|---------|
| `201` | Created a new project — body `{ ok: true, created: true, project: { id, code } }` |
| `200` | Updated an existing project — body `{ ok: true, created: false, project: { id, code } }` |
| `400` | `invalid_json`, `invalid_payload` (with Zod `details`), or `invalid_email_domain` |
| `401` | Missing/incorrect `X-Integration-Key` |
| `500` | `update_failed` |

**Example**

```bash
curl -X POST "https://YOUR-APP.azurewebsites.net/api/integrations/gms/projects" \
  -H "Content-Type: application/json" \
  -H "X-Integration-Key: $GMS_INTEGRATION_API_KEY" \
  -d '{
    "projectNumber": "SD-2026-0142",
    "projectName": "Harbor Drive Bridge Retrofit",
    "gmsProposalId": "gms-abc-123",
    "proposalNumber": "P-2026-0142",
    "clientName": "Caltrans District 11",
    "officeCode": "SD",
    "projectManager": { "name": "Jane Doe", "email": "jdoe@geoconinc.com" },
    "projectDirector": { "name": "John Roe", "email": "jroe@geoconinc.com" },
    "feeEstimate": 125000,
    "wonDate": "2026-07-10",
    "dueDate": "2026-12-31"
  }'
```

> Idempotency: because dedupe is by `projectNumber`/`gmsProposalId`, GMS can safely
> retry. Sending the same proposal again updates the existing project rather than
> creating a duplicate.
