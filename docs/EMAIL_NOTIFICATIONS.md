# Email notifications (SMTP)

The app sends HTML emails through **SMTP** (recommended) or **Microsoft Graph** (`Mail.Send`).

## SMTP setup (Render / production)

Set these environment variables:

| Variable | Example | Required |
|----------|---------|----------|
| `EMAIL_DRIVER` | `smtp` | Yes (forces SMTP) |
| `SMTP_HOST` | `smtp.office365.com` | Yes |
| `SMTP_PORT` | `587` | Yes (587 = STARTTLS) |
| `SMTP_SECURE` | `false` | Use `true` only for port 465 |
| `SMTP_USER` | `notifications@geoconinc.com` | Yes |
| `SMTP_PASSWORD` | *(app password or mailbox password)* | Yes |
| `NOTIFY_FROM_ADDRESS` | `notifications@geoconinc.com` | Yes (must match SMTP user for most providers) |
| `NOTIFY_FROM_NAME` | `Geocon Project Management` | Optional |
| `APP_BASE_URL` | `https://your-app.onrender.com` | Yes (CTA button in emails) |

After changing env vars, redeploy the web service.

### Microsoft 365 / Outlook

1. Use the mailbox you want as the sender (`NOTIFY_FROM_ADDRESS`).
2. If MFA is on, create an **app password** (or use SMTP AUTH enabled by IT).
3. Typical settings: host `smtp.office365.com`, port `587`, `SMTP_SECURE=false`.

## Email types and templates

All emails use the branded layout in `lib/notifications/layout.ts` (Geocon header, body, “Open Project Timeline” button).

| # | When it sends | Subject line (example) | Template file |
|---|---------------|------------------------|-----------------|
| 1 | **New project** — project manager | `Action needed: DAS 140 for {code} — {name}` | `projectCreationTemplates.ts` → `buildProjectManagerCreationEmail` |
| 2 | **New project** — task assignees | `New project {code}: your tasks ({office})` | `projectCreationTemplates.ts` → `buildAssigneeDigestEmail` |
| 3 | **Weekly DAS cron** (legacy, optional) | `Weekly reminder: N incomplete DAS item(s)` | `dasFollowupTemplates.ts` → `buildDasFollowupDigestEmail` |
| 4 | **Due today cron** (legacy, optional) | `Due today: {subitem} · {code}` | `templates/operational.ts` → `buildDueTodayEmail` |
| 5 | **One week incomplete cron** | `Action needed: N item(s) incomplete after 1 week` | `incompleteWeekTemplates.ts` → `buildIncompleteWeekDigestEmail` |
| 6 | **Owner assigned** on project | `You were assigned to {code} — {name}` | `templates/operational.ts` → `buildProjectOwnerAssignedEmail` |
| 7 | **Status changed** on project | `{code} status updated to {status}` | `templates/operational.ts` → `buildProjectStatusChangedEmail` |
| 8 | **Subitem assigned** | `Assigned: {subitem} · {code}` | `templates/operational.ts` → `buildSubitemAssignedEmail` |
| 9 | **Manual message** from board | `Project update: {code} — {name}` | `templates/operational.ts` → `buildManualProjectUpdateEmail` |

Checklist item hints on new-project emails are in `lib/notifications/subitemAssignmentSnippets.ts`.

## Cron job (daily)

Run **once per day**. The job finds subitems that were **created exactly 7 calendar days ago** and are still not `Completed` or `NA`, then emails each assignee one digest.

**Before first run:** apply migrations so subitems have `created_at`:

```bash
DATABASE_URL="postgresql://..." npm run db:migrate
```

**Schedule** (Render → New → Cron Job, or any scheduler):

| Setting | Value |
|---------|--------|
| Schedule | `0 14 * * *` (daily 2pm UTC — adjust for your timezone) |
| Command | see below |

```bash
curl -sS -X POST -H "X-Cron-Secret: $CRON_SHARED_SECRET" "$APP_BASE_URL/api/cron/incomplete-week"
```

Set `CRON_SHARED_SECRET` and `APP_BASE_URL` on **both** the web service and the cron job. SMTP vars must be set on the web service (the cron job only triggers the HTTP endpoint).

**Manual test:**

```bash
curl -sS -X POST -H "X-Cron-Secret: YOUR_SECRET" "http://localhost:3000/api/cron/incomplete-week"
```

Response example: `{"ok":true,"createdOn":"2026-05-27","owners":2,"subitems":5}`

### Legacy crons (optional — disable if unused)

```bash
# Due on calendar due date only
curl -sS -X POST -H "X-Cron-Secret: $CRON_SHARED_SECRET" "$APP_BASE_URL/api/cron/due-dates"

# Weekly DAS digest
curl -sS -X POST -H "X-Cron-Secret: $CRON_SHARED_SECRET" "$APP_BASE_URL/api/cron/das-followup"
```

## Fallback: Microsoft Graph

If `EMAIL_DRIVER=graph` and Graph app credentials are set (`GRAPH_APP_*`, `NOTIFY_FROM_ADDRESS`), emails use Graph instead of SMTP. You do not need both.

## Editing copy

- Wording / HTML structure: edit the `build*` functions under `lib/notifications/`.
- Shared wrapper (logo bar, button, footer): `lib/notifications/layout.ts`.
