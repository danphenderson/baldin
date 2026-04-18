---
sidebar_position: 3
slug: /reference/glossary
title: Decode Baldin Terms
description: Decode Baldin-specific terms that recur across architecture and engineering docs.
---

<!-- last-verified: 2026-04-17 -->

# Decode Baldin Terms

Use this page when the architecture and engineering docs assume product-specific terms without re-explaining them in full.

## Application status history

JSONB history stored on `applications.status_history`. It records status transitions and powers part of the activity feed.

## Bootstrap claim

Short-lived lease used by the collaboration backend to ensure only one client seeds a Yjs document from saved TipTap JSON when no persisted `yjs_state` exists yet.

## Career control plane

README shorthand for Baldin's operator-commanded decision layer. Today that means a private workspace for applications, leads, documents, automation, and network context; over time it is meant to help users decide where effort is worth spending.

## Dashboard

The authenticated frontend dashboard at `/dashboard` backed by the activity-feed summary endpoint. It is a personal workspace surface; the public marketing home lives at `/`.

## Content format

How a document version's content is encoded. The current collaboration flow specifically cares about `tiptap_json` versus plain text.

## Document kind

The `documents.kind` discriminator. Used to distinguish versioned document types such as resumes, cover letters, or future custom document classes.

## Document share role

Per-user access grant stored in `document_shares.role`. The current roles are `viewer` and `editor`.

## Extraction

User-triggered structured parsing driven by extractors, examples, schemas, and LLM-backed execution. This is separate from crawler ETL.

## ETL / crawler pipeline

Background or admin-managed acquisition flow that crawls external sources and records runs, policies, and review state.

## Lead registration

Per-user association to a lead indicating interest or participation in that lead rather than a direct user foreign key on the lead itself.

## Local-first

Both a product and repo posture. User-owned data and private workflow come first, the supported stack is local Docker Compose with persisted local data, and any broader sharing remains opt-in rather than public by default.

## Listing observability

The target product direction for applicant-side signals about whether a listing seems active, crowded, responsive, trustworthy, or stale. This is future-facing README posture, not a currently shipped runtime surface in the local stack.

## Placement status

Lifecycle field on `users` that tracks states such as active or graduated and is surfaced in the settings area.

## Signal quality tiers

README language for ranking shared-signal confidence. The intended tiers distinguish self-reported signals, multi-user corroboration, privacy-preserved local evidence, and stale or low-confidence data.

## Subscription tier

Capability level stored on `users.subscription_tier`. Current docs and guards refer to `free`, `starter`, and `pro`.

## Trust model

The README posture for how Baldin should handle sharing and observability: minimal sharing by default, opt-in discoverability, detachment from public identity, coarse bands instead of exact counts, aggressive time decay, and visibility only after enough independent signal exists.

## Versioned document model

The newer `Document` plus `DocumentVersion` architecture that adds immutable version history, collaboration state, and sharing. It coexists with legacy `Resume` and `CoverLetter` tables.

## Yjs state

Persisted CRDT snapshot stored on `documents.yjs_state`. Once present, it becomes the authoritative real-time collaboration state.

## Start Here Next

- For entity and domain context: [Map The Data Model](../architecture/data-model.md)
- For collaboration-specific terms: [Understand Document Collaboration](../architecture/document-collaboration.md)
- For networking and activity terms: [Follow Network Flows](../architecture/networking-and-messaging.md)
- For release and local-first terminology: [Track Release Readiness](../engineering/release-roadmap.md)
