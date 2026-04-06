# LangGraph RAG First Story — Implementation Plan

Date: 2026-04-06
Branch: feat-sprint
Status: Draft — implementation-ready for backend handoff
Primary owner: Baldin Backend Agent
Review owner: Baldin Lead Full-Stack Architect

---

## Goal

Implement the smallest LangGraph integration that materially improves Baldin's
backend RAG orchestration without rewriting the current RAG stack.

This first story migrates only the lead-enrichment path behind
`POST /documents/rag/enrich-lead` to a LangGraph-backed workflow while keeping:

- the current FastAPI request and response contract unchanged
- the pgvector retrieval layer unchanged
- URL fetch and chunking logic as plain service code
- `rank-leads` and `summarize-company` unchanged for now

The first story must add:

- durable run persistence using existing orchestration models
- bounded retrieval fallback behavior
- internal structured output validation
- one bounded repair retry
- route-compatible rendering back to the existing enrichment string

---

## Fixed Decisions

These decisions are locked for the first story and should not be reopened by
the implementing agent unless a blocker is found.

### Scope

- Implement LangGraph only for `POST /documents/rag/enrich-lead`.
- Keep `/documents/search`, `/documents/{id}/embed`, `/rag/rank-leads`, and
  `/rag/summarize-company` behavior unchanged.
- Keep the public `LeadEnrichRequest` and `LeadEnrichResponse` schemas
  unchanged.

### Persistence

- Reuse `OrchestrationPipeline` and `OrchestrationEvent`.
- Do not add a new RAG run table.
- Do not add full LangGraph checkpoint persistence in the first story.
- Use the existing request correlation ID as the LangGraph thread ID for the
  synchronous request path.

### Validation Model

- Use internal structured output for enrichment generation.
- Do not use free-form text generation plus ad hoc string parsing.
- Do not add a silent free-form fallback if structured output fails.
- If structured output is unstable, tighten the prompt or schema before merge,
  or explicitly re-scope the story.

### UI / Contract Boundaries

- Do not touch frontend files.
- Do not regenerate `openapi.json` or `frontend/src/schema.d.ts`.
- Do not expose new backend API fields in this story.

---

## Why This Shape

The existing RAG backend already has clean service seams:

- route orchestration in `backend/app/api/routes/documents.py`
- prompt and LLM helpers in `backend/app/core/langchain.py`
- vector retrieval in `backend/app/core/vector_store.py`

The missing piece is not retrieval itself. It is orchestration: state handoff,
debuggability, explicit fallback paths, structured validation, and durable
failure records.

This repo already has a persistent orchestration pattern through the extractor
runtime and `OrchestrationEvent` model. Reusing that pattern is the smallest
credible way to add postmortem visibility without introducing a parallel run
tracking system.

---

## Non-Goals

The implementing agent should explicitly avoid these in the first story:

- migrating `rank-leads`
- migrating `summarize-company`
- graphing embedding ingestion
- graphing raw document search
- introducing human-in-the-loop LangGraph checkpoints
- changing frontend workflows or orchestration UI
- storing raw prompt text, full lead descriptions, raw chunk text, or final
  enrichment bodies in `OrchestrationEvent.payload`

---

## Implementation Surface

### Existing files to modify

| File | Purpose |
| --- | --- |
| `backend/app/api/routes/documents.py` | Replace route-local enrichment orchestration with a LangGraph-backed service call |
| `backend/app/core/langchain.py` | Add async-friendly enrichment generation helpers and keep low-level prompt code plain |
| `backend/app/api/deps.py` | Remove direct dependence on API-layer orchestration helpers where needed |
| `backend/Pipfile` | Make LangGraph an explicit dependency |
| `backend/Pipfile.lock` | Refresh lock state after dependency declaration |

### New files to add

| File | Purpose |
| --- | --- |
| `backend/app/core/orchestration.py` | Shared pipeline and event persistence helpers extracted from API deps |
| `backend/app/core/rag/__init__.py` | Package marker |
| `backend/app/core/rag/state.py` | Typed graph state and node-trace contracts |
| `backend/app/core/rag/graphs.py` | Compiled `lead_enrichment_graph` |
| `backend/app/core/rag/nodes.py` | Node implementations and branch decisions |
| `backend/app/core/rag/service.py` | Route-facing `RagWorkflowService` |
| `backend/app/tests/test_rag_graph.py` | Unit tests for graph routing and failure handling |
| `backend/app/tests/test_documents_rag.py` | DB-backed route integration coverage |

