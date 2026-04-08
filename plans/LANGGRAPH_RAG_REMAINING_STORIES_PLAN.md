# LangGraph RAG Remaining Stories — Implementation Plan

Date: 2026-04-06
Branch: feat-sprint
Status: Complete — all stories delivered and validated
Primary owner: Baldin Backend Agent
Review owner: Baldin Lead Full-Stack Architect

---

## Goal

Migrate the two remaining RAG endpoints to LangGraph-backed workflows following
the patterns established by the first story (enrich-lead). The two stories are:

- **Story A**: `POST /documents/rag/rank-leads` → lead ranking graph
- **Story B**: `POST /documents/rag/summarize-company` → company summarization graph

Each story must add the same quality properties the first story added:

- durable orchestration persistence via `OrchestrationPipeline` / `OrchestrationEvent`
- async generation (no synchronous `.invoke()`)
- internal structured output validation
- one bounded repair retry
- compact versioned orchestration payload
- stable rendered output matching the existing response contract

This plan also introduces a shared infrastructure extraction (Story 0) to
factor common graph primitives out of the enrichment-specific code into
reusable RAG package utilities, so that story A and B do not duplicate the
first story's patterns.

---

## Fixed Decisions

These decisions are locked and should not be reopened by the implementing agent
unless a blocker is found.

### Scope

- Implement LangGraph for `rank-leads` and `summarize-company` only.
- Keep `/documents/search`, `/documents/{id}/embed`, and the already-migrated
  `/rag/enrich-lead` behavior unchanged.
- Keep all public request and response schemas unchanged.

### Persistence

- Reuse `OrchestrationPipeline` and `OrchestrationEvent` (same as first story).
- Do not add new run tables or checkpoint persistence.
- Use the request correlation ID as the LangGraph thread ID.

### Validation Model

- Use internal structured output for both generation paths.
- Do not fall back to free-form text if structured output fails.
- One bounded repair retry per generation, same as first story.

### UI / Contract Boundaries

- Do not touch frontend files.
- Do not regenerate `openapi.json` or `frontend/src/schema.d.ts`.
- Do not expose new backend API fields.

---

## Story 0: Extract Shared RAG Graph Primitives

Before implementing the two new graphs, extract reusable infrastructure from
the current enrichment-specific code into shared modules within the RAG package.

### Why

The first story embedded orchestration helpers (`_append_trace`, `_mark_failure`,
`_select_results`, `_classify_initial_results`, `build_context` node logic,
`initialize_run` / `finalize_success` / `finalize_failure` patterns) directly
in `backend/app/core/rag/nodes.py` and `state.py`. These are not
enrichment-specific — they are generic RAG graph primitives. Duplicating them
across three graph node files would be a maintenance burden.

### What to extract

Create `backend/app/core/rag/shared.py` containing:

From current `state.py` (keep originals as re-exports for backward compat):

- `RagTraceEntry` — renamed from `LeadEnrichmentTraceEntry` (generic trace entry)
- `utc_now`, `to_utc_iso`, `fingerprint_text`, `safe_preview` — already generic
- `MAX_RENDERED_CONTEXT_CHARS`, `MAX_PERSISTED_IDS` — shared constants
- `active_rag_event_id` — already generic

From current `nodes.py`:

- `append_trace()` — public version of `_append_trace`
- `mark_failure()` — public version of `_mark_failure`
- `select_results()` — public version of `_select_results`
- `classify_initial_results()` — public version of `_classify_initial_results`
- `sanitize_exception()` — public version of `_sanitize_exception`
- Score threshold constants: `INITIAL_SCORE_FLOOR`, `EXPANDED_SCORE_FLOOR`,
  `STRONG_MATCH_SCORE`, `EXPANDED_K_DELTA`
- `NO_CONTEXT_DETAIL` error message constant

### Rules

- The existing enrichment graph behavior must not change.
- `nodes.py` and `state.py` should import from `shared.py` instead of
  defining private copies.
