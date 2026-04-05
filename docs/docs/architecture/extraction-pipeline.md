---
sidebar_position: 4
slug: /architecture/extraction-pipeline
title: Extraction Pipeline
---

# Extraction Pipeline

Baldin has two distinct code paths for getting data into the system: the **user-triggered extraction runtime** and the **ETL crawlers**. These are architecturally separate.

## User-Triggered Extraction

This is the runtime path exercised when a user triggers extraction through the API (e.g., extracting structured data from a URL or document).

```mermaid
flowchart LR
    A["API Request"] --> B["deps.run_extractor"]
    B --> C["langchain.extract_text_from_url"]
    C --> D{"Extraction mode"}
    D -->|"Full document"| E["extraction_runnable.extract_entire_document"]
    D -->|"From content"| F["retrieval.extract_from_content"]
```

The key modules in this path:

| Module | Location | Purpose |
|--------|----------|---------|
| `run_extractor` | `app/api/deps.py` | Entry point — loads URL text and dispatches to the appropriate extractor |
| `extract_text_from_url` | `app/core/langchain.py` | Fetches and extracts text content from a URL |
| `extract_entire_document` | `app/extractor/extraction_runnable.py` | Runs structured extraction over the full document |
| `extract_from_content` | `app/extractor/retrieval.py` | Runs extraction against pre-loaded content |

## ETL Crawlers

The ETL layer lives in `backend/etl/` and contains crawler scripts for platforms like LinkedIn and Glassdoor. These are **not** part of the user-triggered extraction runtime.

| Module | Location | Purpose |
|--------|----------|---------|
| `base.py` | `backend/etl/base.py` | Base crawler with Playwright stealth support |
| `linkedin.py` | `backend/etl/linkedin.py` | LinkedIn-specific crawling logic |
| `glassdoor.py` | `backend/etl/glassdoor.py` | Glassdoor-specific crawling logic |

The ETL crawlers use Playwright with stealth mode. The `_apply_stealth` wrapper in `etl/base.py` handles compatibility between different `playwright-stealth` package versions (legacy `stealth_async()` vs. modern `Stealth().apply_stealth_async()`).

## Why the Separation Matters

- **Extraction** is a user-facing feature that runs synchronously during API requests and uses LangChain/OpenAI for structured output.
- **ETL** is a background data-ingestion concern that runs crawlers with browser automation and is scheduled independently.
- Changes to extraction logic should not affect ETL crawlers, and vice versa.