### Files that should remain unchanged in this story

- `backend/app/core/vector_store.py`
- `backend/app/models.py`
- `backend/app/schemas.py`
- frontend code and generated schema artifacts

---

## Execution Order

Implement in this order. Do not start by wiring the route first.

### Phase 1: Extract shared orchestration persistence

Create `backend/app/core/orchestration.py` and move reusable orchestration
helpers out of `backend/app/api/deps.py`.

Minimum required helpers:

- get or create pipeline by name and user
- create orchestration event
- update orchestration event
- optional small helper to build short status messages

Rules:

- The new module must be backend-core, not API-route specific.
- Existing extractor behavior must remain compatible.
- If helper extraction would cause churn across many files, keep the public API
  of the extracted functions as close as possible to the existing usage.

### Phase 2: Add explicit LangGraph dependency

Declare `langgraph` explicitly in `backend/Pipfile` and refresh
`backend/Pipfile.lock`.

Rules:

- Treat the existing presence in `Pipfile.lock` as accidental unless declared.
- Keep dependency additions minimal. No unrelated package cleanup.

### Phase 3: Create the RAG orchestration package

Add `backend/app/core/rag/` with:

- `state.py`
- `nodes.py`
- `graphs.py`
- `service.py`

This package owns orchestration only. It must not absorb vector storage or URL
fetch implementation details.

### Phase 4: Add async enrichment generation with structured output

Refactor `backend/app/core/langchain.py` to provide an async enrichment helper
that returns a validated internal draft model, not a public response schema.

Rules:

- Follow the extractor pattern in `backend/app/extractor/extraction_runnable.py`:
  use `model.with_structured_output(..., method="function_calling")`.
- Keep prompt construction in plain service code.
- Keep public rendering separate from generation.

### Phase 5: Implement the graph

Build `lead_enrichment_graph` with the node order below:

1. `initialize_run`
2. `retrieve_context`
3. `expand_retrieval`
4. `build_context`
5. `generate_enrichment`
6. `repair_generation`
7. `finalize_success`
8. `finalize_failure`

Branch rules:

- if retrieval is strong, continue
- if retrieval is weak on first pass, expand retrieval once
- if retrieval remains insufficient, fail with current 400 semantics
- if structured output validates, render and return
- if structured output fails once, run one repair attempt
- if repair fails, persist terminal failure and surface 5xx behavior

### Phase 6: Integrate only the enrich-lead route

Update `backend/app/api/routes/documents.py` so only
`enrich_lead_endpoint()` delegates to `RagWorkflowService`.

Rules:

- Keep the request and response models unchanged.
- Keep `rank_leads_endpoint()` and `summarize_company_endpoint()` untouched.
- Preserve the current client-visible 400 behavior when no useful embedded
  document context exists.

### Phase 7: Add tests

Add both unit and DB-backed coverage.

Unit coverage must prove:

- strong retrieval path
- weak retrieval path with one expansion
- empty retrieval failure
- generation validation failure followed by successful repair
- generation validation failure followed by terminal failure
- payload compaction rules

DB-backed coverage must prove:

- the route still returns the same response shape
- orchestration events are created and updated
- persisted payload shape matches the contract below

---

## Concrete Persistence Contract

The first story must use a compact, versioned payload shape because
`OrchestrationEvent.payload` is already exposed to review and workflow tooling.

### Top-level payload keys

Only these top-level keys are allowed:

- `kind`
- `schema_version`
- `request`
- `input`
- `retrieval`
- `generation`
- `trace`
- `outcome`

### Required payload example