- Existing test imports should continue to work. If the test imports a symbol
  from `nodes` or `state`, keep a re-export at the old location.
- Do not rename LeadEnrichmentDraft or LeadEnrichmentState — those are
  story-specific and stay where they are.

### Shared node factories

Create reusable async node factory functions in `shared.py` for patterns that
are identical across graphs:

```python
async def shared_initialize_run(state, *, workflow_name, description, entrypoint):
    """Generic graph initialization: create pipeline, event, seed state."""
    ...

async def shared_finalize_success(state, *, render_fn):
    """Generic success finalization: render output, persist payload, update event."""
    ...

async def shared_finalize_failure(state):
    """Generic failure finalization: persist failure payload, update event."""
    ...
```

The enrichment, ranking, and summarization graphs will each call these with
their specific parameters instead of duplicating the boilerplate.

### Shared payload builder

Create a generic `build_rag_orchestration_payload()` in `shared.py` that
accepts:

- the graph state (any TypedDict with the common fields)
- a `kind` string
- a `schema_version` int
- a `validator_name` string
- an `input_section` dict (story-specific input metadata)
- an optional `retrieval_section` dict (absent for summarize-company)

The enrichment-specific `build_orchestration_payload` in `state.py` should
delegate to this shared builder.

---

## Story A: Rank-Leads Graph

### System-level description

The rank-leads endpoint currently:
1. Combines all lead titles and descriptions into one query string
2. Searches the vector store with that combined text
3. Extracts raw `chunk_text` from results
4. Calls the synchronous `rank_leads()` chain with free-form string output
5. Returns the string as `LeadRankResponse(ranking=str)`

Problems:
- Synchronous LLM call blocks the event loop
- No retrieval quality assessment (uses all results regardless of score)
- No structured output validation — output shape varies run to run
- No orchestration persistence — no postmortem visibility
- No fallback or repair on LLM failure

### Target graph shape

```
START → initialize_run → retrieve_context
  ├── strong → build_context → generate_ranking → finalize_success
  ├── weak → expand_retrieval
  │            ├── strong → build_context → generate_ranking → finalize_success
  │            └── weak/empty → finalize_failure
  └── empty → finalize_failure

generate_ranking
  ├── valid → finalize_success
  └── invalid → repair_generation
                 ├── valid → finalize_success
                 └── invalid → finalize_failure
```

This matches the enrichment graph topology exactly. The differences are in:
- the query construction (combined leads text vs single lead description)
- the structured output model
- the generation prompt
- the renderer

### Internal structured output model

Create `LeadRankingDraft` in a new `backend/app/core/rag/rank_leads/state.py`:

```python
class RankedLeadEntry(BaseSchema):
    lead_index: int = Field(..., ge=1, description="1-based lead position from input")
    title: str = Field(..., min_length=1, max_length=200)
    relevance_score: int = Field(..., ge=1, le=10)
    explanation: str = Field(..., min_length=20, max_length=400)

class LeadRankingDraft(BaseSchema):
    ranked_leads: list[RankedLeadEntry] = Field(..., min_length=1, max_length=20)
```

Validation rules:
- `ranked_leads` must be sorted by `relevance_score` descending
- each `lead_index` must be unique and within the input leads range
- `explanation` must be trimmed, non-empty, 20–400 chars
- `title` must be trimmed, non-empty
- if deduplication or validation collapses the list to zero, validation fails

### Stable render contract

The route must still return `LeadRankResponse(ranking=str)`.

Render the validated draft into a stable string:

```text
Lead Rankings

1. Senior Backend Engineer (Score: 9/10)
   Your FastAPI and PostgreSQL experience directly matches this role's core requirements.

2. Platform Engineer (Score: 7/10)
   Partial match on infrastructure tooling, but the role emphasizes Kubernetes expertise you haven't demonstrated.
```

