# Baldin Agent Working Agreement

Use this file as the shared repo baseline for Baldin's agentic coding surfaces.

## Repo Posture

- Baldin is a local-first developer-preview monorepo moving toward a deployable POC.
- Prefer the smallest complete change that improves local correctness, reproducibility, or launch-path readiness.
- Do not introduce mature-SaaS, cloud-scale, or enterprise-compliance architecture unless the task explicitly requires it.

## Default Workflow

- Default to the local `docker-compose.yml` stack from the repo root with `docker-compose up --build`.
- Keep the stack warm while you work. The normal loop is inspect -> patch -> smoke-check, not restart-everything.
- Repo-tracked `backend/.env` and `frontend/.env` provide safe local defaults for every worktree. Put real secrets in Codex UI env vars or ignored `backend/.env.local` / `frontend/.env.local`.
- Running services outside Compose is a secondary path. If you run backend tests from the host, use `127.0.0.1:5431` for `test_db`; inside Compose the hostname is `test_db`.
- If local schema drift blocks work and local data is disposable, use `./scripts/reset_local_db.sh`. Use `./scripts/repair_local_db_collation.sh` only for collation mismatch recovery when local data must survive.

## Figma Workflow

- Baldin's supported Figma workflow assumes a Professional-plan workspace and does not depend on a Dev seat.
- For agentic Figma work, prefer the local browser harness plus Figma MCP read or write tools when available.
- Treat basic inspection, screenshots, and harness-driven capture as sufficient when seat limits block Dev Mode-specific UX.
- Do not make Code Connect publish, Dev Mode-only setup, or organization-only Figma features a required step for completing repo work.
- Keep `frontend/figma.config.json` and `frontend/src/design-system/**/*.figma.ts` as optional local metadata and future-proofing, not as a blocking delivery dependency.

## Owner Model

- Backend-only routes, models, auth, ETL, extraction, or backend tests: use `baldin_backend` in Codex or Baldin Backend Agent in Copilot.
- Frontend-only UI, UX, accessibility, routing, state handling, or typed service consumption: use `baldin_frontend` in Codex or Baldin Frontend Agent in Copilot.
- Cross-stack contracts, schema generation, docs, CI, scripts, docker-compose, or release-path work: use `baldin_full_stack_architect` in Codex or Baldin Lead Full-Stack Architect in Copilot.
- Unclear ownership, sequencing, or multi-stream planning: use `baldin_project_manager` in Codex or Baldin Project Manager in Copilot.
- Read-only scouting: use Codex's built-in `explorer` agent or Copilot's Explore agent. Do not treat a scout as the implementation owner.

## Generated Artifacts And Docs

- Do not hand-edit `openapi.json`, `frontend/src/schema.d.ts`, or `docs/build/**`.
- When backend routes or schemas change, prefer `SCHEMA_UPDATE_FORCE=1 ./scripts/update_frontend_schemas.sh` during active local development and report whether generated artifacts actually changed.
- Contract regeneration imports the backend app. Use the tracked `backend/.env` baseline and supply a non-empty `OPENAI_API_KEY` through process env or `backend/.env.local`; a dummy local value is acceptable when real API access is not needed.
- Edit docs source under `docs/docs/**`. Rebuild generated docs output instead of patching it directly.

## Validation Expectations

- Start with the smallest relevant smoke check for the touched surface.
- Backend: prefer the narrowest useful pytest scope first.
- Frontend: prefer the smallest relevant test first, then `./node_modules/.bin/tsc --noEmit` and `npm run build` when the changed surface warrants it.
- Docs and navigation changes: run the docs build when routes, sidebars, redirects, or published pages changed.
- Treat full-suite or CI-style validation as a follow-up unless the task or changed surface clearly requires it.

## Custom Agent Notes

- Project-scoped Codex custom agents live under `.codex/agents/`.
- Copilot-specific prompts, agents, skills, and scoped instructions live under `.github/`.
- Do not force a one-to-one Codex equivalent for every Copilot prompt file. Use the same owner model, but let Codex rely on `AGENTS.md`, `/plan`, and named custom agents where that is cleaner.

## Standard Handback

For non-trivial work, return:

- Status: complete, partial, or blocked.
- Summary: what changed, delegated, or decided and why.
- Files touched or reviewed.
- Commands run and result summary.
- Whether API routes or schemas changed.
- Whether generated artifacts were regenerated, intentionally deferred, or unchanged.
- Risks, blockers, or assumptions.
- Recommended next owner, if any.

## References

- `docs/docs/engineering/local-development.md`
- `docs/docs/engineering/testing.md`
- `docs/docs/engineering/contract-management.md`
- `docs/docs/engineering/copilot-prompt-cookbook.md`
- `.github/AGENTIC_SURFACE.md`
