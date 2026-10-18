# Ops Tracker: Frontend

React single-page app for the Ops Tracker work-item system. It talks to the backend API and makes the three core guarantees visible: version-checked edits (conflict panel), server-enforced permissions (read-only UI, 403/404 toasts), and a full activity timeline.

## Tech stack

- React 19 + TypeScript, built with Vite
- TanStack Query for server state (caching, polling, optimistic updates)
- Plain CSS (no UI framework)

## Prerequisites

- Node.js 18 or newer (20 recommended)
- Docker (for the Postgres database used by the backend)
- The backend from this repo set up and seeded (see `backend/`)

## Quick start

Run these from the project root (`ops-tracker/`). You need **three things running**: the database, the backend, and the frontend.

### 1. Start the database

```bash
docker compose up -d
docker compose ps        # wait until the status is "healthy"
```

If Docker is not running, open Docker Desktop first.

### 2. Start the backend (first time only: migrate and seed)

```bash
cd backend
npm install
npm run migrate
npm run seed             # creates demo users, teams and items
npm run dev              # API on http://localhost:3000
```

Check it: `curl http://localhost:3000/health` should return `{"status":"ok","db":"up"}`.

### 3. Start the frontend (new terminal)

```bash
cd frontend
npm install
npm run dev              # app on http://localhost:5173
```

Open http://localhost:5173.

## Demo accounts

All accounts use the password `password123`.

| Email | Role |
|---|---|
| alice@example.com | Lead in Payments, member in Platform |
| bob@example.com | Member in Payments |
| carol@example.com | Viewer in Payments (read-only) |
| dave@example.com | Lead in Platform only (no Payments access) |

Tip: use a normal window for one user and an incognito window for another, since the login token is stored in `localStorage` and is shared between tabs of the same browser profile.

## Configuration

The frontend has no `.env` file. In development, the browser calls `/api/...` and Vite forwards each request to the backend with the `/api` prefix removed. This keeps everything same-origin, so there are no CORS issues.

The proxy is configured in `frontend/vite.config.ts`:

```ts
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:3000',   // change if your backend uses another host/port
      changeOrigin: true,
      rewrite: (p) => p.replace(/^\/api/, ''),
    },
  },
},
```

| Setting | Where | Default |
|---|---|---|
| Frontend port | `vite.config.ts` -> `server.port` | 5173 |
| Backend URL | `vite.config.ts` -> `server.proxy['/api'].target` | http://127.0.0.1:3000 |

On Windows, use `127.0.0.1` rather than `localhost` in the proxy target. Node resolves `localhost` to IPv6 (`::1`) first, which can cause `ECONNREFUSED`.

## Scripts

Run these inside `frontend/`:

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npx tsc -b` | Type-check the project |
| `npm run build` | Type-check and produce a production build in `dist/` |
| `npm run preview` | Serve the production build locally |

For a production deployment, serve `dist/` from a web server that also forwards `/api/*` to the backend (with the `/api` prefix stripped), or change the `fetch` base path in `src/api/client.ts`.

## Project structure

```
frontend/src/
├── api/              # fetch client, API types, typed endpoint wrappers
│   ├── client.ts     # the only place that calls fetch(); normalises errors into ApiError
│   ├── types.ts
│   └── workItems.ts
├── auth/             # AuthContext: session, profile, per-team roles
├── features/
│   ├── auth/         # LoginPage
│   └── items/        # FilterBar, ItemList, ItemDetail, EditForm,
│                     # ConflictPanel, ActivityTimeline, CreateItemModal
├── shared/           # Badge, toast, ErrorBoundary, useDebounce, format helpers
├── App.tsx           # layout + UI state (filters, selection)
├── main.tsx          # providers and query client setup
└── styles.css
```

## Key behaviours

- **Lost-update protection:** every edit sends the version it was based on. If someone else changed the item first, the server answers `409` and the UI shows a conflict panel with both versions. The user chooses; nothing is overwritten silently.
- **Stale-data warning:** the detail view polls every 15 seconds and on window focus. If the item changes while you are editing, a banner warns you before you save.
- **Optimistic update with rollback:** an edit appears immediately and is rolled back if the server rejects it.
- **Scalable list:** server-side filters and search (300 ms debounce) with cursor pagination ("Load more"). The browser never loads the whole dataset.
- **Attention views:** tabs for *Assigned to me*, *Unassigned* and *Urgent* map to server-side filters.
- **Permissions:** controls are hidden by role as a convenience only. The server enforces every permission, and any 401/403/404 is shown as a toast with a short request reference.
- **Error handling:** one `ApiError` type, network-failure messages, automatic logout on 401, retry buttons, and an error boundary.
- **Duplicate-submit protection:** buttons are disabled while a request is pending, and create sends an `Idempotency-Key` header (enforced by the server once the idempotency phase is in).

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Vite prints `http proxy error ... ECONNREFUSED` | The backend is not running. Start it with `npm run dev` in `backend/`. |
| Backend logs `ECONNREFUSED ... :5432` | The database is not running. Run `docker compose up -d` and wait for "healthy". |
| Proxy error persists with the backend running | Set the proxy target to `http://127.0.0.1:3000` (IPv4) in `vite.config.ts`. |
| Login says "Invalid email or password" | The database has not been seeded. Run `npm run seed` in `backend/`. |
| Login works but the list shows a 404 error | The work-item API is not in the backend yet. Add the work-items module. |
| Logged out unexpectedly | The token expired (8 hours) or the account was deactivated. Log in again. |
| Port 5173 already in use | Stop the other process, or change `server.port` in `vite.config.ts`. |
| Blank page | Open the browser console. The error boundary shows "Something went wrong" with a Reload button for render crashes. |

## Known limitations (frontend)

- No real-time push. Freshness comes from polling (15 to 30 seconds) and refetch on window focus.
- The token is kept in `localStorage`, which is simple but exposed to XSS. An httpOnly cookie would be the production choice.
- Claim, status transition, priority and reassign controls arrive with the next backend phase.
- No automated frontend tests yet. The backend tests cover the critical guarantees.