---
sidebar_position: 3
slug: /features/document-workspace
title: Document Workspace
description: Versioned documents with rich-text collaboration, sharing, and application attachments.
---

<!-- last-verified: 2026-04-06 -->

# Document Workspace

The document workspace lets you create, edit, version, and share rich-text documents — and attach them to job applications.

## Document Kinds

Baldin's versioned document model supports multiple document kinds through a `kind` discriminator field. Documents can represent resumes, cover letters, or free-form notes. Each kind shares the same versioning, collaboration, and sharing infrastructure.

Legacy `Resume` and `CoverLetter` tables still exist in the data model and coexist with the newer versioned document system.

## Versioning

Every document maintains an immutable version history through the `DocumentVersion` table. Each version records:

- A `version_number` (monotonically increasing)
- The content and `content_format` (plain text, Markdown, Tiptap JSON)
- A reference back to the parent document

The document's `head_version_id` always points to the latest version. Version comparisons are available per document in the frontend at `/me/documents/:id/compare`.

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

## Application Attachments

Documents can be attached to applications through the `DocumentXApplication` bridge table. The application detail page shows linked documents and allows adding or removing attachments.

## Frontend Surface

| Path | Page | Purpose |
|------|------|---------|
| `/me/documents` | Studio / Document Library | Browse and manage documents |
| `/me/documents/:id` | Document Detail | Inspect the latest version, metadata, and sharing |
| `/me/documents/:id/edit` | Document Editor | Rich-text editing with collaboration |
| `/me/documents/:id/compare` | Version Compare | Side-by-side version diff for a specific document |

## Related Docs

- [Understand Document Collaboration](../architecture/document-collaboration.md) — Bootstrap protocol, Yjs state machine, and access model
- [Map The Data Model](../architecture/data-model.md) — Document, DocumentVersion, DocumentShare entities
- [Browse API Routes](../architecture/api-surface.md) — Document and collaboration route groups
- [Job Search Pipeline](./job-search-pipeline.md) — Attaching documents to applications
