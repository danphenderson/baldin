---
sidebar_position: 3
slug: /features/document-workspace
title: Document Workspace
description: Versioned documents with rich-text collaboration, sharing, and application attachments.
---

<!-- last-verified: 2026-04-12 -->

# Document Workspace

The document workspace lets you create, edit, version, and share rich-text documents — and attach them to job applications.

## Document Kinds

Baldin's versioned document model supports multiple document kinds through a `kind` discriminator field. Documents can represent resumes, cover letters, free-form notes, or agent-created cell-doc sessions. Each kind shares the same versioning, collaboration, and sharing infrastructure.

The legacy `Resume` and `CoverLetter` tables are retired. The versioned document model is the active material surface for resumes, cover letters, and other working documents.

## Versioning

Every document maintains an immutable version history through the `DocumentVersion` table. Each version records:

- A `version_number` (monotonically increasing)
- The content and `content_format` (plain text, Markdown, Tiptap JSON)
- A reference back to the parent document

The document's `head_version_id` always points to the latest version. Version comparisons are available per document in the frontend at `/workspace/:id/compare`.

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

Shared documents appear in the recipient's workspace alongside their own documents.

## Application Attachments

Documents can be attached to applications through the `DocumentXApplication` bridge table. The application detail page shows linked documents and allows adding or removing attachments.

## Agent Sessions

Agents can reach the workspace through two related interaction modes:

- `Run Agent` creates or appends to a `cell_doc` session document. Each run produces a new document version, and the `AgentRun` record links back to the specific version it created.
- `Chat with Agent` keeps the interaction in a persisted session at `/automation/agents/:agentId/chat/:sessionId` until the user chooses save-to-document export. That export creates a new `cell_doc` document and records an `AgentRun` linked back to the originating chat session.

The cell-doc editor footer includes a **Rerun Agent** button when the document was originally created by an agent run with a completed status. This allows in-context iteration without navigating back to the agent detail page.

See [Networking & Messaging](./networking.md#agents) for agent CRUD, runs, and chat sessions, and [Map The Data Model](../architecture/data-model.md) for `Agent`, `AgentRun`, `AgentChatSession`, and `AgentChatMessage`.

## Frontend Surface

| Path | Page | Purpose |
|------|------|---------|
| `/workspace` | Workspace | Browse and manage documents |
| `/workspace/:id` | Workspace Detail | Inspect the latest version, metadata, and sharing |
| `/workspace/:id/edit` | Workspace Editor | Rich-text editing with collaboration |
| `/workspace/:id/compare` | Workspace Compare | Side-by-side version diff for a specific document |

Legacy `/documents/*` and `/me/documents/*` URLs still redirect to the canonical `/workspace/*` routes.

## User Story Book

### Current UI State

- Canonical workspace routes now live under `/workspace`, with dedicated list, detail, edit, and compare pages plus legacy redirects from `/documents/*` and `/me/documents/*`.
- Document detail, editor, and compare views all include explicit back navigation instead of relying on browser history.
- Application detail already offers a `New Document` path and supports attaching or detaching existing documents from the same workflow.

### Planned Improvements

- No separate workspace-specific backlog file is currently checked in for this page.
- Keep this page aligned to the `/workspace` frontend surface while the underlying document API and collaboration endpoints remain under `/documents/*`.

## Related Docs

- [Understand Document Collaboration](../architecture/document-collaboration.md) — Bootstrap protocol, Yjs state machine, and access model
- [Map The Data Model](../architecture/data-model.md) — Document, DocumentVersion, DocumentShare entities
- [Browse API Routes](../architecture/api-surface.md) — Document and collaboration route groups
- [Job Search Pipeline](./job-search-pipeline.md) — Attaching documents to applications
