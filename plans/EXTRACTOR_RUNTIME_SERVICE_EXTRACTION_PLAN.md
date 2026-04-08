# Extractor Runtime Service Extraction — Implementation Plan

Date: 2026-04-06
Branch: feat-sprint
Status: Draft — implementation-ready for backend handoff
Primary owner: Baldin Backend Agent
Review owner: Baldin Lead Full-Stack Architect

---

## Goal

Move the generic extractor execution runtime out of the API dependency layer
and into a backend-core service boundary without changing extractor behavior,
public route contracts, retry semantics, or approval flow.

This is a structural refactor, not a product rewrite.

The target outcome is:

- extractor routes keep the same request and response contracts
- replayable retry payloads remain intact
- extractor examples, versions, approval, and schema-driven extraction remain intact
- orchestration lifecycle becomes core-owned instead of API-owned
- the API layer becomes thinner and easier to reason about

---

## Fixed Decisions

These decisions are locked for this patch and should not be reopened unless a
blocker is found.

### Scope

- Refactor the extractor runtime only.
- Do not redesign extractor prompts, extraction logic, retrieval strategy, or
  schema semantics.
- Do not change `ExtractorRun`, `ExtractorResponse`, extractor route shapes, or
  any frontend contracts.

### Runtime Model

- Keep the extractor as a linear workflow.
- Do not migrate the extractor runtime to LangGraph in this patch.
- Do not add checkpoint persistence or graph state machinery.

### Retry Semantics

- Preserve replayable retry behavior exactly.
- Keep persisted source metadata for text, URL, and file runs.
- Keep stored file snapshot behavior and file rehydration behavior.

### Orchestration

- Reuse `app.core.orchestration` where possible instead of open-coding pipeline
  and event persistence in the extractor runtime.
- Keep extractor payload persistence richer than the compact telemetry used by
  the document RAG workflows.

### Boundaries

- Do not modify generated artifacts such as `openapi.json` or
  `frontend/src/schema.d.ts`.
- Do not touch frontend files.
- Do not widen this into a general extraction subsystem redesign.

---

## Why This Patch

