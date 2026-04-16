---
sidebar_position: 4
slug: /engineering/testing
title: Run The Right Checks
description: Run the smallest effective smoke check first, then widen validation only when the change actually needs it.
---

<!-- last-verified: 2026-04-15 -->

# Run The Right Checks

Use the smallest validation surface that proves your change. Backend, frontend, contract, and docs work each have their own primary checks.

If you use Baldin's workspace skills, `/baldin-backend-test-gap-planner` helps choose the smallest useful backend pytest coverage, and `/baldin-contract-regen-resolver` handles backend-to-contract regeneration fallout.

## Choose Your Validation Speed

| When | Preferred path | Why |
| --- | --- | --- |
| Active editing | One targeted backend or frontend smoke check, or forced contract regeneration when the schema surface changed | Fastest feedback while the Compose stack stays warm |
| Handoff or local review | The smallest relevant test set plus any required contract, type, or build checks | Confirms the slice without paying the full CI cost |
| Pre-push confidence | Broader suite, stricter gates, and docs build when the branch is ready | Matches merge expectations without slowing the first edit loop |

## Choose The Right Check

| Surface | Fast local check | When to widen |
| --- | --- | --- |
| Backend behavior | `./scripts/run_backend_pytest.sh -xvs app/tests/test_target.py -k "case"` | Expand to a larger pytest scope when no targeted coverage exists or the change crosses multiple backend paths |
| Frontend behavior | `cd frontend && npm run test -- --watch` | Run the non-watch test command for handoff or when you need a clean one-shot result |
| Frontend typing | `cd frontend && node ./node_modules/typescript/bin/tsc --noEmit` | Use when shared types, typed service consumption, or broader component contracts changed |
| Production-style frontend build | `cd frontend && VITE_API_URL=https://api.preview.invalid npm run build` | Use when shipped behavior or bundling assumptions changed |
| Contract changes | `SCHEMA_UPDATE_FORCE=1 ./scripts/update_frontend_schemas.sh` plus the directly affected backend and frontend checks | Run the normal script before push or review to confirm staged changes trigger regeneration |
| Docs changes | `npm --prefix docs run build` | Keep it to docs-source changes; do not rebuild docs for unrelated code work |

## Backend Tests

Backend tests use `pytest` with a dedicated PostgreSQL test database.

### Running tests

```bash
./scripts/run_backend_pytest.sh -xvs app/tests/test_target.py -k "case"
```

Start with the narrowest test file or `-k` selection that exercises the edited route, model, ETL path, or bug. Only widen to the broader backend suite when the changed surface or missing coverage makes that necessary.

The wrapper is now Compose-native: it starts or reuses `test_db`, waits for readiness, and runs pytest inside the on-demand `backend-test` service. This keeps agent and human DB-backed verification aligned with the local stack instead of relying on host localhost access.

Use `./scripts/run_backend_pytest_host.sh` only when you intentionally want a host `.venv` flow. That helper overrides the test DB path to `127.0.0.1:5431`.
If you skip the helper, run `cd backend && pipenv run pytest ...`. Do not rely on bare `pytest` being present on the host shell `PATH`.

### Coverage gate

CI enforces a **60% minimum coverage** threshold across `app/` and `etl/`:

```bash
./scripts/run_backend_pytest.sh --cov=app --cov=etl --cov-report=term-missing --cov-fail-under=60
```

### Test database

Tests run against a separate PostgreSQL instance (`test_db` in the local Compose network, or the CI-provisioned service).

| Local path | Host | Port |
|----------|------|------|
| Compose-native wrapper (`./scripts/run_backend_pytest.sh`) | `test_db` | `5432` |
| Optional host fast path (`./scripts/run_backend_pytest_host.sh`) | `127.0.0.1` | `5431` |

Test fixtures use drop-and-recreate patterns via `conftest.py`.

When the local `test_db` service is unavailable, the wrapper starts it first and the backend still fails fast in `PYTEST` mode instead of hanging on connection attempts.

## Frontend Tests

Frontend tests use Vitest with React Testing Library.

### Running tests

```bash
cd frontend
npm run test:watch
npm run test
```

Use watch mode during active editing. Treat the clean one-shot test run, typecheck, and build as handoff or pre-push checks unless the task specifically depends on them.

### TypeScript validation

```bash
cd frontend
node ./node_modules/typescript/bin/tsc --noEmit
```

This is a strict check. CI runs it as a separate job.

### Production build validation

```bash
cd frontend
VITE_API_URL=https://api.preview.invalid npm run build
```

The build guard rejects missing or localhost `VITE_API_URL` values. Use any non-localhost origin for local build testing.

## Docs Validation

```bash
npm --prefix docs run build
```

This catches broken links, sidebar mismatches, and Mermaid/frontmatter issues in the documentation site. Use it when docs source changed; it is not part of the default validation path for unrelated backend or frontend work.

## Related Docs

- [Work Locally](./local-development.md)
- [Regenerate API Contracts](./contract-management.md)
- [See Merge Gates](./ci-pipeline.md)
