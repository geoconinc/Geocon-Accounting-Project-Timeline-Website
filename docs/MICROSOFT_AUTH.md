# Microsoft Authentication

## Flow

```
Browser (MSAL popup)
  → User signs in with Microsoft
  → acquireToken (scopes: User.Read, email, profile, openid)
  → POST /api/microsoft-login { accessToken }

Server
  → GET https://graph.microsoft.com/v1.0/me (verify token)
  → Check email domain matches ALLOWED_EMAIL_DOMAIN
  → Upsert user in Postgres (name, email, initials from Graph profile)
  → Generate random session token, store in sessions table
  → Set httpOnly cookie: session_token (30-day expiry)

Subsequent requests
  → middleware.ts reads session_token cookie
  → No token → redirect to /login (pages) or 401 JSON (API)
  → Valid token → request proceeds
```

## Azure App Registration

1. Go to [Microsoft Entra admin center](https://entra.microsoft.com) → **App registrations** → **New registration**.
2. Name: `Geocon Project Timeline`
3. Supported account types: **Accounts in this organizational directory only** (single tenant).
4. Redirect URI: **Single-page application (SPA)** → `http://localhost:3000`
5. After registration, add your production URL as a second SPA redirect URI.

Copy from the overview page:
- **Application (client) ID** → `NEXT_PUBLIC_MSAL_CLIENT_ID`
- **Directory (tenant) ID** → `NEXT_PUBLIC_MSAL_TENANT_ID`

## API Permissions

Under **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated**:
- `User.Read` (default)
- `email`
- `profile`
- `openid`

Click **Grant admin consent for Geocon**.

No client secret needed — this is a public SPA client (PKCE flow).

## Environment Variables

```bash
NEXT_PUBLIC_MSAL_CLIENT_ID=<application client id>
NEXT_PUBLIC_MSAL_TENANT_ID=<directory tenant id>
NEXT_PUBLIC_MSAL_REDIRECT_URI=http://localhost:3000   # production: https://your-domain.com
ALLOWED_EMAIL_DOMAIN=geoconinc.com                     # server-side domain enforcement
```

## Graph App Registration (for email)

A **separate** app registration is needed only if you use Microsoft Graph for
server-side email (`EMAIL_DRIVER=graph`). This uses **client credentials**
(app-only), not delegated permissions. SMTP email does not need this app.

1. Create a new app registration: `Geocon Timeline Notifier`
2. Add **Application permission**: `Mail.Send`
3. Grant admin consent.
4. Create a **client secret** under Certificates & secrets.

```bash
GRAPH_APP_TENANT_ID=<tenant id>
GRAPH_APP_CLIENT_ID=<notifier app client id>
GRAPH_APP_CLIENT_SECRET=<client secret value>
NOTIFY_FROM_ADDRESS=notifications@geoconinc.com
```

Optionally restrict `Mail.Send` to a specific mailbox via an [Exchange Application Access Policy](https://learn.microsoft.com/en-us/graph/auth-limit-mailbox-access).

## File Map

| Concern | File |
|---------|------|
| MSAL client config | `lib/auth/msalConfig.ts` |
| MSAL provider | `app/providers.tsx` |
| Login page | `app/login/page.tsx` |
| Token verification + session | `lib/server/features/auth-session/microsoftLoginRoute.ts` |
| Session cookie + lookup | `lib/auth/session.ts`, `lib/auth/constants.ts` |
| Auth middleware | `middleware.ts` |
| Graph app token (email) | `lib/graph/appAccessToken.ts` |

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| `AADSTS50011` redirect mismatch | Redirect URI in env doesn't match Azure registration | Ensure exact match including protocol and trailing slash |
| Popup blocked | Browser settings | Allow popups for the app domain |
| CORS error to graph.microsoft.com | Client calling Graph directly | The server calls Graph, not the browser — check that `/api/microsoft-login` is being called |
| Session lost on refresh | Cookie config issue | Verify cookie is `httpOnly`, `path=/`, and on the same origin |
| `domain_not_allowed` error | User email not matching `ALLOWED_EMAIL_DOMAIN` | Check the user's email domain matches |
