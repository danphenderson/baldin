---
sidebar_position: 4
slug: /features/extraction-and-automation
title: Extraction & Automation
description: LLM-backed extraction, orchestration pipelines, and superuser crawler management.
---

<!-- last-verified: 2026-04-09 -->

# Extraction & Automation

Baldin provides three automation layers: user-defined extractors, orchestration pipelines, and superuser-managed crawlers. Each operates at a different level of the data lifecycle.

## Extractors

Extractors are user-defined LLM-backed definitions that transform unstructured input into structured output. Each extractor carries:

- Instructions and a JSON schema defining the expected output shape
- Optional training examples (`ExtractorExample`) for few-shot guidance
- Immutable versioned snapshots (`ExtractorVersion`) that freeze the instructions and schema at a point in time

The extraction flow:

1. The user triggers an extraction via `POST /extractor/{id}/run` for a saved extractor definition
2. The backend calls `run_extractor`, which fetches content from a URL (`extract_text_from_url`) and passes it through `extraction_runnable`
3. The LLM produces structured output matching the extractor's schema
4. Results are returned to the caller

A suggestion endpoint at `POST /extractor/suggest` helps users bootstrap new extractor definitions from sample content.

**Frontend:** `/workflows/extractors` — Extractor management UI (`frontend/src/page/extractor.tsx`)

**API:** `/extractor` — CRUD, versioning, extraction execution, and suggestion endpoints

## Orchestration Pipelines

Orchestration pipelines chain multiple steps into automated workflows. Each pipeline records:

- A name and configuration
- Execution history through `OrchestrationEvent` records

Pipelines provide a way to compose extraction, enrichment, and data-transformation steps into repeatable sequences.

**Frontend:** `/workflows` — Pipeline management (`frontend/src/page/pipelines.tsx`)

**API:** `/data_orchestration` — Pipeline CRUD and event history

## Crawlers (Superuser)

Crawlers are superuser-managed ETL pipelines that ingest job data from external sources. The crawler subsystem includes:

- **CrawlerPipeline** — Defines what to crawl and how
- **CrawlerRun** — Tracks individual execution results

The crawler scheduler runs as an in-process asyncio background task that polls for due pipelines at a configurable interval (default 60 seconds). It uses a Postgres advisory lock to prevent duplicate scheduling when multiple app instances are running. Scheduled runs are dispatched through the same execution path used by manual triggers.

ETL source modules live under `backend/etl/` and include base, LinkedIn, and Glassdoor crawlers.

**Frontend:** `/workflows/crawlers` — Superuser crawler admin (`frontend/src/page/crawlers.tsx`)

**API:** `/crawlers` — Superuser-only CRUD and execution endpoints

## Review Queue (Superuser)

The review queue at `/workflows/review` surfaces crawled leads and other items that need manual superuser review before they enter the main lead pipeline.

**Frontend:** `/workflows/review` — Review queue (`frontend/src/page/review-queue.tsx`)

**API:** `/review` — Superuser review endpoints

## User Story Book

### Current UI State

- The user-facing workflow surface lives under `/workflows` and `/workflows/extractors`, while `/workflows/review` and `/workflows/crawlers` remain superuser-only routes.
- The pipelines page is still JSON-first: users create workflow definitions and trigger payloads by editing raw JSON, then inspect definitions and run payloads through JSON views.
- Extractors, crawlers, and review queues already have dedicated management screens rather than being described only at the API level.

### Coverage Note

No canonical checked-in backlog file currently maps to this feature page. The active story context here comes from draft UX planning rather than a feature-specific committed backlog.

### Story Threads

**Draft UX context — pipelines usability**
Status: Open
The workflows page still requires JSON definitions and JSON payload editing, so the draft critique about a technical, non-guided pipelines UX remains accurate.

**Draft UX context — admin tool exposure**
Status: Implemented
The current navigation already hides Review Queue and Crawlers from non-superusers, and the routes themselves are guarded. That draft concern is still useful historical context, but it no longer describes the live UI.

## Related Docs

- [Extraction Pipeline Architecture](../architecture/extraction-pipeline.md) — Extraction flow, retry mechanics, and ETL separation
- [Browse API Routes](../architecture/api-surface.md) — Automation route groups
- [Look Up Settings](../reference/environment-variables.md) — AI/extraction and crawler configuration
