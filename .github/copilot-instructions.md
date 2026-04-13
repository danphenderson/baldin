# Baldin Copilot Compatibility Instructions

Use `AGENTS.md` as the shared repo baseline. This file preserves the same expectations for Copilot's always-on instruction layer and calls out the Copilot-specific surfaces under `.github/`.

## Repo Posture

- Baldin is a local-first developer-preview monorepo moving toward a deployable POC.
- Prefer the smallest complete change that improves local correctness, reproducibility, or launch-path readiness.
- Do not introduce mature-SaaS, cloud-scale, or enterprise-compliance architecture unless the task explicitly requires it.
- Shared repo rules live in `AGENTS.md`; Copilot compatibility and scoped `.github` rules live in `.github/instructions/`.

## Local Default Workflow

- Default to the local `docker-compose.yml` stack from the repo root with `docker-compose up --build` unless the task explicitly needs an outside-container loop.
- Keep the stack running while you work. `web` uses Uvicorn reload and `frontend` uses Vite HMR, so the normal loop is inspect -> patch -> smoke-check, not restart-everything.
- Repo-tracked `backend/.env` and `frontend/.env` provide safe local defaults for every worktree. Put real secrets in Copilot or Codex env vars, or ignored `backend/.env.local` / `frontend/.env.local`.
- Running backend or frontend outside Compose is a secondary debug path. If you run backend tests from the host, use `127.0.0.1:5431` for `test_db`; inside Compose the hostname is `test_db`.
- If local schema drift blocks work and local data is disposable, use `./scripts/reset_local_db.sh`. Use `./scripts/repair_local_db_collation.sh` only for PostgreSQL collation mismatch recovery when keeping local data matters.

## Agent Routing Bias

- Prefer direct execution when ownership is obvious: backend-only -> Baldin Backend Agent, frontend-only -> Baldin Frontend Agent, real cross-stack work -> Baldin Lead Full-Stack Architect.
- Use Baldin Project Manager only when ownership, scope, or sequencing is genuinely unclear.
- Use Explore only for read-only scouting before handing work to a real owner.

## Key Repo Rules

- During active editing, run the smallest useful smoke check first. Treat full suites, broad docs builds, and CI-style validation as follow-up unless the changed surface clearly requires them.
- If backend API routes or schemas change during active development, prefer `SCHEMA_UPDATE_FORCE=1 ./scripts/update_frontend_schemas.sh` so contract regeneration works before files are staged.
- Do not hand-edit `openapi.json`, `frontend/src/schema.d.ts`, or `docs/build/**`.
- Contract regeneration imports the backend app. Use the tracked `backend/.env` baseline and supply a non-empty `OPENAI_API_KEY` through process env or `backend/.env.local`; a dummy local value is acceptable when real API access is not needed.
- For Figma work, assume the supported path is a Professional-plan workflow without requiring a Dev seat: use the local browser harness plus Figma MCP or basic inspection, and do not block on Code Connect publish.

## Copilot-Specific Surfaces

- `.github/prompts/*.prompt.md` for Copilot slash-command entry points.
- `.github/agents/*.agent.md` for Copilot specialist owners and orchestration.
- `.github/skills/*/SKILL.md` for repeatable Copilot workflows.
- `.github/instructions/*.instructions.md` for Copilot-scoped edit-time rules.

## Reference Docs

- [Agentic Asset Inventory](AGENTIC_SURFACE.md)
- [Prompt The Right Agent](../docs/docs/engineering/copilot-prompt-cookbook.md)
- [Run The Right Checks](../docs/docs/engineering/testing.md)
- [Regenerate API Contracts](../docs/docs/engineering/contract-management.md)
- [Work Locally](../docs/docs/engineering/local-development.md)
- [System Overview](../docs/docs/architecture/system-overview.md)
