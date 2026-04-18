---
sidebar_position: 1
slug: /engineering/local-development
title: Work Locally
description: Work locally with Docker Compose first, then use the shortest smoke-check loop that proves the change.
---

<!-- last-verified: 2026-04-17 -->

# Work Locally

Baldin uses Docker Compose as the local-first entry point. The default `docker-compose up --build --watch` stack brings up nine long-running services, and an on-demand `backend-test` runner is available for DB-backed pytest.

Repo-tracked `backend/.env` and `frontend/.env` provide safe local defaults in every worktree. For Compose-backed services, `backend/.env.local` and `frontend/.env.local` are the deterministic first-boot override path; explicitly exported shell variables still win when you intentionally want a one-off override.

If you use Baldin's workspace skills, `/baldin-local-stack-doctor` helps triage local Compose failures, `test_db` connectivity problems, schema-drift resets, and PostgreSQL collation-repair decisions.

## Fastest Iteration Loop

1. Start the stack once from the repo root with `docker-compose up --build --watch`.
2. Keep it running while you work. Compose Watch syncs source changes into the running containers for the supported dev services, and rebuild rules cover dependency or Dockerfile changes.
3. Use the smallest smoke check that proves the current slice instead of starting with full suites.
4. If backend API routes or schemas changed before you staged files, run `SCHEMA_UPDATE_FORCE=1 ./scripts/update_frontend_schemas.sh`.
5. Use broader validation only when the touched surface needs it or the branch is ready for handoff or push.

Backend tests should use `./scripts/run_backend_pytest.sh`, which keeps DB-backed pytest inside Compose networking and targets `test_db:5432`. If you explicitly need a host `.venv` loop, use `./scripts/run_backend_pytest_host.sh`, which overrides the test DB path to `127.0.0.1:5431`. If you run directly from `backend/`, use `pipenv run pytest ...` rather than assuming bare `pytest` is on the shell `PATH`.

## Services

| Service | Container | Port | Volume |
|---------|-----------|------|--------|
| `db` | PostgreSQL 15 | 5432 | Compose volume `db-data` |
| `test_db` | PostgreSQL 15 | 5431 | Compose volume `test-db-data` |
| `redis` | Redis 7 | 6379 | none |
| `etl-service` | Internal FastAPI ETL executor | 8010 (internal only) | image contents from `./backend` build context |
| `web` | FastAPI / Uvicorn dev server | 8004→8000 | image contents from `./backend` build context + Compose Watch sync |
| `crawler-worker` | Python background worker | none | image contents from `./backend` build context |
| `backend-test` | On-demand pytest runner (`test` profile) | none | image contents from `./backend` build context |
| `frontend` | Vite dev server | 5173 | image contents from `./frontend` build context + Compose Watch sync |
| `operator-design` | Reference-only Vite `v2.1` design surface | 5174 | image contents from `./operator-design` build context + Compose Watch sync |
| `docs` | Docusaurus dev server | 3001→3000 | image contents from `./docs` build context + Compose Watch sync |

## Starting the Stack

```bash
docker-compose up --build --watch
```

The backend, frontend, and docs dev services now run from image contents built from their respective repo directories instead of bind-mounting the local worktree into the containers. On local Docker Desktop, the bind-mounted trees were exhausting file descriptors with `EMFILE` / `OSError: [Errno 24] Too many open files` before the browser-facing services could even finish booting. Compose Watch now provides the live-edit loop: source files sync into the running containers, config changes use `sync+restart`, and dependency or Dockerfile changes trigger rebuilds. If you only need a one-shot boot without file watching, `docker-compose up --build` still works. Backend containers now merge `backend/.env` plus optional `backend/.env.local` before the first process starts, while explicit shell exports still override those files when you intentionally set them for the Compose launch. The stack therefore preserves the repo-tracked blank `OPENAI_API_KEY` default unless you provide a real key, so the stack and DB-backed pytest can boot without real API access while OpenAI-gated routes stay in their documented disabled state. Published ports stay local-only by default; set `DOCKER_PUBLISH_HOST=0.0.0.0` before `docker-compose up --build --watch` when another device on your LAN needs to reach the stack.

Leave the stack running across multiple edits. Rebuild only when Docker image inputs changed, such as dependencies or Dockerfiles.

Redis backs the local background-job queue, `crawler-worker` consumes crawler and seed jobs from that queue, and `etl-service` performs the crawler browser work behind an internal-only HTTP boundary while the API stays responsive.

The `backend-test` service is profile-gated and is not started by the default `docker-compose up --build --watch` stack. `./scripts/run_backend_pytest.sh` enables it on demand.

Use [Boot The Stack](../getting-started/quickstart.md) for first boot. This page is the day-two reference once the stack already makes sense to you.

## Figma Browser-Harness Loop

For Figma capture and browser-driven design review, Baldin's repo-owned MCP contract lives in `.vscode/mcp.json`.

