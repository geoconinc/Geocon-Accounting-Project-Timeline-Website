# Microsoft Authentication — Setup Guide

This app uses the same two-step trust flow as the existing Geocon AI website:

```
Browser (MSAL)  ──acquireToken──►  Microsoft
     │                                 │
     │                                 ▼
     │                          User.Read token
     │                                 │
     ▼                                 │
POST /api/microsoft-login  ◄───────────┘
     │
     ▼
Server verifies token against
Microsoft Graph /v1.0/me
     │
     ├── Enforces @geoconinc.com domain
     ├── Upserts user in DB
     └── Issues httpOnly session_token cookie (30d)
```

After the cookie is set, every API call and protected page is authorized via
the cookie — no tokens in JavaScript. `middleware.ts` redirects unauthenticated
requests to `/login`.

---

## Step 1 — Register the app in Azure (Microsoft Entra ID)

1. Go to <https://entra.microsoft.com> → **App registrations** → **New registration**.
2. Name it: `Geocon Project Timeline`.
3. **Supported account types**: *Accounts in this organizational directory only* (Geocon tenant only).
4. **Redirect URI**: choose **Single-page application (SPA)** and enter:
   - `http://localhost:3000` (for local dev)
   - Add another for prod once you deploy, e.g. `https://timeline.geoconinc.com`.
5. Click **Register**.

From the app overview page copy:
- **Application (client) ID** → goes into `NEXT_PUBLIC_MSAL_CLIENT_ID`
- **Directory (tenant) ID** → goes into `NEXT_PUBLIC_MSAL_TENANT_ID`

## Step 2 — Configure API permissions

Under **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated permissions**:

- `User.Read` (already selected by default)
- `email`
- `profile`
- `openid`

Click **Grant admin consent for Geocon**. (Same as the AI site.)

No client secret is required — this is a pure SPA / public client flow.

## Step 3 — Fill in your `.env.local`

Copy `.env.example` to `.env.local` at the project root and fill the auth section:

```bash
NEXT_PUBLIC_DEMO_MODE=false                # turn off demo mode
NEXT_PUBLIC_MSAL_CLIENT_ID=<paste client id>
NEXT_PUBLIC_MSAL_TENANT_ID=<paste tenant id>
NEXT_PUBLIC_MSAL_REDIRECT_URI=http://localhost:3000

ALLOWED_EMAIL_DOMAIN=geoconinc.com         # backend domain enforcement
SESSION_SECRET=<long random string>        # used by server when signing tokens

STORAGE_DRIVER=json                        # keep json for local; postgres for prod
```

For production also set `NEXT_PUBLIC_MSAL_REDIRECT_URI` to your live origin and
make sure that URI is also registered in Azure under **Authentication → SPA**.

## Step 4 — Restart the dev server

```bash
# Stop any running next dev, then:
rm -rf .next
npm run dev
```

Visit <http://localhost:3000>. You should be redirected to `/login`, see
**“Sign in with Microsoft”**, click it → real Microsoft popup → consent → land
back in the app with a session cookie.

## Step 5 — Verify it's working

1. **DevTools → Application → Cookies** should show `session_token` (httpOnly).
2. `GET /api/verify-session` should return `{ authenticated: true, user: ... }`.
3. Try signing in with a non-`@geoconinc.com` account — server returns 403 with
   `domain_not_allowed`.
4. Click **Log out** in the top bar — cookie cleared, redirected to `/login`.

---

## File map (for reference — all of this already exists)

| Concern | File |
|---|---|
| MSAL client config | `lib/auth/msalConfig.ts` |
| MSAL provider mount (skipped in demo) | `app/providers.tsx` |
| Login page (real flow + demo flow) | `app/login/page.tsx` |
| Token verification + session issuance | `lib/server/routes/microsoftLoginRoute.ts` |
| Session cookie + lookup | `lib/auth/session.ts`, `lib/auth/constants.ts` |
| Auth middleware (redirects to /login) | `middleware.ts` |
| Verify-session endpoint | `app/api/verify-session/route.ts` |
| Logout endpoint | `app/api/logout/route.ts` |
| Server-side user fetch in pages | `app/(app)/layout.tsx` (`getCurrentUser()`) |

## Common pitfalls

- **`AADSTS50011` redirect URI mismatch**: the URI in your `.env` must match the
  URI registered in Azure exactly (including http vs https and trailing slash).
- **Popup blocked**: MSAL falls back to redirect mode automatically; allow popups
  for cleanest UX.
- **CORS error to `graph.microsoft.com`**: the backend (server) calls Graph, not
  the browser — make sure the request is hitting `/api/microsoft-login` and not
  Graph directly.
- **Session lost on refresh**: confirm the cookie is `httpOnly` + `path=/` and
  that you're not running on a different origin between issue and read.

## Going to production

1. Add the prod URL to Azure App registration → Authentication → SPA redirect URIs.
2. Set `NEXT_PUBLIC_MSAL_REDIRECT_URI` to that URL.
3. Use a Postgres-backed `STORAGE_DRIVER=postgres` so sessions survive restarts
   (the JSON store is fine locally but not for multi-instance deployments).
4. `NODE_ENV=production` automatically flips the cookie to `secure: true`.