The current extractor runner in [backend/app/api/deps.py](backend/app/api/deps.py#L808)
does much more than dependency resolution:

- resolves and normalizes extraction input from text, URL, or file
- creates or reuses an orchestration pipeline
- persists replayable orchestration payloads
- stamps extractor version hashes for traceability
- dispatches to extraction strategies
- finalizes success, failure, and pending-review states

That is core workflow logic, not API dependency logic.

By comparison, the newer document RAG flows are routed through a dedicated core
service in [backend/app/core/rag/service.py](backend/app/core/rag/service.py).
This patch brings the extractor boundary into the same architectural shape
without forcing the extractor to adopt the same orchestration model.

---

## Non-Goals

The implementing agent should explicitly avoid all of the following:

- converting extractor execution to LangGraph
- changing extractor route URLs or schemas
- changing `ExtractorRun` source precedence rules
- changing `build_extractor_event_payload()` or `rehydrate_extractor_run()` semantics
- changing extractor example handling, versioning, or approval rules
- replacing replayable payloads with compact telemetry-only payloads
- reworking `app/extractor/extraction_runnable.py` prompt composition
- reworking `app/extractor/retrieval.py` retrieval behavior
- touching frontend code or regenerating contracts

---

## Current State Summary

### Current API entrypoints

Extractor execution is currently entered through:

- [backend/app/api/routes/extractor.py](backend/app/api/routes/extractor.py#L334)
- [backend/app/api/routes/leads.py](backend/app/api/routes/leads.py#L423)
- [backend/app/api/routes/users.py](backend/app/api/routes/users.py#L446)
- [backend/app/api/routes/companies.py](backend/app/api/routes/companies.py#L139)
- [backend/app/api/routes/skills.py](backend/app/api/routes/skills.py#L46)
- [backend/app/api/routes/contacts.py](backend/app/api/routes/contacts.py#L114)
- [backend/app/api/routes/education.py](backend/app/api/routes/education.py#L114)
- [backend/app/api/routes/certificate.py](backend/app/api/routes/certificate.py#L114)

All of these routes currently depend on `run_extractor()` in
[backend/app/api/deps.py](backend/app/api/deps.py#L808).

### Lower-level extraction engines that should stay as-is

- [backend/app/extractor/extraction_runnable.py](backend/app/extractor/extraction_runnable.py#L131)
- [backend/app/extractor/extraction_runnable.py](backend/app/extractor/extraction_runnable.py#L163)
- [backend/app/extractor/retrieval.py](backend/app/extractor/retrieval.py#L30)
- [backend/app/extractor/parsing.py](backend/app/extractor/parsing.py)

### Retry helpers that should stay authoritative

- [backend/app/core/extractor_retry.py](backend/app/core/extractor_retry.py#L30)
- [backend/app/core/extractor_retry.py](backend/app/core/extractor_retry.py#L84)

---

## Target Architecture

### New service boundary

Create a new module:

- `backend/app/core/extractor/service.py`

This module becomes the authoritative owner of extractor execution.

### Final dependency flow

After the patch, the intended call path is:

1. route resolves extractor and request payload
2. route or compatibility wrapper calls the core extractor service
3. core service resolves source text, orchestration, and execution
4. lower-level extraction engines perform structured extraction
5. core service finalizes orchestration state and returns `ExtractorResponse`

### Compatibility strategy

Keep a wrapper function in [backend/app/api/deps.py](backend/app/api/deps.py#L808)
with the current signature so existing routes do not need to migrate in the
same patch.

That wrapper should delegate immediately to the new core service.

This preserves all existing imports while moving ownership of runtime behavior
to `backend/app/core/extractor/service.py`.

---

## Implementation Surface

### Existing files to modify

| File | Purpose |
| --- | --- |
| `backend/app/api/deps.py` | Replace embedded extractor workflow logic with a thin compatibility wrapper |
| `backend/app/api/routes/extractor.py` | Optional import cleanup only if needed; route behavior should remain unchanged |
| `backend/app/tests/test_extractor_runtime.py` | Extend or adapt tests to cover the new service boundary when useful |

### New files to add

| File | Purpose |
| --- | --- |
| `backend/app/core/extractor/service.py` | Core-owned extractor execution workflow |
| `backend/app/tests/test_extractor_service.py` | Focused unit tests for the new core service boundary |

### Files that should remain functionally unchanged

- `backend/app/extractor/extraction_runnable.py`
- `backend/app/extractor/retrieval.py`
- `backend/app/extractor/parsing.py`
- `backend/app/core/extractor_retry.py`
- `backend/app/schemas.py`
- extractor-related route contracts in `backend/app/api/routes/*`

---

## Exact Patch Shape

### Phase 1: Introduce the core service module

Create `backend/app/core/extractor/service.py`.

This module should contain:

- a small source-resolution helper for text, URL, and file inputs
- a small orchestration-pipeline resolution helper
- a main `run_extractor()` service function or `ExtractorWorkflowService.run()`
- optional private helpers for event creation and finalization

Recommended public surface:

```python
async def run_extractor(
    extractor: schemas.ExtractorRead,
    payload: schemas.ExtractorRun,
    user: schemas.UserRead,
    db: AsyncSession,
    retry_of_id: UUID4 | None = None,
) -> schemas.ExtractorResponse:
    ...
```

Keep this signature aligned with the current API-layer function so the wrapper
in `api/deps.py` can delegate without translation.

### Phase 2: Move source-text resolution into core

Move the following concerns out of `api/deps.py` and into the new service:

- direct text passthrough
- URL fetch via `extract_text_from_url()`
- file parsing via `parse_binary_input()`
- saved file snapshot creation via `build_extractor_run_source_path()` and
  `save_extractor_run_source_file()`

Rules:

- preserve existing source precedence behavior from `ExtractorRun`
- preserve existing 400 when no text/url/file is provided
- preserve existing 422 behavior for unsafe URL fetch failures
- preserve file snapshot behavior for replayable retry support

### Phase 3: Reuse shared orchestration helpers

Replace the extractor’s open-coded get-or-create pipeline logic with the shared
orchestration helper in [backend/app/core/orchestration.py](backend/app/core/orchestration.py).

Use:

- `get_or_create_orchestration_pipeline()`
- `create_orchestration_event()`
- `update_orchestration_event()`

Rules:

- pipeline name remains the extractor name
- pipeline description stays extractor-specific
- extractor definition can continue using `extractor.json_schema`
- do not adopt the compact RAG payload contract

### Phase 4: Preserve replayable event payload semantics

Continue using:

- `build_extractor_event_payload()`
- `build_extractor_source_uri()`

from [backend/app/core/extractor_retry.py](backend/app/core/extractor_retry.py#L30).

These helpers are the source of truth for retryable extractor payloads.

Do not change:

- `SOURCE_KIND_KEY`
- `FILE_SOURCE_PATH_KEY`
- persisted `text`, `url`, `file`, `llm`, and `mode` fields

### Phase 5: Keep extraction strategy dispatch unchanged

Inside the new core service, preserve the existing execution split:

- `entire_document` -> `extract_entire_document()`
- `retrieval` -> `extract_from_content()`

Do not redesign or rename these modes.

### Phase 6: Preserve version-hash and retry linkage behavior

Keep the existing traceability behavior:

- stamp `version_hash` onto the event after creation
- set `retry_of_id` on retried runs when provided

This behavior is covered today in
[backend/app/tests/test_extractor_runtime.py](backend/app/tests/test_extractor_runtime.py).

### Phase 7: Reduce `api/deps.py` to a wrapper

Update [backend/app/api/deps.py](backend/app/api/deps.py#L808) so the public
`run_extractor()` function becomes a thin compatibility wrapper that simply
delegates to the new core service.

Rules:

- keep the same function name
- keep the same function signature
- keep the same return type
- keep route call sites unchanged in this patch unless a tiny import cleanup is
  needed for clarity

This is what keeps the refactor narrow and low-risk.

---

## Suggested Service Internals

The implementing agent does not need to use these exact helper names, but the
module should roughly separate responsibilities this way.

### Source resolution helpers

Suggested private helpers in `backend/app/core/extractor/service.py`:

```python
async def _resolve_extractor_input_text(...):
    ...

async def _resolve_url_text(...):
    ...

async def _resolve_file_text_and_snapshot(...):
    ...
```

These helpers should return both the normalized text and any file snapshot path
needed for retryability.

### Orchestration helpers

Suggested private helpers:

```python
async def _get_or_create_extractor_pipeline(...):
    ...

async def _create_running_event(...):
    ...

async def _finalize_success_event(...):
    ...

async def _finalize_failure_event(...):
    ...
```

### Main workflow function

The main function should:

1. log intent
2. resolve pipeline
3. resolve input text and file snapshot metadata
4. create running orchestration event
5. stamp extractor version hash and retry linkage
6. dispatch extraction mode
7. update event to success, pending review, or failure
8. return `schemas.ExtractorResponse`

---

## Explicit Behavior To Preserve

The implementing agent should use the current runtime tests as the contract.

### Success behavior

Preserve:

- running orchestration event creation
- success event finalization
- extraction result passthrough into `ExtractorResponse`

Covered today in:

- [backend/app/tests/test_extractor_runtime.py](backend/app/tests/test_extractor_runtime.py)

### Failure behavior

Preserve:

- original failure detail propagated via 500 response
- failure event message includes extractor name and exception type
- unsafe URL redirect surfaces 422, not 500

Covered today in:

- [backend/app/tests/test_extractor_runtime.py](backend/app/tests/test_extractor_runtime.py)

### Replayability behavior

Preserve:

- persisted URL in event payload and source URI
- persisted file snapshot path and source URI
- rehydration of retries from event payload

Covered today in:

- [backend/app/tests/test_extractor_runtime.py](backend/app/tests/test_extractor_runtime.py)
- [backend/app/tests/test_extractor_retry.py](backend/app/tests/test_extractor_retry.py)
- [backend/app/tests/test_extractor_retry_unit.py](backend/app/tests/test_extractor_retry_unit.py)

### Approval behavior

Preserve:

- `requires_approval=True` causes `pending_review` terminal status instead of
  `success`

This behavior is part of the extractor model contract in
[backend/app/models.py](backend/app/models.py#L211).

---

## Recommended Edit Order

Implement in this order. Do not start by editing routes.

### Step 1

Create `backend/app/core/extractor/service.py` with source-resolution helpers
and the main runtime function.

### Step 2

Wire orchestration persistence through `app.core.orchestration` in the new
service.

### Step 3

Move the existing runtime logic from `api/deps.py` into the new service while
preserving behavior and messages.

### Step 4

Replace the body of `api/deps.run_extractor()` with a wrapper call.

### Step 5

Add focused tests for the new service boundary.

### Step 6

Run the targeted extractor runtime and retry tests.

---

## Recommended Test Shape

Change classification:

- changed backend surface: extractor orchestration runtime boundary
- dominant risk type: orchestration and retry flow regression

Recommended test shape:

- mixed strategy
- focused unit tests for the new core service boundary
- preserve existing route/runtime compatibility tests via the wrapper

Why this shape fits:

- this patch does not change extraction algorithms themselves
- the main risk is regression in orchestration lifecycle, retryability, and
  source handling
- pure unit tests alone would miss wrapper compatibility
- DB-backed integration tests are not the best primary signal here because the
  existing extractor runtime tests already isolate the branching behavior well

Target locations:

- extend [backend/app/tests/test_extractor_runtime.py](backend/app/tests/test_extractor_runtime.py) only when needed for wrapper compatibility
- add [backend/app/tests/test_extractor_service.py](backend/app/tests/test_extractor_service.py) for direct service tests
- keep [backend/app/tests/test_extractor_retry.py](backend/app/tests/test_extractor_retry.py) and [backend/app/tests/test_extractor_retry_unit.py](backend/app/tests/test_extractor_retry_unit.py) authoritative for retry behavior

---

## Minimum Test Cases Required

### New service tests

Add direct tests for `backend/app/core/extractor/service.py` that prove:

1. successful entire-document extraction creates a running event and finalizes success
2. retrieval-mode extraction dispatches to `extract_from_content()`
3. unsafe URL fetch errors surface 422 and do not degrade into 500
4. file input produces a saved snapshot path for retry support
5. `requires_approval=True` finalizes the event as `pending_review`
6. execution failure finalizes the event as `failed` and preserves the original error detail

### Existing tests that should still pass unchanged or with only import updates

1. [backend/app/tests/test_extractor_runtime.py](backend/app/tests/test_extractor_runtime.py)
2. [backend/app/tests/test_extractor_retry.py](backend/app/tests/test_extractor_retry.py)
3. [backend/app/tests/test_extractor_retry_unit.py](backend/app/tests/test_extractor_retry_unit.py)

---

## Validation Plan

Run the smallest relevant backend validation for this refactor.

Recommended command sequence:

```bash
cd backend
pipenv run pytest \
  app/tests/test_extractor_runtime.py \
  app/tests/test_extractor_retry.py \
  app/tests/test_extractor_retry_unit.py \
  app/tests/test_extractor_service.py -q
```

Local `test_db` required:

- no for the primary confidence signal, assuming the new service tests follow
  the existing mocked runtime style

Optional broader confidence pass if the environment is available:

```bash
pipenv run pytest app/tests/test_profile_extract.py app/tests/test_leads.py app/tests/test_companies.py -q
```

CI support:

- this supports the backend test gate in `.github/workflows/ci.yml`
- no schema freshness or frontend validation should be required because public
  contracts remain unchanged

---

## Acceptance Criteria

The implementing agent should not consider this patch complete unless all of
the following are true.

1. Extractor execution logic now lives primarily in `backend/app/core/extractor/service.py`.
2. `backend/app/api/deps.py::run_extractor()` remains available with the same
   signature and delegates to the core service.
3. Extractor routes and route callers do not require contract changes.
4. Replayable retry payload semantics remain unchanged.
5. File snapshot persistence and rehydration still work.
6. Unsafe URL redirect failures still surface 422.
7. `requires_approval=True` still yields `pending_review` instead of `success`.
8. Extractor version hash stamping and `retry_of_id` linkage still work.
9. No frontend files or generated contract artifacts change.
10. Targeted extractor runtime and retry tests are green.

---

## Risks And Tradeoffs

### Main risk

The highest risk is accidental behavior drift in orchestration messages,
failure timing, or persisted payload shape when moving logic into the new
service.

Mitigation:

- preserve existing helper usage from `app.core.extractor_retry`
- preserve existing test assertions before attempting cleanup
- keep the wrapper in `api/deps.py` during this patch

### Intentional tradeoff

This patch does not try to modernize extractor orchestration into LangGraph.
That is deliberate. The extractor is a reusable schema-driven extraction
platform with replayable source persistence, and this patch is only about
cleaning its runtime boundary.

---

## Stop Conditions

The implementing agent should stop and hand back instead of improvising if any
of the following happen:

- preserving current retry payload semantics requires a route or schema change
- `app.core.orchestration` cannot be reused without behavior regressions that
  exceed this patch scope
- existing extractor runtime tests reveal hidden coupling that would require a
  broader route migration
- the refactor starts pulling in frontend or schema-regeneration work

If blocked, the handback should include:

- blocker summary
- exact file and function involved
- what was attempted
- whether a broader extractor architecture decision is needed

---

## Suggested Handoff Summary

> Refactor the generic extractor execution runtime into
> `backend/app/core/extractor/service.py` while preserving current behavior.
> Keep `api/deps.run_extractor()` as a compatibility wrapper. Reuse the shared
> orchestration helpers where possible. Do not change route contracts, retry
> payload shape, approval semantics, or lower-level extraction engines. Validate
> with the targeted extractor runtime and retry tests before considering any
> cleanup beyond the boundary extraction.
