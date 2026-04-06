---
sidebar_position: 4
slug: /features/extraction-and-automation
title: Extraction & Automation
description: LLM-backed extraction, orchestration pipelines, and superuser crawler management.
---

<!-- last-verified: 2026-04-06 -->

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
- **Execution modes** — Inline (direct) or worker (Redis-backed queue)

The crawler scheduler polls for due pipelines at a configurable interval (default 60 seconds). In worker mode, jobs are pushed to a Redis queue and processed by a separate crawler worker process.

ETL source modules live under `backend/etl/` and include base, LinkedIn, and Glassdoor crawlers.

**Frontend:** `/workflows/crawlers` — Superuser crawler admin (`frontend/src/page/crawlers.tsx`)

**API:** `/crawlers` — Superuser-only CRUD and execution endpoints

## Review Queue (Superuser)

The review queue at `/workflows/review` surfaces crawled leads and other items that need manual superuser review before they enter the main lead pipeline.

**Frontend:** `/workflows/review` — Review queue (`frontend/src/page/review-queue.tsx`)

**API:** `/review` — Superuser review endpoints

## Related Docs

- [Extraction Pipeline Architecture](../architecture/extraction-pipeline.md) — Extraction flow, retry mechanics, and ETL separation
- [Browse API Routes](../architecture/api-surface.md) — Automation route groups
- [Look Up Settings](../reference/environment-variables.md) — AI/extraction and crawler configuration
