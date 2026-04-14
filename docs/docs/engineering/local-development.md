---
sidebar_position: 1
slug: /engineering/local-development
title: Work Locally
description: Work locally with Docker Compose first, then use the shortest smoke-check loop that proves the change.
---

<!-- last-verified: 2026-04-14 -->

# Work Locally

Baldin uses Docker Compose as the local-first entry point. The default `docker-compose up --build` stack brings up eight long-running services, and an on-demand `backend-test` runner is available for DB-backed pytest.

Repo-tracked `backend/.env` and `frontend/.env` provide safe local defaults in every worktree. Put real secrets such as `OPENAI_API_KEY` in process env or ignored `backend/.env.local` / `frontend/.env.local` overrides.

If you use Baldin's workspace skills, `/baldin-local-stack-doctor` helps triage local Compose failures, `test_db` connectivity problems, schema-drift resets, and PostgreSQL collation-repair decisions.

## Fastest Iteration Loop

1. Start the stack once from the repo root with `docker-compose up --build`.
2. Keep it running while you work. Backend edits reload through Uvicorn and frontend edits reload through Vite HMR.
3. Use the smallest smoke check that proves the current slice instead of starting with full suites.
4. If backend API routes or schemas changed before you staged files, run `SCHEMA_UPDATE_FORCE=1 ./scripts/update_frontend_schemas.sh`.
5. Use broader validation only when the touched surface needs it or the branch is ready for handoff or push.

Backend tests should use `./scripts/run_backend_pytest.sh`, which keeps DB-backed pytest inside Compose networking and targets `test_db:5432`. If you explicitly need a host `.venv` loop, use `./scripts/run_backend_pytest_host.sh`, which overrides the test DB path to `127.0.0.1:5431`.

## Services

| Service | Container | Port | Volume |
|---------|-----------|------|--------|
| `db` | PostgreSQL 15 | 5432 | `./backend/public/db` |
| `test_db` | PostgreSQL 15 | 5431 | `./backend/public/test_db` |
| `redis` | Redis 7 | 6379 | none |
| `etl-service` | Internal FastAPI ETL executor | 8010 (internal only) | `./backend` mounted |
| `web` | FastAPI (Uvicorn, hot-reload) | 8004→8000 | `./backend` mounted |
| `crawler-worker` | Python background worker | none | `./backend` mounted |
| `backend-test` | On-demand pytest runner (`test` profile) | none | `./backend` mounted |
| `frontend` | Vite dev server | 5173 | `./frontend` mounted |
| `docs` | Docusaurus dev server | 3001→3000 | `./docs` mounted |

## Starting the Stack

```bash
docker-compose up --build
```

The backend mounts `./backend` as a volume and runs Uvicorn with `--reload`, so Python changes take effect immediately. The frontend mounts `./frontend` and uses Vite's HMR. The docs service mounts `./docs` and serves the Docusaurus site through the same stack at `http://localhost:3001/baldin/docs`.

Leave the stack running across multiple edits. Rebuild only when Docker image inputs changed, such as dependencies or Dockerfiles.

Redis backs the local background-job queue, `crawler-worker` consumes crawler and seed jobs from that queue, and `etl-service` performs the crawler browser work behind an internal-only HTTP boundary while the API stays responsive.

The `backend-test` service is profile-gated and is not started by the default `docker-compose up --build` stack. `./scripts/run_backend_pytest.sh` enables it on demand.

Use [Boot The Stack](../getting-started/quickstart.md) for first boot. This page is the day-two reference once the stack already makes sense to you.

## Figma Browser-Harness Loop

For Figma capture and browser-driven design review, Baldin's primary repo-owned workspace MCP contract lives in `.vscode/mcp.json`.

- `figma` is the workspace HTTP MCP endpoint for Figma design context, screenshots, and Figma-side tools when user auth is present.
- `webdev` is the workspace stdio Playwright MCP server for browser automation and harness-driven review.
- Codex does not consume `.vscode/mcp.json` directly in this patch. `.codex/config.toml` mirrors only `mcp_servers.webdev`, using the same `npx -y @playwright/mcp@0.0.70` launch contract with Codex's repo-local `cwd = "."` in place of VS Code's `${workspaceFolder}` interpolation.
- This repo patch does not manage a Codex-side `figma` entry. User-scoped or globally configured Codex MCP servers can still appear separately on a developer machine.

