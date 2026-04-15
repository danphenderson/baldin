---
sidebar_position: 3
slug: /reference/glossary
title: Decode Baldin Terms
description: Decode Baldin-specific terms that recur across architecture and engineering docs.
---

<!-- last-verified: 2026-04-15 -->

# Decode Baldin Terms

Use this page when the architecture and engineering docs assume product-specific terms without re-explaining them in full.

## Application status history

JSONB history stored on `applications.status_history`. It records status transitions and powers part of the activity feed.

## Bootstrap claim

Short-lived lease used by the collaboration backend to ensure only one client seeds a Yjs document from saved TipTap JSON when no persisted `yjs_state` exists yet.

## Dashboard

The authenticated frontend dashboard at `/dashboard` backed by the activity-feed summary endpoint. The public marketing home now lives at `/`.

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

The current repo posture: Docker Compose and persisted local data are the primary supported workflow, and production automation is still being rebuilt.

## Placement status

Lifecycle field on `users` that tracks states such as active or graduated and is surfaced in the settings area.

## Subscription tier

Capability level stored on `users.subscription_tier`. Current docs and guards refer to `free`, `starter`, and `pro`.

## Versioned document model

The newer `Document` plus `DocumentVersion` architecture that adds immutable version history, collaboration state, and sharing. It coexists with legacy `Resume` and `CoverLetter` tables.

## Yjs state

Persisted CRDT snapshot stored on `documents.yjs_state`. Once present, it becomes the authoritative real-time collaboration state.

## Start Here Next

- For entity and domain context: [Map The Data Model](../architecture/data-model.md)
- For collaboration-specific terms: [Understand Document Collaboration](../architecture/document-collaboration.md)
- For networking and activity terms: [Follow Network Flows](../architecture/networking-and-messaging.md)
- For release and local-first terminology: [Track Release Readiness](../engineering/release-roadmap.md)
