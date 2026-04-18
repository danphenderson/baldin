# Baldin Copilot Compatibility Instructions

Use root/scoped `AGENTS.md` as the canonical shared baseline. Copilot should apply root `AGENTS.md`, the relevant scoped `AGENTS.md` chain for the target files, and any matching `.github/instructions/**` files. Do not load every scoped `AGENTS.md` file globally.

## Default Workflow

- Baldin is a local-first developer-preview monorepo. Prefer the smallest complete change that improves local correctness, reproducibility, or launch-path readiness.
- Do not introduce mature-SaaS, cloud-scale, or enterprise-compliance architecture unless the task explicitly requires it.
- Default to `docker-compose up --build --watch` from the repo root, keep the stack warm while iterating, and use Compose Watch as the supported live-edit loop. The normal loop is inspect -> patch -> smoke-check.
- Repo-tracked `backend/.env` and `frontend/.env` are safe worktree defaults. Use ignored `.env.local` files for persistent local overrides, and Copilot or Codex env vars for one-off launches.
- If you run backend tests from the host, use `127.0.0.1:5431` for `test_db`; inside Compose, use `test_db`.
- If local schema drift blocks work and local data is disposable, use `./scripts/reset_local_db.sh`. Use `./scripts/repair_local_db_collation.sh` only for collation mismatch recovery when local data must survive.

## Core Repo Rules

- Shared repo posture, owner model, scoped local deltas, and standard handback rules live in root/scoped `AGENTS.md`. `.github/**` is a Copilot compatibility and execution layer, not the canonical policy source.
- Prefer direct ownership when it is obvious: backend-only -> Baldin Backend Agent; frontend-only -> Baldin Frontend Agent; archived-design reference or mapping maintenance -> Baldin Design Lead Agent; true cross-stack, contracts, docs, CI, scripts, or compose work -> Baldin Lead Full-Stack Architect. Use Baldin Project Manager only when routing or sequencing is genuinely unclear.
- Start with the smallest relevant smoke check. Treat full-suite, docs-build, and CI-style validation as follow-up unless the changed surface clearly requires them.
- Do not hand-edit `openapi.json`, `frontend/src/schema.d.ts`, or `docs/build/**`.
- If backend routes or schemas change, prefer `SCHEMA_UPDATE_FORCE=1 ./scripts/update_frontend_schemas.sh` during active local iteration and report whether generated artifacts actually changed.
- Contract regeneration imports the backend app. Use the tracked `backend/.env` baseline, add persistent local overrides in `backend/.env.local`, and use process env only for one-off launches. A real `OPENAI_API_KEY` is only needed for OpenAI-backed features, not for app import or schema generation.
- For archived Figma work, assume a Professional-plan workflow without a Dev seat: treat Figma as optional historical reference only, keep active implementation grounded in `frontend/src/design-system/*`, `operator-design/`, and `plans/v2.1/*`, and rely on the local browser harness plus Figma MCP or basic inspection instead of making Code Connect publish a prerequisite.
- Do not add tracked `AGENTS.override.md` files unless the repo documents an override policy and validator allowlist first.

## Reference Docs

- [Agentic Asset Inventory](AGENTIC_SURFACE.md)
- [Project Delivery Rules](instructions/baldin-project.instructions.md)
- [Agentic Configuration Rules](instructions/baldin-agent-customization.instructions.md)
- [Work Locally](../docs/docs/engineering/local-development.md)
- [Run The Right Checks](../docs/docs/engineering/testing.md)
- [Regenerate API Contracts](../docs/docs/engineering/contract-management.md)
