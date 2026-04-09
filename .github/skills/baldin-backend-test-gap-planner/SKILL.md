---
name: baldin-backend-test-gap-planner
description: "Plan Baldin backend test coverage work. Use when backend routes, auth, ETL, models, or orchestration changed and you need to choose the narrowest useful pytest coverage, decide between pure unit and DB-backed tests, or target route-handler gaps without wasting time on the full suite."
argument-hint: "Optional: changed backend files, failing behavior, or the route or model area you need to cover"
---

# Baldin Backend Test Gap Planner

Use this skill to decide what backend tests Baldin actually needs for a change, which fixtures or test style fit best, and how to validate the work against the repo's current coverage expectations.

## Scope

- This is a Baldin-only workspace skill and should stay in `.github/skills/` for this repo.
- Keep the scope on backend test planning and targeted validation, not on broad product planning.
- Use it when a backend change needs test coverage guidance or when existing coverage is too shallow to trust a change.
- Favor the smallest effective pytest scope that proves behavior without dropping important API, permission, or data-integrity checks.

## Source-Of-Truth Inputs

- `docs/docs/engineering/testing.md`
- `.github/workflows/ci.yml`
- `backend/app/conftest.py`
- `backend/app/tests/**`

## Default Assumptions

- Baldin's backend CI gate enforces `--cov-fail-under=60` across `app/` and `etl/`.
- The repo already has a substantial backend test suite, so new work should usually extend an existing test area before inventing a parallel pattern.
- Shared fixtures in `backend/app/conftest.py` are the preferred direction for DB-backed integration tests, even though some older tests still use module-local helpers.
- Host-run backend tests use a dedicated local `test_db` on `127.0.0.1:5431`.
- When the local `test_db` service is unavailable, backend tests in `PYTEST` mode fail fast instead of hanging.
- Route handlers and integration-heavy flows are still a known weakness area in the current polish plan, so coverage choices should prefer user-visible or regression-prone behavior over incidental helpers.

## Procedure

1. Classify the backend change.
   - Pure helper or transformation logic.
   - Route handler or request parsing behavior.
   - Permission or auth behavior.
   - DB-backed model or state transition behavior.
   - ETL, extraction, orchestration, or retry flow.
2. Choose the narrowest test shape that matches the risk.
   - Pure logic change: add or extend a pure unit test.
   - Route contract, permission, or request-validation change: prefer an API-level test using the FastAPI app and shared fixtures.
   - DB-backed workflow or side-effect change: use DB-backed integration coverage.
   - Retry or orchestration branching: isolate branch logic with focused unit coverage first, then add integration coverage only for the externally visible path.
3. Reuse the nearest existing test surface.
   - Prefer extending the closest existing module under `backend/app/tests/`.
   - Use shared fixtures from `backend/app/conftest.py` when they fit instead of copying private setup helpers.
4. Map the plan to validation.
   - Recommend the smallest relevant pytest command.
   - Call out when local `test_db` availability is a prerequisite.
   - Note whether the coverage gate or CI behavior changes confidence requirements.
5. Report gaps and next steps.
   - Explain what remains untested.
   - Name the next owner if the real missing coverage is frontend or cross-stack rather than backend-only.

## Required Output

`Change classification`
- changed backend surface
- dominant risk type

`Recommended test shape`
- unit, DB-backed integration, API-level route test, or mixed strategy
- why that test shape fits Baldin better than the alternatives

`Target locations`
- closest existing test module or a justified new test file
- relevant shared fixtures or helpers to reuse

`Validation plan`
- exact pytest command or narrow command sequence
- whether local `test_db` is required
- what CI gate this supports

`Coverage gaps`
- what the proposed tests would prove
- what would remain unverified

`Final status`
- Status: complete, partial, or blocked
- Risks, blockers, or assumptions
- Recommended next owner, if any

## Common Decision Rules

- If a change only touches pure transformation helpers, do not default to DB-backed tests.
- If a change alters route behavior, auth, permissions, serialization, or request parsing, pure unit coverage alone is usually not enough.
- If a change affects orchestration or retry branching, split logic tests from end-to-end behavior checks instead of forcing one giant integration test.
- If the closest existing tests already cover the same endpoint family or subsystem, extend them before creating a new file.
- If local database availability is the only blocker, say so explicitly instead of treating the missing DB as a product regression.

## High-Value Gap Areas

- Route-handler coverage where the polish plan already calls out thin testing.
- Companies extraction and related API behavior.
- Document sharing and related permission flows.
- Lead comments and other user-visible write paths.
- MFA lifecycle and auth boundary behavior.

## Rules

- Prefer focused regression tests over broad “cover everything” suites.
- Do not recommend the full backend suite unless the change genuinely spans multiple backend subsystems.
- Keep guidance aligned with existing Baldin pytest patterns and fixtures.
- If the change also affects generated contracts or frontend behavior, name the appropriate follow-on owner rather than pretending backend tests are sufficient.

## Completion Checks

- The recommendation matches the actual backend risk, not a generic testing preference.
- The output states whether local `test_db` access is required.
- The suggested test location follows existing Baldin test organization.
- The plan makes clear what confidence is gained and what still is not covered.

## Example Prompts

- I changed a FastAPI route in Baldin. Tell me whether I need a pure unit test or a DB-backed route test.
- Plan the smallest pytest coverage for a backend permission change in `backend/app/api/`.
- I updated extraction retry logic. Show me the right split between unit tests and integration coverage.
- What backend tests should I add for a document-sharing regression without defaulting to the full suite?
