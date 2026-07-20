# Deployment — Azure App Service

Production runs on **Azure App Service** (Node 22) with **Azure Postgres**.
Deployment is automated by `.github/workflows/azure-deploy.yml`: on every push to
`main`, GitHub builds the app, applies database migrations, and deploys a
pre-built artifact (so the App Service never runs `next build`).

## Prerequisites

- Azure Postgres provisioned and accessible
- Microsoft Entra app registrations (see [MICROSOFT_AUTH.md](./MICROSOFT_AUTH.md))
- App Service plan **B1 or higher** with **Always On** enabled (required for
  production traffic; Free/F1 is not suitable)

## 1. Create the App Service

1. Azure Portal → **Create a resource** → **Web App**.
2. Publish: **Code**. Runtime stack: **Node 22 LTS**. Operating System: **Linux**.
3. Region: same as your Postgres server. Plan: **B1** or higher.
4. After creation, open the app → **Configuration** → **General settings**:
   - **Startup Command:** `npm start`
   - **Always On:** On
   - Save. (Azure injects `PORT`; `next start` binds to it automatically.)

Live URL shape (default hostname may include a unique suffix):

```text
https://YOUR-APP.azurewebsites.net
```

## 2. Let the app reach Postgres

Azure Portal → your Postgres server → **Networking** → enable
**"Allow public access from any Azure service within Azure"** (or add the App
Service outbound IPs). The `DATABASE_URL` must include `?sslmode=require`.

## 3. Runtime environment variables

App Service → **Configuration** → **Application settings** → add each row from
the [Environment Variables](#environment-variables) tables below. At minimum:
`STORAGE_DRIVER=postgres`, `DATABASE_URL`, `ALLOWED_EMAIL_DOMAIN`, `APP_BASE_URL`,
`BOARD_ADMIN_EMAILS`, the `SMTP_*` / `NOTIFY_*` email vars, `CRON_SHARED_SECRET`,
and `GMS_INTEGRATION_API_KEY`.

> `NEXT_PUBLIC_*` values are baked into the client bundle **at build time**, so
> they are set as **GitHub repo secrets** (step 4), not here. Setting them only
> in App Service has no effect on the client bundle.

Leave **`SCM_DO_BUILD_DURING_DEPLOYMENT`** unset/`false` — the artifact is
already built.

## 4. Configure the GitHub Actions deploy

1. In `.github/workflows/azure-deploy.yml`, set `AZURE_WEBAPP_NAME` to your App
   Service name (resource name, not the full hostname).
2. App Service → **Overview** → **Download publish profile**. Add its full XML
   as the repo secret **`AZURE_WEBAPP_PUBLISH_PROFILE`**
   (GitHub → Settings → Secrets and variables → Actions).
3. Add these repo secrets (used at build/migration time in CI):

   | Secret | Value |
   |--------|-------|
   | `NEXT_PUBLIC_MSAL_CLIENT_ID` | Azure app registration client ID |
   | `NEXT_PUBLIC_MSAL_TENANT_ID` | Azure tenant ID |
   | `NEXT_PUBLIC_MSAL_REDIRECT_URI` | Production URL (must include `https://`) |
   | `NEXT_PUBLIC_SUPER_ADMIN_EMAIL` | Email allowed into `/settings/admin` |
   | `NEXT_PUBLIC_ALLOWED_DOMAIN` | `geoconinc.com` (optional, login page) |
   | `NEXT_PUBLIC_DAS_FORMS_FOLDER` | DAS forms network path (optional) |
   | `DATABASE_URL` | Production Postgres URL (for migrations) |

## 5. Deploy

Push to `main` (or run the workflow manually via **Actions → Deploy to Azure App
Service → Run workflow**). The workflow builds, migrates, prunes dev deps, and
deploys.

## 6. Point auth at the real URL

Azure Entra → your login app registration → **Authentication** → add the SPA
redirect URI matching your production URL exactly (including `https://`, no
trailing slash mismatch). It must match `NEXT_PUBLIC_MSAL_REDIRECT_URI`.

## 7. Verify

Open `https://YOUR-APP.azurewebsites.net/login`, sign in with `@geoconinc.com`,
confirm the board loads and edits save.

## Cron jobs on Azure

Use **Azure Container Apps Jobs**, a **Logic App**, or any scheduler to `POST`
daily to the cron endpoints with the `X-Cron-Secret` header:

```bash
curl -sS -X POST -H "X-Cron-Secret: <CRON_SHARED_SECRET>" \
  "https://YOUR-APP.azurewebsites.net/api/cron/incomplete-week"
```

Endpoints: `/api/cron/incomplete-week`, `/api/cron/due-dates`, `/api/cron/das-followup`.

## Environment Variables

### Required

| Variable | Example | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_MSAL_CLIENT_ID` | `414ffe1f-...` | Azure app registration client ID |
| `NEXT_PUBLIC_MSAL_TENANT_ID` | `0238ea43-...` | Azure tenant ID |
| `NEXT_PUBLIC_MSAL_REDIRECT_URI` | `https://your-app.azurewebsites.net` | Must match Entra SPA redirect URI |
| `ALLOWED_EMAIL_DOMAIN` | `geoconinc.com` | Server-side login domain check |
| `STORAGE_DRIVER` | `postgres` | Must be `postgres` for production |
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db?sslmode=require` | Postgres connection string |
| `APP_BASE_URL` | `https://your-app.azurewebsites.net` | Used in email notification links |

### File Storage

Attachments are stored **directly in PostgreSQL** (`files.data` bytea column,
max 25 MB per file). No external storage account is required.

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
| `CRON_SHARED_SECRET` | `<random string>` | Auth for `/api/cron/*` |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_ALLOWED_DOMAIN` | `geoconinc.com` | Displayed on login page |
| `NEXT_PUBLIC_DAS_FORMS_FOLDER` | *(none)* | Local network path for DAS forms |

## Production Checklist

- [ ] App Service plan is **B1+** with **Always On** enabled
- [ ] Azure Postgres firewall allows Azure services (or App Service outbound IPs)
- [ ] Database migrations applied (CI runs them on deploy)
- [ ] MSAL redirect URI matches production URL in Entra app registration
- [ ] All required runtime env vars set in App Service → Application settings
- [ ] `NEXT_PUBLIC_*` set as GitHub repo secrets (baked at build time)
- [ ] SMTP vars set (`EMAIL_DRIVER=smtp`, host, user, password) — see [EMAIL_NOTIFICATIONS.md](./EMAIL_NOTIFICATIONS.md)
- [ ] `CRON_SHARED_SECRET` set and cron jobs scheduled (optional)
- [ ] `GMS_INTEGRATION_API_KEY` set (must match the key GMS sends)
- [ ] Test login end-to-end with a real `@geoconinc.com` account
- [ ] Verify file upload and download on a project/subitem
- [ ] Send a test notification from the board and confirm email delivery
- [ ] Send a test GMS webhook and confirm the project appears (see caller spec)

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
