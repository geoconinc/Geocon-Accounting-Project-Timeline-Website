# Geocon Project Timeline Documentation

This folder describes how the application is structured, how data flows, and where to extend behavior without changing URL contracts.

- [ARCHITECTURE.md](./ARCHITECTURE.md): System overview, layers, auth, storage, and real-time events.
- [API.md](./API.md): HTTP routes, request bodies, and route handler locations.
- [FRONTEND.md](./FRONTEND.md): App Router pages, component layout, and demo mode.
- [DATA_AND_STORAGE.md](./DATA_AND_STORAGE.md): Storage drivers, Drizzle schema, migrations, and local JSON data.
- [MICROSOFT_AUTH.md](./MICROSOFT_AUTH.md): Microsoft login, Graph verification, session handling, and Azure setup.
- [ONLINE_SETUP.md](./ONLINE_SETUP.md): Production setup for database, Azure Blob attachments, SharePoint templates, Graph email, and board visibility.
- [DATABASE_PLAN.md](./DATABASE_PLAN.md): Database migration plan and implementation notes.

Start with [ARCHITECTURE.md](./ARCHITECTURE.md), then drill into storage, API,
frontend, or auth details as needed. Documentation-only screenshots and
reference images belong in [assets/](./assets/).