Format rules:
- number each entry by rank position (1-based)
- show title, score, then explanation as indented paragraph
- always sort by relevance_score descending in render

### Payload contract

Same top-level structure as enrichment, with these differences:

```json
{
  "kind": "rag.lead_ranking.run",
  "schema_version": 1,
  "input": {
    "requested_k": 5,
    "model_name": "gpt-5.4-nano-2026-03-17",
    "lead_count": 3,
    "combined_query_chars": 1245,
    "combined_query_preview": "Senior backend role focused on..."
  }
}
```

The `input` section uses `lead_count` and `combined_query_chars` instead of
`lead_description_chars`. Same exclusion rules: no raw lead descriptions, no
raw chunks, no full ranking output in the payload.

### New files

| File | Purpose |
| --- | --- |
| `backend/app/core/rag/rank_leads/__init__.py` | Package marker and exports |
| `backend/app/core/rag/rank_leads/state.py` | `LeadRankingDraft`, `LeadRankingState`, payload builder, renderer |
| `backend/app/core/rag/rank_leads/nodes.py` | Ranking-specific nodes and prompt construction |
| `backend/app/core/rag/rank_leads/graphs.py` | Compiled `lead_ranking_graph` |
| `backend/app/tests/test_rag_rank_leads.py` | Unit tests for graph routing and rendering |

### Files to modify

| File | Purpose |
| --- | --- |
| `backend/app/core/rag/service.py` | Add `rank_leads()` method to `RagWorkflowService` |
| `backend/app/api/routes/documents.py` | Wire `rank_leads_endpoint` to `RagWorkflowService.rank_leads()` |
| `backend/app/core/rag/__init__.py` | Export new graph and draft model |

### Route semantics to preserve

- If no usable embedded context exists, still surface 400 with the current
  error detail.
- `LeadRankRequest` and `LeadRankResponse` schemas remain unchanged.

---

## Story B: Summarize-Company Graph

### System-level description

The summarize-company endpoint currently:
1. Fetches a URL using `extract_text_from_url()` (Playwright + httpx fallback)
2. Validates page text is non-empty
3. Calls the synchronous `summarize_company_website()` chain
4. Returns `CompanySummarizeResponse(url=str, summary=str)`

Key difference from Stories A and enrichment: **this graph has no vector
retrieval step**. It fetches external content, not user-embedded documents.

Problems:
- Synchronous LLM call blocks the event loop
- No structured output validation
- No orchestration persistence
- No fallback or repair on LLM failure
- URL fetch failures are not durably recorded

### Target graph shape

```
START → initialize_run → fetch_content
  ├── has text → generate_summary → finalize_success
  └── empty text → finalize_failure

generate_summary
  ├── valid → finalize_success
  └── invalid → repair_generation
                 ├── valid → finalize_success
                 └── invalid → finalize_failure
```

Simpler than the retrieval-based graphs: no retrieve_context, no
expand_retrieval, no build_context. The `fetch_content` node replaces the
retrieval pipeline.

### Internal structured output model

Create `CompanySummaryDraft` in `backend/app/core/rag/summarize_company/state.py`:

```python
class CompanySummaryDraft(BaseSchema):
    company_name: str = Field(..., min_length=1, max_length=200)
    mission: str = Field(..., min_length=20, max_length=600)
    products_and_services: str = Field(..., min_length=20, max_length=600)
    culture: str = Field(default="", max_length=400)
    recent_news: str = Field(default="", max_length=400)
    job_opportunities: str = Field(default="", max_length=400)
```

Validation rules:
- `company_name`, `mission`, `products_and_services` are required
- `culture`, `recent_news`, `job_opportunities` are optional (may be empty)
- all strings trimmed and bounded
- if `company_name` or `mission` are empty after trimming, validation fails

### Stable render contract

Return `CompanySummarizeResponse(url=str, summary=str)`.

Render the validated draft:

