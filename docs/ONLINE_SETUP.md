# Online Setup

This app should use Microsoft-native services for files, templates, auth, and
email, with Postgres for structured application data.

## Recommended Production Layout

- App hosting: Azure App Service, Vercel, or another Node 20 host.
- Database: Azure Database for PostgreSQL Flexible Server, Neon, or Supabase.
- Attachments: Azure Blob Storage.
- Templates: SharePoint document library.
- Login: Microsoft Entra app registration for MSAL.
- Emails: Microsoft Graph `sendMail` from one dedicated mailbox.

## Database

Use Postgres for projects, subitems, users, sessions, file metadata,
notification preferences, and activity.

Cheapest practical options:

- Neon Postgres: strong low-cost/default option.
- Supabase Postgres: good if you also want a dashboard and SQL browser.
- Azure Database for PostgreSQL Flexible Server: best Microsoft/Azure fit, but
  usually costs more.

Set these environment variables on the online app host:

```bash
STORAGE_DRIVER=postgres
DATABASE_URL=postgres://...
```

Keep `STORAGE_DRIVER=json` only for local development or a single-node test app.

## Attachments

Use Azure Blob Storage for uploaded project and subitem attachments.

Create:

1. Azure Storage Account.
2. Private container, for example `geocon-files`.
3. CORS rule allowing `PUT` and `GET` from the production app origin.

Set these environment variables on the app host:

```bash
AZURE_STORAGE_ACCOUNT=<storage account name>
AZURE_STORAGE_CONTAINER=geocon-files
AZURE_STORAGE_KEY=<storage account access key>
```

The app stores only file metadata in Postgres/JSON. The actual file bytes live
in Azure Blob Storage.

## Templates

Use SharePoint for official accounting templates because staff can manage
documents, versions, folders, and permissions directly in Microsoft 365.

Create a SharePoint document library such as:

```text
Geocon Accounting Templates
```

Recommended folders:

```text
DAS Setup Sheets/
CPR Templates/
Union Forms/
Reporting System Guides/
General Reference/
```

Set this environment variable on the app host so the URL is documented with the
deployment:

```bash
SHAREPOINT_TEMPLATES_URL=https://geoconinc.sharepoint.com/sites/<site>/Shared%20Documents/Geocon%20Accounting%20Templates
```

SharePoint is recommended for templates, not as the main app database.

## Graph Email

Use Microsoft Graph instead of SMTP for assignment and reminder emails.

Create:

1. A dedicated mailbox, for example `notifications@geoconinc.com`.
2. A Microsoft Entra app registration, for example `Geocon Timeline Notifier`.
3. Microsoft Graph application permission: `Mail.Send`.
4. Admin consent for that permission.
5. A client secret for the app registration.
6. An Exchange Application Access Policy limiting the app to only the dedicated
   mailbox.

Set these environment variables on the app host:

```bash
GRAPH_APP_TENANT_ID=<directory tenant id>
GRAPH_APP_CLIENT_ID=<notifier app client id>
GRAPH_APP_CLIENT_SECRET=<notifier app client secret>
NOTIFY_FROM_ADDRESS=notifications@geoconinc.com
APP_BASE_URL=https://<your production app url>
```

`APP_BASE_URL` is included in email bodies so assignees can open the app from
the message.

## Board Visibility

The board now filters server-side:

- Emails listed in `BOARD_ADMIN_EMAILS` can see and manage all projects and
  subitems.
- Project owners can see their whole project, all subitems, and project files.
- Subitem owners can see the project row for context, but only the subitems and
  subitem files assigned to them.

Set admins as a comma-separated list:

```bash
BOARD_ADMIN_EMAILS=manager@geoconinc.com,admin@geoconinc.com
```

This is enforced in API routes, not just hidden in the UI.