```json
{
  "kind": "rag.lead_enrichment.run",
  "schema_version": 1,
  "request": {
    "thread_id": "8e1b7b5b1b604de08f9f4dbe0b6e5d70",
    "workflow_name": "rag.enrich_lead",
    "started_at": "2026-04-06T18:22:15.123456Z",
    "finished_at": "2026-04-06T18:22:16.432100Z",
    "duration_ms": 1309
  },
  "input": {
    "requested_k": 5,
    "model_name": "gpt-5.4-nano-2026-03-17",
    "lead_description_chars": 812,
    "lead_description_preview": "Senior backend role focused on FastAPI, PostgreSQL, and AI-assisted workflow tooling..."
  },
  "retrieval": {
    "attempts": 2,
    "effective_k": 8,
    "score_floor": 0.62,
    "total_results": 8,
    "selected_results": 4,
    "source_document_count": 2,
    "source_document_ids": ["...", "..."],
    "embedding_ids": ["...", "...", "...", "..."],
    "min_score": 0.67,
    "max_score": 0.89,
    "avg_score": 0.75,
    "context_chars": 2450,
    "context_truncated": true,
    "context_fingerprint": "sha256:..."
  },
  "generation": {
    "attempts": 2,
    "validator_name": "LeadEnrichmentDraft",
    "repair_used": true,
    "rendered_chars": 922,
    "output_fingerprint": "sha256:..."
  },
  "trace": [
    {"node": "initialize_run", "status": "success", "attempt": 1, "duration_ms": 6},
    {"node": "retrieve_context", "status": "warning", "attempt": 1, "duration_ms": 24, "warning_codes": ["weak_context"]},
    {"node": "expand_retrieval", "status": "success", "attempt": 1, "duration_ms": 19},
    {"node": "generate_enrichment", "status": "warning", "attempt": 1, "duration_ms": 701, "warning_codes": ["validation_failed"]},
    {"node": "repair_generation", "status": "success", "attempt": 1, "duration_ms": 489}
  ],
  "outcome": {
    "result": "success",
    "http_status": 200,
    "warning_count": 2,
    "error_code": null,
    "error_summary": null
  }
}
```

### Payload rules

- `lead_description_preview` must be truncated to a safe preview length.
- `source_document_ids` and `embedding_ids` must be capped.
- scores should be rounded to stable precision before persistence.
- `trace` entries must be compact summaries, not raw state snapshots.
- target serialized payload size should stay under roughly 4 KB.

### Explicit exclusions

Do not persist any of the following in the payload:

- full lead description
- raw prompt text
- raw chunk text
- fully assembled context
- raw structured draft body
- final rendered enrichment body
- embeddings or vectors

Use `OrchestrationEvent.message` for short operator-facing status text instead.

---

## Concrete Structured Output Contract

The internal generation model should be small enough to validate reliably and
specific enough to produce useful enrichment.

### Internal draft model

Use a dedicated internal model under `backend/app/core/rag/state.py` or a small
adjacent module in the RAG package.

Illustrative shape:

```python
class LeadEnrichmentDraft(BaseModel):
    overview: str
    matching_qualifications: list[str]
    gaps_to_address: list[str]
    next_steps: list[str]
```

### Validation rules

- `overview`: trimmed string, approximately 40 to 600 chars
- `matching_qualifications`: 1 to 5 non-empty bullets
- `gaps_to_address`: 0 to 4 non-empty bullets
- `next_steps`: 1 to 5 non-empty actionable bullets
- every bullet should be trimmed and bounded in length
- duplicate bullets should be removed before rendering
- if deduplication collapses a required list to zero items, validation fails

### Generation rules

- call the model asynchronously
- use `with_structured_output(..., method="function_calling")`
- treat transport or structured-output failures as real validation failures
- allow exactly one repair retry
- do not fall back to free-form text in this story

---

## Stable Render Contract

The route must still return `LeadEnrichResponse(enrichment=str)`.

Render the validated draft into a stable string with this section order:

1. Overview
2. Matching Qualifications
3. Gaps To Address
4. Next Steps

Formatting guidance:

- always render headings in the same order
- render list sections as bullets
- omit the `Gaps To Address` section entirely if the validated list is empty
- do not vary heading names run to run

Example renderer output:

```text
Overview
You are a strong match for the backend and API-heavy parts of this role, with a few gaps around the team's specific domain tooling.

Matching Qualifications
- You already have direct FastAPI and PostgreSQL experience.
- Your background shows experience with document and workflow systems.

Gaps To Address
- The role asks for deeper production AI evaluation patterns than your documents clearly show.

Next Steps
- Tailor your resume to emphasize API design and data-model ownership.
- Prepare concrete examples of retrieval or orchestration debugging work.
```

This render format should be stable enough for snapshot-style backend tests.

---

## Node Responsibilities

### initialize_run

