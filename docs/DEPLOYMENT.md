# Deployment

## Prerequisites

- Azure Postgres database provisioned and accessible
- Microsoft Entra app registrations (see [MICROSOFT_AUTH.md](./MICROSOFT_AUTH.md))
- Database migrations applied: `DATABASE_URL="postgresql://..." npm run db:migrate`

## Netlify (current)

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

### Email (Microsoft Graph)

| Variable | Example | Description |
|----------|---------|-------------|
| `GRAPH_APP_TENANT_ID` | `0238ea43-...` | Tenant for Graph app |
| `GRAPH_APP_CLIENT_ID` | `<notifier app id>` | Graph app registration |
| `GRAPH_APP_CLIENT_SECRET` | `<secret>` | Graph app client secret |
| `NOTIFY_FROM_ADDRESS` | `notifications@geoconinc.com` | Sender mailbox |

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
- [ ] Database migrations applied (`npm run db:migrate`)
- [ ] MSAL redirect URI matches production URL in Azure app registration
- [ ] All required environment variables set on hosting platform
- [ ] SharePoint site/library accessible by Graph app
- [ ] Graph app has `Mail.Send` + `Sites.ReadWrite.All` with admin consent
- [ ] `CRON_SHARED_SECRET` set and cron job configured to call `/api/cron/due-dates`
- [ ] Test login flow end-to-end with a real `@geoconinc.com` account
- [ ] Verify file upload and download works
- [ ] Check email notifications are being sent

## Azure Postgres Firewall

If deploying to Netlify or any non-Azure host, you must add the host's outbound IPs to the Azure Postgres firewall rules:

1. Azure Portal → your Postgres server → **Networking**
2. Add firewall rules for the host's IP range
3. Or enable **"Allow public access from any Azure service"** if hosting on Azure

For Netlify, you can also use a connection pooler like PgBouncer or Neon's pooling endpoint to reduce connection overhead from serverless functions.
