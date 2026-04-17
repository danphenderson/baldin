# Baldin Agent Working Agreement

Use this file as the shared repo baseline for Baldin's agentic coding surfaces. Scoped `AGENTS.md` files add local rules only where directory behavior differs meaningfully.

## Repo Posture

- Baldin is a local-first developer-preview monorepo moving toward a deployable POC.
- Prefer the smallest complete change that improves local correctness, reproducibility, or launch-path readiness.
- Do not introduce mature-SaaS, cloud-scale, or enterprise-compliance architecture unless the task explicitly requires it.

## Default Workflow

- Default to the local `docker-compose.yml` stack from the repo root with `docker-compose up --build --watch`.
- Keep the stack warm while you work. The normal loop is inspect -> patch -> smoke-check, not restart-everything.
- Repo-tracked `backend/.env` and `frontend/.env` provide safe local defaults for every worktree. Put real secrets in Codex UI env vars or ignored `backend/.env.local` / `frontend/.env.local`.
- Running services outside Compose is a secondary path. If you run backend tests from the host, use `127.0.0.1:5431` for `test_db`; inside Compose the hostname is `test_db`.
- For host-side backend pytest, prefer `./scripts/run_backend_pytest_host.sh` or `cd backend && pipenv run pytest ...`. Do not assume bare `pytest` is available on the shell `PATH`.
- If local schema drift blocks work and local data is disposable, use `./scripts/reset_local_db.sh`. Use `./scripts/repair_local_db_collation.sh` only for collation mismatch recovery when local data must survive.

## Figma Workflow

- Baldin's supported Figma workflow assumes a Professional-plan workspace and does not depend on a Dev seat.
- Treat `Baldin-Library` as the canonical reusable-component source, `Baldin Product Redesign — Command Center` as the active product redesign working file, and `docs/docs/reference/baldin-redesign-handoff.md` as the authoritative redesign source.
- Treat the current Figma Make file as a reviewed archived sandbox. The 2026-04-13 salvage review found an empty app shell, stock guidelines, and generic Tailwind or shadcn scaffolding rather than a canonical Baldin buildout.
- For agentic Figma work, prefer the local browser harness plus Figma MCP read or write tools when available. Structure and component inspection can proceed through MCP without a Developer seat.
- For privileged admin capture, start from `/browser-harness/admin-session.html?next=/admin/...` so the browser session receives the configured local superuser token before opening `/admin/*`.
- Do not use the `webdev` Playwright MCP tools for Baldin browser capture or route verification. They are not part of the supported local agent path; use the repo-local frontend Playwright runtime, configured host browser tooling, or direct Figma MCP inspection instead.
- Treat basic inspection, screenshots, and harness-driven capture as sufficient when seat limits block Dev Mode-specific UX.
- Version-history review still depends on browser or web access to the Figma UI. If browser automation is unavailable, fall back to direct web review instead of making Dev Mode a prerequisite.
- Do not make Code Connect publish, Code Connect workspace reads, Dev Mode-only setup, or organization-only Figma features a required step for completing repo work. Current workspace reads and publish flows are seat-blocked without a Developer seat on an Organization or Enterprise plan.
- Do not port Tailwind token names, `cva` variant contracts, shadcn wrapper APIs, or other Make scaffolding directly into Baldin's canonical MUI design system. At most, salvage layout or state-story ideas and rewrite them through the existing Baldin tokens, primitives, and patterns.
- Keep `frontend/figma.config.json` and `frontend/src/design-system/**/*.figma.ts` as optional local metadata and future-proofing, not as a blocking delivery dependency.

## Owner Model

- Backend-only routes, models, auth, ETL, extraction, or backend tests: use `baldin_backend` in Codex or Baldin Backend Agent in Copilot.
- Frontend-only UI, UX, accessibility, routing, state handling, or typed service consumption: use `baldin_frontend` in Codex or Baldin Frontend Agent in Copilot.
- Figma-first design work, `Baldin-Library` or `Baldin Product Redesign — Command Center` updates, browser-harness capture, repo-backed `.figma.ts` mapping, or design-to-code handoff: use `baldin_design_lead` in Codex or Baldin Design Lead Agent in Copilot.
- Cross-stack contracts, schema generation, docs, CI, scripts, docker-compose, or release-path work: use `baldin_full_stack_architect` in Codex or Baldin Lead Full-Stack Architect in Copilot.
- Unclear ownership, sequencing, or multi-stream planning: use `baldin_project_manager` in Codex or Baldin Project Manager in Copilot.
- Read-only scouting: use Codex's built-in `explorer` agent or Copilot's Explore agent. Do not treat a scout as the implementation owner.
- Project-scoped Codex custom agents live under `.codex/agents/`.
- Copilot-specific prompts, agents, skills, and scoped instructions live under `.github/`.
- Do not force a one-to-one Codex equivalent for every Copilot prompt file. Use the same owner model, but let Codex rely on `AGENTS.md`, `/plan`, and named custom agents where that is cleaner.

