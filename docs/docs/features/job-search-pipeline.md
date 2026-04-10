---
sidebar_position: 2
slug: /features/job-search-pipeline
title: Job Search Pipeline
description: Track companies, leads, and applications through the full job-search lifecycle.
---

<!-- last-verified: 2026-04-09 -->

# Job Search Pipeline

Baldin's core job-search pipeline connects companies, leads, and applications into a single workflow that moves from discovery through to offer tracking.

## Companies

Companies represent employers. Each company record carries a name, website, and optional metadata. Companies link to leads through a many-to-many bridge (`LeadXCompany`), so a single lead can reference multiple companies and vice versa.

**Frontend:** `/leads/companies` — Company directory with search and detail views (`frontend/src/page/companies.tsx`)

**API:** `/companies` — Full CRUD plus association endpoints

## Leads

Leads represent job postings or opportunities. Each lead captures:

- Canonical URL, title, description, and location
- Salary range (min/max)
- Status and review classification
- Source metadata

Leads support per-user registration (`LeadRegistration`) to track which users are interested, and threaded comments (`LeadComment`) with single-level replies for discussion.

**Frontend:** `/leads` — Leads list with filters and detail views (`frontend/src/page/leads.tsx`)

**API:** `/leads` — CRUD, bulk operations, and lead comment endpoints

## Applications

Applications track a user's progress toward a specific opportunity. Each application maintains:

- A status field with full status history stored as JSONB
- A `next_step` field for tracking what comes next
- Links to attached documents through the `DocumentXApplication` bridge

The application board at `/applications/board` provides a Kanban-style view grouped by status.

**Frontend:**
- `/applications` — Application queue (`frontend/src/page/applications/applications-queue-page.tsx`)
- `/applications/board` — Kanban board with drag-and-drop stage movement (`frontend/src/page/applications/applications-board-page.tsx`)
- `/applications/:applicationId` — Detail view with status timeline, outcome context, and document attachments (`frontend/src/page/applications/applications-detail-page.tsx`)

**API:** `/applications` — CRUD, status transitions, and document attachment endpoints

## Pipeline Flow

```mermaid
flowchart LR
    accTitle: Job Search Pipeline Flow
    accDescr: Left-to-right flow from Company discovery to Lead, then to LeadRegistration and Application; Application branches to Document attachment and ActionItem tracking.
    Company --> Lead
    Lead --> LeadRegistration
    Lead --> Application
    Application --> Document
    Application --> ActionItem
```

A typical path: discover a **Company** → find a **Lead** → register interest → create an **Application** → attach **Documents** (resume, cover letter) → track status through to completion.

## User Story Book

### Current UI State

- Application creation already starts from the leads and companies quick-apply surfaces, where users choose between **Register interest** and **Apply now**.
- The queue and board both surface document counts; the board also supports drag-and-drop stage movement and inline `next_step` / `next_step_due` editing.
- The detail page already uses a dedicated per-id fetch, shows a vertical status-history timeline, captures `outcome_reason`, and sends an explicit `reopen` flag when moving a closed application back into an active stage.

### Story Threads

**Canonical backlog — creation intent and duplicate guard (`BACKLOG_APPLICATIONS_STORY.md`)**
Status: Implemented
The lead and company entry points already offer **Register interest** versus **Apply now** and check for an existing application before creating a duplicate.

**Canonical backlog — pipeline hardening (`BACKLOG_APPLICATIONS_STORY.md`)**
Status: Implemented
Board drag-and-drop, inline reminder editing, the dedicated detail fetch, explicit reopen handling, terminal `outcome_reason`, and the status timeline are all present in the current UI. These phases should no longer be described as pending work on this page.

**Canonical backlog — document-aware queue filtering (`BACKLOG_APPLICATIONS_STORY.md`)**
Status: Partial
Board and queue cards already render `document_count`, but the shared applications hook still returns an empty `appDocMeta` map. Resume and cover-letter filters on the queue therefore depend on metadata that is not yet loaded.

**Draft UX context — core job-search loop (`plans/UX_POLISH_PLAN.md`)**
Status: Superseded
The draft's page-local critique no longer matches the live UI. The app now uses plain-language Job Search navigation, provides back links on detail pages, exposes top-level documents routes, and lets application users jump directly into new document creation from the detail view.

## Related Docs

- [Map The Data Model](../architecture/data-model.md) — Full entity diagram with Lead, Application, and Company relationships
- [Browse API Routes](../architecture/api-surface.md) — Route groups for leads, companies, and applications
- [Document Workspace](./document-workspace.md) — Attaching documents to applications
- [Dashboard](./dashboard.md) — Action items linked to applications and leads