The canonical Figma surfaces for this repo are [Baldin-Library](https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library) for reusable components and [Baldin-App-Screens](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy/Baldin-App-Screens) for product-flow state inventory. The current [Figma Make file](https://www.figma.com/make/pXpkeOKYnA3gvhHPIjbJDo/Untitled?t=bM22KU0ea6ttyIQ5-20&fullscreen=1) has been reviewed and should be treated as an archived sandbox, not an active delivery surface.

Track active screen and state coverage in [Baldin App Screens Inventory](../reference/baldin-app-screens-inventory.md). Keep [Baldin Library Buildout Ledger](../reference/baldin-library-buildout-ledger.md) limited to reusable-component and library-only exploration.

1. Start or keep the local stack running with `docker-compose up --build`.
2. Use the frontend dev server at `http://127.0.0.1:5173`.
3. Open the supported Wave 1 Figma harness at `http://127.0.0.1:5173/browser-harness/figma-wave1.html?screen=...` for harness-backed product screens.
4. For privileged admin capture, start from `http://127.0.0.1:5173/browser-harness/admin-session.html?next=/admin/db-management` or another `/admin/...` target so the browser session receives the configured local superuser token before opening the Admin SPA.
5. Use `webdev` Playwright MCP tools to drive the Wave 1 harness or the bootstrapped admin route into the state you want to capture or inspect in Figma. For Wave 2 and Wave 3 closeout, use direct shipped-route review plus MCP structure or screenshot inspection instead of expanding the harness.

The canonical harness supports these query parameters:

- `screen=applications|profile|messages|aspirations-roles|aspirations-companies|leads|apply` and it is required
- `mode=dark|light`
- `state=empty|seeded|loading|suggested|no-signal|rate-limited` when `screen=aspirations-roles|aspirations-companies`
- `state=unranked|ranked|disabled|error` when `screen=leads`
- `state=ready|already-applied` when `screen=apply`
- Missing or invalid explicit params render an unsupported-harness page instead of falling back to another screen or state.

Example:

```text
http://127.0.0.1:5173/browser-harness/figma-wave1.html?screen=applications&mode=dark
```

```text
http://127.0.0.1:5173/browser-harness/figma-wave1.html?screen=aspirations-roles&state=seeded&mode=light
```

```text
http://127.0.0.1:5173/browser-harness/figma-wave1.html?screen=aspirations-companies&state=suggested&mode=dark
```

```text
http://127.0.0.1:5173/browser-harness/figma-wave1.html?screen=leads&state=ranked&mode=dark
```

```text
http://127.0.0.1:5173/browser-harness/figma-wave1.html?screen=apply&state=already-applied&mode=light
```

The harness is the supported local capture surface for the Wave 1 screens it already backs. Keep the frontend stack warm and switch harness states instead of wiring a live backend for Wave 1 design review. For Wave 2 and Wave 3 closeout, follow the app-screens inventory ledger and use direct shipped-route review plus MCP structure or screenshot inspection rather than harness expansion.

For privileged admin routes, the supported preflight is the repo-owned admin session bootstrap page rather than a manual login step:

```text
http://127.0.0.1:5173/browser-harness/admin-session.html?next=/admin/db-management
```

The bootstrap page calls the DEV-only backend route `POST /api/v1/auth/jwt/dev-bootstrap-superuser`, writes the returned JWT into `baldin_token`, and then redirects to the requested `/admin/...` path. This keeps MCP server config unchanged because the auth handoff lives in browser session state, not the Figma or Playwright transport.

### Professional-Plan Default

Baldin's supported Figma workflow assumes a Professional-plan workspace and does not require a Dev seat.

- Use the local harness plus `webdev` to put Wave 1 screens into the exact state you need.
- For Wave 2 and Wave 3 closeout, treat the app-screens inventory ledger as the active policy source and use direct shipped-route review plus MCP structure or screenshot inspection.
- Use Figma MCP read or write tools when your seat and auth allow it.
- If your seat only allows basic inspection, keep the same evidence order and use screenshots or inspection instead of blocking on Dev Mode-specific UX.
- Use MCP for structure, component, and screenshot inspection even when Dev Mode is unavailable. Full version-history review still requires browser or web access to the Figma UI.
- Code Connect workspace reads and publish flows require a Developer seat on an Organization or Enterprise plan. On the current Professional-plan expert seat, treat `frontend/figma.config.json` and `frontend/src/design-system/**/*.figma.ts` as repo-local metadata rather than an active workspace dependency.
- The reviewed Make sources (`App.tsx`, `theme.css`, `button.tsx`, `card.tsx`, `badge.tsx`, and `Guidelines.md`) did not contain a meaningful direct port candidate. Do not promote generic Tailwind or shadcn scaffolding into the canonical Baldin system.
- If browser-driven Figma inspection is blocked by stale Playwright Chrome locks, stop lingering `playwright-mcp` or `@playwright/mcp` processes and remove `~/Library/Caches/ms-playwright/mcp-chrome-*/SingletonLock`, `SingletonCookie`, and `SingletonSocket` before restarting the browser automation session.

## Resetting Databases

When schema changes cause drift, reset both developer databases:

```bash
./scripts/reset_local_db.sh
```

This script:
1. Stops Docker Compose and removes orphan containers.
2. Clears `backend/public/db` and `backend/public/test_db`.
3. Restarts the stack with fresh databases.

If startup logs show a PostgreSQL `collation version mismatch` warning after a Docker image or base-OS change and you want to keep local data, repair the local clusters in place:

```bash
./scripts/repair_local_db_collation.sh
```

This reindexes `postgres`, `template1`, and the app database in both local Postgres clusters, then refreshes PostgreSQL's stored collation version metadata. If you do not need to preserve local data, `./scripts/reset_local_db.sh` remains the simpler option.

## Working Outside Containers

Outside-container loops are secondary debug paths. Use them when you specifically need host tooling or an isolated service run.

You can also run backend or frontend outside Docker:

### Backend

```bash
cd backend
pipenv install --dev
pipenv shell
uvicorn app.main:app --reload --port 8004
```

Requires a running PostgreSQL instance matching the `backend/.env` connection settings.

For an optional host-side backend test loop:

```bash
cd backend
pipenv install --dev
../scripts/run_backend_pytest_host.sh app/tests/test_target.py -q
```

If you want worker-mode background execution outside Docker, run Redis separately and start the ETL service and worker in separate shells:

```bash
cd backend
pipenv install --dev
pipenv run uvicorn app.etl_service_main:app --reload --port 8010
```

```bash
cd backend
pipenv install --dev
pipenv run python -m app.crawler_worker
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Requires `VITE_API_URL` to be set (defaults to `http://localhost:8004` for local development).

If you want a live docs server outside Compose, run:

```bash
npm --prefix docs run start
```

## Related Local Tasks

| Task | Command |
| --- | --- |
| Reset local databases | `./scripts/reset_local_db.sh` |
| Run DB-backed backend pytest in Compose | `./scripts/run_backend_pytest.sh -q app/tests/test_target.py` |
| Run DB-backed backend pytest from the host | `./scripts/run_backend_pytest_host.sh -q app/tests/test_target.py` |
| Regenerate API contracts during active work | `SCHEMA_UPDATE_FORCE=1 ./scripts/update_frontend_schemas.sh` |
| Regenerate API contracts from staged files | `./scripts/update_frontend_schemas.sh` |
| Build docs site | `npm --prefix docs run build` |
| Run docs dev server | `npm --prefix docs run start` |

## Related Docs

- [Boot The Stack](../getting-started/quickstart.md)
- [Baldin App Screens Inventory](../reference/baldin-app-screens-inventory.md)
- [Baldin Library Buildout Ledger](../reference/baldin-library-buildout-ledger.md)
- [Run The Right Checks](./testing.md)
- [Regenerate API Contracts](./contract-management.md)
- [Look Up Settings](../reference/environment-variables.md)

## Useful Local URLs

| URL | What |
|-----|------|
| http://127.0.0.1:5173 | Frontend |
| http://127.0.0.1:5173/admin/ | Admin SPA |
| http://127.0.0.1:5173/browser-harness/figma-wave1.html | Figma browser harness |
| http://127.0.0.1:5173/browser-harness/admin-session.html?next=/admin/db-management | Admin capture bootstrap |
| http://localhost:3001/baldin/docs | Product docs |
| http://localhost:8004 | API root |
| http://localhost:8004/health | API liveness |
| http://localhost:8004/ready | API readiness |
| http://localhost:8004/docs | Swagger UI |
| http://localhost:8004/redoc | ReDoc |
| http://localhost:8004/admin | Legacy Starlette Admin |
