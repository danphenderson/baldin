---
sidebar_position: 3
slug: /features/document-workspace
title: Document Workspace
description: Versioned documents with rich-text collaboration, sharing, and application attachments.
---

<!-- last-verified: 2026-04-09 -->

# Document Workspace

The document workspace lets you create, edit, version, and share rich-text documents — and attach them to job applications.

## Document Kinds

Baldin's versioned document model supports multiple document kinds through a `kind` discriminator field. Documents can represent resumes, cover letters, or free-form notes. Each kind shares the same versioning, collaboration, and sharing infrastructure.

The legacy `Resume` and `CoverLetter` tables are retired. The versioned document model is the active material surface for resumes, cover letters, and other working documents.

## Versioning

Every document maintains an immutable version history through the `DocumentVersion` table. Each version records:

- A `version_number` (monotonically increasing)
- The content and `content_format` (plain text, Markdown, Tiptap JSON)
- A reference back to the parent document

The document's `head_version_id` always points to the latest version. Version comparisons are available per document in the frontend at `/documents/:id/compare`.

## Real-Time Collaboration

Documents support real-time collaborative editing through a Yjs-backed protocol:

1. A client requests a bootstrap claim via `POST /documents/{id}/collaborate/bootstrap`
2. The backend grants one of three statuses: **connect** (open WebSocket immediately), **seed** (hydrate from saved Tiptap JSON first), or **pending** (another client is seeding — retry after a delay)
3. Once bootstrapped, the client opens a WebSocket at `/documents/{id}/collaborate/ws` for live sync

The frontend hook `useCollaborativeEditor` manages the full bootstrap-and-connect lifecycle.

## Sharing

Document access is controlled through:

- **Ownership** — the creating user always has full access
- **Shares** — per-user grants with `viewer` or `editor` roles via the `DocumentShare` table

Shared documents appear in the recipient's studio alongside their own documents.
Shared documents appear in the recipient's document library alongside their own documents.

## Application Attachments

Documents can be attached to applications through the `DocumentXApplication` bridge table. The application detail page shows linked documents and allows adding or removing attachments.

## Frontend Surface

| Path | Page | Purpose |
|------|------|---------|
| `/documents` | Document Library | Browse and manage documents |
| `/documents/:id` | Document Detail | Inspect the latest version, metadata, and sharing |
| `/documents/:id/edit` | Document Editor | Rich-text editing with collaboration |
| `/documents/:id/compare` | Version Compare | Side-by-side version diff for a specific document |

Legacy `/me/documents/*` URLs still redirect to the canonical `/documents/*` routes.

## User Story Book

### Current UI State

- Canonical document routes now live under `/documents`, with dedicated list, detail, edit, and compare pages plus legacy redirects from `/me/documents/*`.
- Document detail, editor, and compare views all include explicit back navigation instead of relying on browser history.
- Application detail already offers a `New Document` path and supports attaching or detaching existing documents from the same workflow.

### Story Threads

**Canonical backlog — application document context (`BACKLOG_APPLICATIONS_STORY.md`)**
Status: Partial
Application surfaces already show document-count badges and the detail page can create or attach documents. The remaining open gap is metadata-driven filtering in the applications queue because `appDocMeta` is still stubbed.

**Draft UX context — documents information architecture (`plans/UX_POLISH_PLAN.md`)**
Status: Superseded
The draft critique assumed documents still lived under an Identity → Studio section and lacked clear return paths. The current UI uses top-level `/documents` routes and ships back links on detail, editor, and compare pages, so this part of the draft no longer matches the live product.

## Related Docs

- [Understand Document Collaboration](../architecture/document-collaboration.md) — Bootstrap protocol, Yjs state machine, and access model
- [Map The Data Model](../architecture/data-model.md) — Document, DocumentVersion, DocumentShare entities
- [Browse API Routes](../architecture/api-surface.md) — Document and collaboration route groups
- [Job Search Pipeline](./job-search-pipeline.md) — Attaching documents to applications
