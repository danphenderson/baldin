---
name: baldin-local-stack-doctor
description: "Diagnose and recover Baldin's local-first development stack. Use when docker compose will not boot, db or test_db are unhealthy, backend or frontend startup fails locally, host-vs-container test DB settings are confusing, or you need to choose between reset_local_db.sh and repair_local_db_collation.sh."
argument-hint: "Optional: current symptom, failing service, command output, or whether data preservation matters"
---

# Baldin Local Stack Doctor

Use this skill to triage Baldin's local Docker Compose and Compose Watch workflow, identify the smallest repair step, and explain exactly what remains unverified.

## Scope

- This is a Baldin-only workspace skill and should stay in `.github/skills/` for this repo.
- Keep the scope on local development recovery: Docker Compose, local Postgres volumes, backend and frontend startup, environment-file readiness, and host-vs-container test execution.
- Prefer the lightest fix that restores the stack. Do not jump straight to destructive resets unless the symptoms or user preference justify it.
- If the issue is really application logic rather than local environment health, hand off to the smallest correct implementation owner instead of pretending the stack is broken.

## Source-Of-Truth Inputs

- `docs/docs/engineering/local-development.md`
- `docs/docs/engineering/testing.md`
- `docs/docs/getting-started/contributing.md`
- `README.md`
- `docker-compose.yml`
- `backend/.env`
- `frontend/.env`
- `scripts/reset_local_db.sh`
- `scripts/repair_local_db_collation.sh`

## Default Assumptions

- Baldin is local-first. `docker-compose up --build --watch` is the default supported developer path and Compose Watch is the supported live-edit loop.
- Repo-tracked `backend/.env` and `frontend/.env` provide safe local defaults in every worktree. Real secrets should come from process env or ignored `.env.local` overrides.
- The local stack includes eight long-running services: `db`, `test_db`, `redis`, `etl-service`, `web`, `crawler-worker`, `frontend`, and `docs`, plus the on-demand `backend-test` service.
- Local Postgres data lives in the Compose-managed `db-data` and `test-db-data` volumes. Legacy `backend/public/db` and `backend/public/test_db` directories may still exist from older setups.
- Host-run backend tests use `TEST_DATABASE_HOSTNAME=127.0.0.1` and `TEST_DATABASE_PORT=5431`.
- Container-to-container backend runtime uses the Compose service names from `backend/.env`, including `db` and `test_db`.
- `./scripts/reset_local_db.sh` is destructive for local Postgres data and should be reserved for schema drift or disposable-data recovery.
- `./scripts/repair_local_db_collation.sh` is the preferred non-destructive path when the problem is a PostgreSQL collation version mismatch and the user wants to keep local data.

## Procedure

1. Identify the symptom and the failing surface.
   - Is the failure in Docker Compose startup, backend startup, frontend startup, backend tests, or database health?
   - Determine whether the user is running inside the Compose stack or outside containers.
2. Check the minimum environment assumptions.
   - Confirm repo-tracked `backend/.env` and `frontend/.env` exist in the worktree.
   - Confirm whether required secrets such as `OPENAI_API_KEY` are present in process env or an ignored `.env.local` override.
   - Confirm the expected local ports: frontend 5173, API 8004, db 5432, test_db 5431.
   - Confirm whether the user needs to preserve local database contents.
3. Choose the smallest recovery path.
   - If a service is simply down, prefer restarting or bringing up the missing Compose services.
   - If backend tests cannot reach the test database from the host, verify `127.0.0.1:5431` rather than the container-service hostname.
   - If PostgreSQL reports collation mismatch warnings after an image or OS change, prefer `./scripts/repair_local_db_collation.sh`.
   - If schema drift or disposable local state is the root cause, use `./scripts/reset_local_db.sh`.
   - If the user is running backend or frontend outside containers, verify the expected local prerequisites for that mode.
4. Report the state after the fix.
   - Which services are expected to be healthy.
   - Which URLs or commands should now work.
   - What remains unverified.

## Required Output

`Symptom assessment`
- failing surface
- likely root cause
- whether the issue is stack-level or application-level

`Recommended recovery path`
- smallest next command or action
- whether the step is non-destructive or destructive
- whether local data preservation is affected

`Environment notes`
- expected port and hostname mapping
- whether the user should use host settings or container-service settings
- any required env file or prerequisite note

`Verification`
- the shortest command, service, or URL checks that should confirm recovery
- what remains unverified

`Final status`
- Status: complete, partial, or blocked
- Risks, blockers, or assumptions
- Recommended next owner, if any

## Common Failure Modes To Handle

- `docker-compose up --build --watch` fails because one of the Compose services is unhealthy.
- Backend tests from the host cannot connect because `test_db` should be reached at `127.0.0.1:5431`, not the container hostname.
- The backend inside Compose uses `db` or `test_db` hostnames, but the user copied those values into a host-run test or app command.
- PostgreSQL emits `collation version mismatch` warnings after a Docker image or base-OS update.
- Local schema drift makes existing Postgres volume data incompatible with the current code.
- The user is running backend or frontend outside Docker without the required local dependencies or environment file.

## Rules

- Prefer diagnosis before reset.
- Call out clearly when a recommendation will delete local database data.
- Keep the advice tied to Baldin's actual Compose services, scripts, ports, and docs.
- Do not widen a local-stack diagnosis into code changes unless the evidence shows the bug is in product logic rather than environment setup.
- If you recommend running tests or builds, use the narrowest relevant commands from `docs/docs/engineering/testing.md`.

## Completion Checks

- The advice distinguishes host-run versus container-run settings when that matters.
- Any destructive reset recommendation is justified and clearly labeled.
- The output names the exact script or command to run next.
- The report states what is fixed versus what is only inferred.
- The guidance reflects Baldin's local-first workflow instead of generic Docker troubleshooting.

## Example Prompts

- Diagnose why Baldin's local stack will not boot after pulling changes.
- Should I use `./scripts/reset_local_db.sh` or `./scripts/repair_local_db_collation.sh` for this Postgres warning?
- My host-run backend tests cannot connect to `test_db`. Tell me the correct Baldin local settings.
- The frontend or backend starts outside Docker, but the local stack is still broken. Walk me through the smallest recovery path.