- `figma` is the workspace HTTP MCP endpoint for Figma design context, screenshots, and Figma-side tools when user auth is present.
- Browser automation is not repo-managed through `webdev`. Use the repo-local frontend Playwright runtime, configured host browser tooling, or direct Figma MCP inspection for harness and route review.
- Codex does not consume `.vscode/mcp.json` directly in this patch. `.codex/config.toml` contains Codex custom-agent defaults only and no repo-owned MCP server mirrors.
- This repo patch does not manage a Codex-side `figma` entry. User-scoped or globally configured Codex MCP servers can still appear separately on a developer machine.

The active implementation contract is code-first: use `frontend/src/design-system/*`, `operator-design/`, [v2.1 Hard Fork](../reference/v2-1-hard-fork.md), and [v2.1 Implementation Program](./v2-1-implementation-program.md). `Baldin-Library`, `Baldin Product Redesign — Command Center`, `Baldin-App-Screens`, and the reviewed Figma Make file are archived reference surfaces only.

1. Start or keep the local stack running with `docker-compose up --build --watch`.
2. Use the frontend dev server at `http://127.0.0.1:5173`.
3. Open the supported Wave 1 Figma harness at `http://127.0.0.1:5173/browser-harness/figma-wave1.html?screen=...` for harness-backed product screens.
4. For privileged admin capture, start from `http://127.0.0.1:5173/browser-harness/admin-session.html?next=/admin/db-management` or another `/admin/...` target so the browser session receives the configured local superuser token before opening the Admin SPA.
5. Use the frontend Playwright runtime or configured host browser tooling to drive the Wave 1 harness or the bootstrapped admin route into the state you want to inspect. Use Figma only for optional historical reference instead of as an active delivery gate.

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

The harness is the supported local capture surface for the Wave 1 screens it already backs. Keep the frontend stack warm and switch harness states instead of wiring a live backend for Wave 1 review. For broader `v2.1` work, start from the shipped route code, the shared design-system layer, and `operator-design/` rather than expanding the harness.

For privileged admin routes, the supported preflight is the repo-owned admin session bootstrap page rather than a manual login step:

```text
http://127.0.0.1:5173/browser-harness/admin-session.html?next=/admin/db-management
```

The bootstrap page calls the DEV-only backend route `POST /api/v1/auth/jwt/dev-bootstrap-superuser`, writes the returned JWT into `baldin_token`, and then redirects to the requested `/admin/...` path. This keeps MCP server config unchanged because the auth handoff lives in browser session state, not the Figma or Playwright transport.

### Professional-Plan Default

Baldin's supported Figma workflow assumes a Professional-plan workspace and does not require a Dev seat.

- Use the local harness plus the repo-local frontend Playwright runtime or configured host browser tooling to put Wave 1 screens into the exact state you need.
- For product work beyond the Wave 1 harness, treat `v2.1` docs and plans as active and use archived Figma only when historical comparison is genuinely helpful.
- Use Figma MCP read or write tools when your seat and auth allow it.
- If your seat only allows basic inspection, keep the same evidence order and use screenshots or inspection instead of blocking on Dev Mode-specific UX.
- Use MCP for structure, component, and screenshot inspection even when Dev Mode is unavailable. Full version-history review still requires browser or web access to the Figma UI.
- Code Connect workspace reads and publish flows require a Developer seat on an Organization or Enterprise plan. On the current Professional-plan expert seat, treat `frontend/figma.config.json` and `frontend/src/design-system/**/*.figma.ts` as repo-local metadata rather than an active workspace dependency.
- The reviewed Make sources (`App.tsx`, `theme.css`, `button.tsx`, `card.tsx`, `badge.tsx`, and `Guidelines.md`) did not contain a meaningful direct port candidate. Do not promote generic Tailwind or shadcn scaffolding into the canonical Baldin system.
- If browser-driven Figma inspection is blocked by stale browser locks, stop the lingering browser automation process and restart the browser automation session. Do not switch to `webdev` as a fallback.

## Resetting Databases

When schema changes cause drift, reset both developer databases:

```bash
./scripts/reset_local_db.sh
```

This script:
1. Stops Docker Compose and removes orphan containers.
2. Removes the Compose-managed `db-data` and `test-db-data` volumes.
3. Clears any legacy `backend/public/db` and `backend/public/test_db` bind-mount directories left by older local setups.
4. Restarts the stack with fresh databases in the standard Compose Watch loop.

If you intentionally want a one-shot detached restart instead, run `BALDIN_RESET_DB_MODE=detached ./scripts/reset_local_db.sh`.

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

Equivalent direct host invocation:

```bash
cd backend
pipenv install --dev
TEST_DATABASE_HOSTNAME=127.0.0.1 TEST_DATABASE_PORT=5431 pipenv run pytest app/tests/test_target.py -q
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
- [v2.1 Hard Fork](../reference/v2-1-hard-fork.md)
- [v2.1 Implementation Program](./v2-1-implementation-program.md)
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
