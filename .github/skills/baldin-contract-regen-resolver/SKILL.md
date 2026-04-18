---
name: baldin-contract-regen-resolver
description: "Resolve Baldin API contract regeneration and schema drift. Use when backend routes or schemas changed, openapi.json or frontend/src/schema.d.ts may be stale, scripts/update_frontend_schemas.sh exits early, SCHEMA_UPDATE_FORCE is needed, or frontend types drift after backend API work."
argument-hint: "Optional: changed backend area, failing regeneration symptom, or whether regeneration should be forced"
---

# Baldin Contract Regen Resolver

Use this skill to decide whether Baldin's generated API contract needs regeneration, run the right preflight checks, fix the common failure modes, and report generated-artifact status clearly.

## Scope

- This is a Baldin-only workspace skill and should stay in `.github/skills/` for this repo.
- Keep the scope on the backend to contract to frontend workflow. Do not turn this into generic OpenAPI advice.
- Use the Baldin Lead Full-Stack Architect as the default owner when the task already spans backend API changes, generated contract artifacts, and frontend fallout.
- If backend work is complete but regeneration ownership is intentionally deferred, require an explicit handoff naming the Baldin Lead Full-Stack Architect as the next owner.

## Source-Of-Truth Inputs

- `scripts/update_frontend_schemas.sh`
- `docs/docs/engineering/contract-management.md`
- `docs/docs/engineering/testing.md`
- `docs/docs/getting-started/contributing.md`
- `.github/workflows/ci.yml`
- `backend/.env`
- `backend/app/core/conf.py`
- `backend/app/schemas.py`
- `backend/app/api/**/*.py`
- `openapi.json`
- `frontend/src/schema.d.ts`

## Default Assumptions

- Baldin's contract flow is one-way: backend -> `openapi.json` -> `frontend/src/schema.d.ts`.
- `openapi.json` and `frontend/src/schema.d.ts` are generated artifacts. Never hand-edit them.
- Regeneration is required whenever the public FastAPI request or response surface changes.
- The checked-in script only auto-runs when staged changes include `backend/app/schemas.py` or `backend/app/api/**/*.py`, unless `SCHEMA_UPDATE_FORCE=1` is set.
- The script imports `app.main`, so backend env readiness matters during contract generation. Use the tracked `backend/.env` baseline, add persistent local overrides in `backend/.env.local`, and use process env for one-off launches. A real `OPENAI_API_KEY` is only needed for OpenAI-backed features, not for app import.
- CI is the final freshness guard, not the first discovery mechanism. Prefer catching stale contract state locally before merge.

## Procedure

1. Decide whether regeneration is actually needed.
   - Inspect changed files first.
   - Treat changes in `backend/app/schemas.py` or `backend/app/api/**/*.py` as regeneration-required unless proven otherwise.
   - If only models, services, or internals changed, verify whether the FastAPI schema surface moved before regenerating.
2. Run preflight checks.
   - Confirm a usable Python interpreter exists for backend app import.
   - Confirm frontend dependencies are available so `npm exec openapi-typescript` can run.
   - Confirm backend env values are sufficient for app import, using `backend/.env.local` as the normal local override path and process env for one-off launches.
   - If the user is working from unstaged changes or broader validation, decide whether `SCHEMA_UPDATE_FORCE=1` is required.
3. Execute regeneration through the repo script.
   - Prefer `./scripts/update_frontend_schemas.sh`.
   - Use `SCHEMA_UPDATE_FORCE=1 ./scripts/update_frontend_schemas.sh` when staged-file gating would hide real work.
4. Inspect output and fallout.
   - Confirm `openapi.json` and `frontend/src/schema.d.ts` were updated or intentionally unchanged.
   - Check whether frontend typing or service call sites now need follow-up.
   - If regeneration unexpectedly produces no diff, verify whether the backend change truly altered the public schema surface.
5. Report completion status clearly.
   - State whether API routes or schemas changed.
   - State whether generated artifacts were regenerated, intentionally deferred, or unchanged.
   - Name the next owner if frontend fallout or full-stack validation is still required.

## Required Output

`Decision`
- Whether contract regeneration was required and why.

`Preflight`
- Python readiness
- frontend or npm readiness
- env readiness, including whether `backend/.env.local` or process env supplied any needed overrides
- whether `SCHEMA_UPDATE_FORCE` was needed

`Execution`
- exact command run
- whether the script exited early, succeeded, or failed
- which generated artifacts changed

`Downstream impact`
- frontend typing or service fallout
- follow-on validation still needed
- recommended owner

`Final status`
- Status: complete, partial, or blocked
- Whether API routes or schemas changed
- Whether generated artifacts were regenerated, intentionally deferred, or unchanged
- Risks, blockers, or assumptions

## Common Failure Modes To Handle

- The script exits early because no matching staged files are present.
- A Python interpreter cannot be found for OpenAPI generation.
- Frontend dependencies are missing, so `npm exec openapi-typescript` fails.
- Backend app import fails because env setup is incomplete or another settings regression is blocking startup.
- Regeneration succeeds but frontend typing breaks and needs a deliberate follow-on.
- Backend changes do not actually affect the public API surface, so regeneration is unnecessary and should be explained, not forced blindly.

## Rules

- Do not hand-edit `openapi.json` or `frontend/src/schema.d.ts`.
- Do not regenerate contracts just in case without first checking whether the FastAPI schema surface changed, unless the user explicitly asks for a forced refresh.
- Keep this skill operational. It should guide execution and diagnosis, not expand into general API design review.
- If the task becomes broader than contract regeneration and fallout triage, hand ownership to the Baldin Lead Full-Stack Architect.
- If you update the contract, recommend the narrowest follow-on validation from `docs/docs/engineering/testing.md`.

## Completion Checks

- The decision to regenerate or not is grounded in concrete changed files or schema impact.
- The report states whether `SCHEMA_UPDATE_FORCE` was used and why.
- Generated-artifact status is explicit.
- Any frontend fallout is either addressed or handed off cleanly.
- The output reflects Baldin's local-first, developer-preview workflow rather than generic CI advice.

## Example Prompts

- Regenerate Baldin's API contract after changing `backend/app/api/routes/documents.py`.
- Figure out why `./scripts/update_frontend_schemas.sh` exited early even though my backend API work should change types.
- Check whether `openapi.json` and `frontend/src/schema.d.ts` are stale after a schema change and tell me what follow-on validation to run.
- Force-refresh Baldin's contract artifacts and explain any frontend typing fallout.
