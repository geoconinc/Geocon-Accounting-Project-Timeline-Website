# Deployment

## Prerequisites

- Azure Postgres database provisioned and accessible
- Microsoft Entra app registrations (see [MICROSOFT_AUTH.md](./MICROSOFT_AUTH.md))
- Database migrations applied: `DATABASE_URL="postgresql://..." npm run db:migrate`

## Render (recommended for test / staging)

The repo includes `render.yaml` for a **Web Service** (Node 20, SSR + API routes). Render runs `next start` as a persistent Node process — SSE and sessions work without serverless workarounds.

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

### Setup

1. Create App Service (Linux, Node 20).
2. Set environment variables in Configuration → Application settings.
3. Deploy via GitHub Actions or Azure DevOps.

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

### File Storage (choose one)

**SharePoint (recommended):**

| Variable | Example | Description |
|----------|---------|-------------|
| `FILE_STORAGE_DRIVER` | `sharepoint` | |
| `SHAREPOINT_HOSTNAME` | `geoconinc.sharepoint.com` | |
| `SHAREPOINT_SITE_PATH` | `/sites/YourSite` | |
| `SHAREPOINT_LIBRARY_NAME` | `Documents` | Defaults to `Documents` |
| `SHAREPOINT_FOLDER_ROOT` | `Geocon Project Timeline` | Subfolder for attachments |

**Azure Blob (alternative):**

| Variable | Example | Description |
|----------|---------|-------------|
| `FILE_STORAGE_DRIVER` | `blob` | |
| `AZURE_STORAGE_ACCOUNT` | `geoconstorage` | |
| `AZURE_STORAGE_CONTAINER` | `geocon-files` | |
| `AZURE_STORAGE_KEY` | `<access key>` | |

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
- Database migrations applied (`DATABASE_URL="..." npm run db:migrate`)
- [ ] MSAL redirect URI matches production URL in Azure app registration
- [ ] All required environment variables set on hosting platform
- [ ] SharePoint site/library accessible by Graph app
- [ ] SMTP vars set (`EMAIL_DRIVER=smtp`, host, user, password) — see [EMAIL_NOTIFICATIONS.md](./EMAIL_NOTIFICATIONS.md)
- [ ] (If using SharePoint) Graph app has `Sites.ReadWrite.All` with admin consent
- [ ] `CRON_SHARED_SECRET` set and cron jobs for due-dates / das-followup (optional)
- [ ] Test login flow end-to-end with a real `@geoconinc.com` account
- [ ] (If using SharePoint) Verify file upload and download works
- [ ] Send a test notification from the board and confirm email delivery

## Azure Postgres Firewall

If deploying to Render, Netlify, or any non-Azure host, you must allow the host to reach Postgres:

1. Azure Portal → your Postgres server → **Networking**
2. Add firewall rules for the host's IP range
3. Or enable **"Allow public access from any Azure service"** if hosting on Azure

For Netlify, you can also use a connection pooler like PgBouncer or Neon's pooling endpoint to reduce connection overhead from serverless functions.