```text
Company: Acme Corp

Mission
Acme Corp is focused on building developer tools for modern infrastructure teams.

Products & Services
The company offers a suite of observability and deployment automation tools.

Culture
Remote-first with quarterly team gatherings and a strong open-source contribution culture.

Job Opportunities
Currently hiring for backend and platform engineering roles across US and EU timezones.
```

Format rules:
- always render `Company:`, `Mission`, `Products & Services` sections
- omit `Culture`, `Recent News`, `Job Opportunities` sections if empty string
- section names are stable across runs

### Payload contract

```json
{
  "kind": "rag.company_summarization.run",
  "schema_version": 1,
  "input": {
    "url": "https://example.com",
    "model_name": "gpt-5.4-nano-2026-03-17",
    "page_text_chars": 15432,
    "page_text_preview": "Acme Corp builds developer tools for modern..."
  },
  "fetch": {
    "status": "success",
    "fetched_chars": 15432,
    "fetch_method": "playwright",
    "content_fingerprint": "sha256:..."
  },
  "generation": {
    "attempts": 1,
    "validator_name": "CompanySummaryDraft",
    "repair_used": false,
    "rendered_chars": 645,
    "output_fingerprint": "sha256:..."
  }
}
```

Note: `retrieval` section is replaced by `fetch` section. Same exclusion
rules apply — no raw page text, no full summary in the payload.

### New files

| File | Purpose |
| --- | --- |
| `backend/app/core/rag/summarize_company/__init__.py` | Package marker and exports |
| `backend/app/core/rag/summarize_company/state.py` | `CompanySummaryDraft`, `CompanySummaryState`, payload builder, renderer |
| `backend/app/core/rag/summarize_company/nodes.py` | Summarization-specific nodes including `fetch_content` |
| `backend/app/core/rag/summarize_company/graphs.py` | Compiled `company_summarization_graph` |
| `backend/app/tests/test_rag_summarize_company.py` | Unit tests |

### Files to modify

| File | Purpose |
| --- | --- |
| `backend/app/core/rag/service.py` | Add `summarize_company()` method to `RagWorkflowService` |
| `backend/app/api/routes/documents.py` | Wire `summarize_company_endpoint` to `RagWorkflowService.summarize_company()` |
| `backend/app/core/rag/__init__.py` | Export new graph and draft model |

### fetch_content node responsibility

- Call `extract_text_from_url(url)` (keep as plain service code, do not absorb
  into graph internals)
- Validate extracted text is non-empty
- Truncate page text to a reasonable context budget (e.g. 8000 chars) to avoid
  excessive prompt length
- Record fetch method (playwright vs httpx fallback) if distinguishable
- Compute `content_fingerprint`
- On fetch failure or empty text, route to `finalize_failure` with 400 status

### Route semantics to preserve

- If URL extraction returns empty text, still surface 400 with the current
  error detail: "Could not extract text from the URL"
- `CompanySummarizeRequest` and `CompanySummarizeResponse` schemas unchanged.

---

## Execution Order

Implement in this order. Each story is independently shippable after Story 0.

### Story 0: Extract shared primitives

1. Create `backend/app/core/rag/shared.py` with generic helpers
2. Refactor `state.py` and `nodes.py` to import from `shared.py`
3. Confirm all existing enrichment tests still pass
4. Confirm `__init__.py` exports remain stable

### Story A: Rank-leads graph

1. Create `backend/app/core/rag/rank_leads/` package with state, nodes, graphs
2. Add `rank_leads()` to `RagWorkflowService`
3. Wire `rank_leads_endpoint` to service
4. Add unit tests in `test_rag_rank_leads.py`
5. Confirm all enrichment and ranking tests pass

### Story B: Summarize-company graph

1. Create `backend/app/core/rag/summarize_company/` package
2. Add `summarize_company()` to `RagWorkflowService`
3. Wire `summarize_company_endpoint` to service
4. Add unit tests in `test_rag_summarize_company.py`
5. Confirm all tests pass

