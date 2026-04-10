# Project Guidelines

## Repo Posture
- Baldin is a local-first developer-preview monorepo moving toward a deployable POC. Prefer the smallest complete change that improves local correctness, reproducibility, or launch-path readiness.
- Do not introduce mature-SaaS, cloud-scale, or enterprise-compliance architecture unless the task explicitly requires it.
- Scoped delivery and Copilot-asset rules live in `.github/instructions/`.

## Local Default Workflow
- Default to the local `docker-compose.yml` stack. Start from the repo root with `docker-compose up --build` unless the task explicitly needs an outside-container loop.
- Keep the stack running while you work. `web` uses Uvicorn reload and `frontend` uses Vite HMR, so the normal loop is inspect -> patch -> smoke-check, not restart-everything.
- Running backend or frontend outside Compose is a secondary debug path. If you run backend tests from the host, use the local `test_db` port at `127.0.0.1:5431`; inside Compose the hostname is `test_db`.
- If local schema drift blocks work and local data is disposable, use `./scripts/reset_local_db.sh`. Use `./scripts/repair_local_db_collation.sh` only for PostgreSQL collation mismatch recovery when keeping local data matters.

## Agent Execution Bias
- Prefer direct execution when ownership is obvious: backend-only -> Baldin Backend Agent, frontend-only -> Baldin Frontend Agent, real cross-stack work -> Baldin Lead Full-Stack Architect.
- Do not add planning or coordination overhead for routine single-owner fixes. Use Baldin Project Manager only when ownership, scope, or sequencing is genuinely unclear.
- During active editing, run the smallest useful smoke check first. Treat full suites, broad docs builds, and CI-style validation as pre-push follow-up unless the request or changed surface clearly requires them.
- If backend API routes or schemas change during active development, prefer `SCHEMA_UPDATE_FORCE=1 ./scripts/update_frontend_schemas.sh` so contract regeneration works before files are staged. Do not hand-edit `openapi.json` or `frontend/src/schema.d.ts`.
- Contract regeneration imports the backend app. Ensure backend env requirements are present, including a non-empty `OPENAI_API_KEY`; a dummy local value is acceptable when real API access is not needed.

## Reference Docs
- [Copilot Asset Inventory](COPILOT_SURFACE.md)
- [Prompt The Right Agent](../docs/docs/engineering/copilot-prompt-cookbook.md)
- [Run The Right Checks](../docs/docs/engineering/testing.md)
- [Regenerate API Contracts](../docs/docs/engineering/contract-management.md)
- [Work Locally](../docs/docs/engineering/local-development.md)
- [System Overview](../docs/docs/architecture/system-overview.md)