- derive `thread_id` from correlation ID
- resolve or create pipeline named `rag.enrich_lead`
- create initial event with `status=running`
- seed state and first trace record

### retrieve_context

- call retrieval service around `PGVectorStore.similarity_search()`
- compute score stats
- collect candidate source document IDs
- classify result as strong, weak, or empty

### expand_retrieval

- run one bounded second retrieval pass
- raise `effective_k`
- optionally relax score floor slightly
- do not loop beyond one retry

### build_context

- dedupe retrieved chunks
- preserve rank order
- enforce a context budget
- compute `context_fingerprint`

### generate_enrichment

- call async structured-output generation helper
- validate `LeadEnrichmentDraft`
- write compact generation metadata into state

### repair_generation

- re-call generation once with validation failure guidance
- do not mutate retrieval evidence

### finalize_success

- render final enrichment string
- write compact terminal payload
- update event to `success`

### finalize_failure

- normalize business vs system failure
- persist `outcome.error_code` and `outcome.error_summary`
- update event to `failure`
- surface matching HTTP behavior

---

## Exact Route Semantics To Preserve

For the first story, preserve current client-visible behavior for the main
failure class:

- if there is no usable embedded context, the route should still surface a 400
  with the current meaning rather than returning a hallucinated answer

It is acceptable for internal failure handling to improve around:

- LLM transport failures
- invalid structured model output
- weak retrieval with one bounded retry

---

## Validation Plan

Run the smallest relevant backend validation that proves the story.

### Tests to add

- `backend/app/tests/test_rag_graph.py`
- `backend/app/tests/test_documents_rag.py`

### Test cases required

#### Unit / graph cases

- strong retrieval, direct success
- weak retrieval, expanded retrieval, success
- empty retrieval, terminal client failure
- structured validation failure then successful repair
- structured validation failure then terminal failure
- payload compaction and exclusion assertions
- stable renderer assertions

#### DB-backed route cases

- successful enrich-lead response shape unchanged
- orchestration event created with `running`, then updated to `success`
- orchestration event created with terminal `failure` on invalid generation path
- payload follows the locked contract and omits banned fields

### Commands

Use backend validation commands consistent with the repo:

```bash
cd backend
pipenv run pytest --cov=app --cov=etl --cov-report=term-missing
```

Note:

- CI currently enforces `--cov-fail-under=60` in `.github/workflows/ci.yml`
- docs still mention 40; treat the workflow file as source of truth

---

## Acceptance Criteria

The implementing agent should not consider the story complete unless all of the
following are true.

1. `POST /documents/rag/enrich-lead` is orchestrated by a compiled LangGraph
   graph through a backend service layer.
2. `LeadEnrichRequest` and `LeadEnrichResponse` remain unchanged.
3. The async request path no longer uses synchronous LangChain `.invoke()` for
   enrichment generation.
4. Each run persists through `OrchestrationPipeline` and `OrchestrationEvent`.
5. The persisted payload matches the compact versioned contract in this plan.
6. The payload excludes raw prompt text, full lead descriptions, chunk text,
   assembled context, and full generated output.
7. Retrieval uses one bounded fallback pass when context is weak.
8. Structured output validation is enforced with one bounded repair retry.
9. There is no free-form fallback generation path in this story.
10. Renderer output is stable and test-covered.
11. Extractor orchestration behavior remains intact after helper extraction.
12. No frontend, OpenAPI, or generated TypeScript contract changes are needed.

---

## Stop Conditions

The implementing agent should stop and hand back instead of improvising if any
of the following happen:

- the event payload cannot be kept compact without changing existing workflow or
  review surfaces
- structured output is too unstable to satisfy the draft contract after prompt
  or schema tightening
- helper extraction from `api/deps.py` causes broad unrelated churn
- implementing the story would require frontend or schema-contract changes

If blocked, the handback should include:

- blocker summary
- exact file and function involved
- what was attempted
- whether re-scope or architectural approval is needed

---

## Suggested Handoff Summary

When another agent picks this up, the working summary should be:

> Implement the first LangGraph RAG slice in backend only. Migrate only
> `POST /documents/rag/enrich-lead` to a LangGraph workflow. Reuse existing
> orchestration persistence. Use the compact payload contract and the internal
> `LeadEnrichmentDraft` structured-output contract from this plan. Do not widen
> scope into other RAG routes, frontend changes, or checkpoint persistence.