---

## Test Plan

### Story 0 tests

- All existing `test_rag_graph.py` tests pass after extraction
- All existing `test_documents_rag.py` tests pass after extraction

### Story A test cases (unit)

- strong retrieval, direct success, correct render format
- weak retrieval, expanded retrieval, success
- empty retrieval, terminal client failure (400)
- structured validation failure then successful repair
- structured validation failure then terminal failure (500)
- payload compaction and exclusion assertions
- stable renderer assertions (sorted by score, correct format)
- lead_index validation (out-of-range indices rejected)

### Story B test cases (unit)

- successful fetch and summarization
- empty page text, terminal client failure (400)
- fetch exception handling
- structured validation failure then successful repair
- structured validation failure then terminal failure (500)
- payload compaction — no raw page text in payload
- stable renderer assertions (optional sections omitted when empty)

### Commands

```bash
cd backend
pipenv run pytest app/tests/test_rag_graph.py app/tests/test_rag_rank_leads.py app/tests/test_rag_summarize_company.py -v
```

Full backend validation:

```bash
pipenv run pytest --cov=app --cov=etl --cov-report=term-missing
```

---

## Acceptance Criteria

### Story 0

1. All existing enrichment graph tests pass without modification
2. Shared helpers are importable from `app.core.rag.shared`
3. No duplicated utility code across graph node modules
4. `backend/app/core/rag/nodes.py` imports from `shared.py` for common utilities

### Story A

1. `POST /documents/rag/rank-leads` is orchestrated by a compiled LangGraph graph
2. `LeadRankRequest` and `LeadRankResponse` remain unchanged
3. The async request path uses async LLM generation, not synchronous `.invoke()`
4. Each run persists through `OrchestrationPipeline` and `OrchestrationEvent`
5. Persisted payload matches the compact versioned contract
6. Payload excludes raw lead descriptions, chunk text, full ranking output
7. Retrieval uses one bounded fallback pass when context is weak
8. Structured output validation is enforced with one bounded repair retry
9. No free-form fallback generation path
10. Renderer output is stable and test-covered

### Story B

1. `POST /documents/rag/summarize-company` is orchestrated by a compiled LangGraph graph
2. `CompanySummarizeRequest` and `CompanySummarizeResponse` remain unchanged
3. The async request path uses async LLM generation, not synchronous `.invoke()`
4. Each run persists through `OrchestrationPipeline` and `OrchestrationEvent`
5. Persisted payload matches the compact versioned contract
6. Payload excludes raw page text and full summary output
7. `extract_text_from_url()` remains as plain service code (not absorbed into graph)
8. Structured output validation is enforced with one bounded repair retry
9. No free-form fallback generation path
10. Renderer output is stable and test-covered

### Cross-cutting

11. No frontend, OpenAPI, or generated TypeScript contract changes
12. Existing enrich-lead graph behavior is unchanged
13. All three RAG graphs share common infrastructure from `shared.py`

---

## Stop Conditions

The implementing agent should stop and hand back if:

- shared extraction would break existing enrichment tests and cannot be resolved
  without enrichment graph changes
- structured output is too unstable for ranking or summarization after prompt
  or schema tightening
- the story would require frontend or schema-contract changes
- URL fetch patterns need architectural changes beyond the current
  `extract_text_from_url()` interface

---

## Suggested Handoff Summary

> Implement LangGraph RAG stories A and B in backend only, starting with shared
> infrastructure extraction (Story 0). Migrate `POST /documents/rag/rank-leads`
> and `POST /documents/rag/summarize-company` to LangGraph workflows. Follow
> the patterns from the first story. Reuse existing orchestration persistence.
> Use the compact payload contracts and internal structured-output contracts
> from this plan. Do not widen scope into frontend changes, checkpoint
> persistence, or new API fields.