## Generated Artifacts And Docs

- Do not hand-edit `openapi.json`, `frontend/src/schema.d.ts`, or `docs/build/**`.
- When backend routes or schemas change, prefer `SCHEMA_UPDATE_FORCE=1 ./scripts/update_frontend_schemas.sh` during active local development and report whether generated artifacts actually changed.
- Contract regeneration imports the backend app. Use the tracked `backend/.env` baseline and supply a non-empty `OPENAI_API_KEY` through process env or `backend/.env.local`; a dummy local value is acceptable when real API access is not needed.
- Edit docs source under `docs/docs/**`. Rebuild generated docs output instead of patching it directly.

## Validation Expectations

- Start with the smallest relevant smoke check for the touched surface.
- Backend: prefer the narrowest useful pytest scope first, using `./scripts/run_backend_pytest.sh` by default and `pipenv run pytest` only for intentional host-side loops.
- Frontend: prefer the smallest relevant test first, then `./node_modules/.bin/tsc --noEmit` and `npm run build` when the changed surface warrants it.
- Docs and navigation changes: run the docs build when routes, sidebars, redirects, or published pages changed.
- Treat full-suite or CI-style validation as a follow-up unless the task or changed surface clearly requires it.

## Directory Instruction Map

Codex and compatible tooling should apply this root file plus the relevant scoped `AGENTS.md` chain for the current working path or target files. Do not load every scoped file globally for every task. Unlisted child directories inherit the nearest parent scoped file.

Do not add tracked `AGENTS.override.md` files. If a future workflow needs one, first document the precedence rationale and add validator coverage.

Expected scoped instruction files:

```text
backend/AGENTS.md
backend/app/AGENTS.md
backend/app/admin_templates/AGENTS.md
backend/app/api/AGENTS.md
backend/app/api/routes/AGENTS.md
backend/app/core/AGENTS.md
backend/app/core/extractor/AGENTS.md
backend/app/core/rag/AGENTS.md
backend/app/extractor/AGENTS.md
backend/app/etl_service/AGENTS.md
backend/app/evals/AGENTS.md
backend/app/tests/AGENTS.md
backend/etl/AGENTS.md
backend/etl/tests/AGENTS.md
backend/alembic/AGENTS.md
backend/public/AGENTS.md
backend/public/seeds/AGENTS.md
frontend/AGENTS.md
frontend/admin/AGENTS.md
frontend/browser-harness/AGENTS.md
frontend/e2e/AGENTS.md
frontend/.storybook/AGENTS.md
frontend/scripts/AGENTS.md
frontend/src/AGENTS.md
frontend/src/admin/AGENTS.md
frontend/src/browser-harness/AGENTS.md
frontend/src/component/AGENTS.md
frontend/src/design-system/AGENTS.md
frontend/src/layout/AGENTS.md
frontend/src/page/AGENTS.md
frontend/src/route/AGENTS.md
frontend/src/service/AGENTS.md
frontend/test/AGENTS.md
docs/AGENTS.md
docs/docs/AGENTS.md
docs/src/AGENTS.md
docs/static/AGENTS.md
docs/i18n/AGENTS.md
scripts/AGENTS.md
cdk/AGENTS.md
cdk/cdk/AGENTS.md
cdk/tests/AGENTS.md
plans/AGENTS.md
.codex/AGENTS.md
.codex/agents/AGENTS.md
.codex/environments/AGENTS.md
.github/AGENTS.md
.github/agents/AGENTS.md
.github/instructions/AGENTS.md
.github/prompts/AGENTS.md
.github/skills/AGENTS.md
.github/workflows/AGENTS.md
```

Do not add scoped `AGENTS.md` files under `frontend/src/config`, `frontend/src/context`, `frontend/src/theme`, `frontend/src/util`, `frontend/src/bootstrap`, component/page/design-system leaf directories, `.github/ISSUE_TEMPLATE`, `.vscode`, root `public`, or generated/dependency/cache/runtime directories.

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
