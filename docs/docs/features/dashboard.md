---
sidebar_position: 1
slug: /features/dashboard
title: Dashboard
description: Unified dashboard for action items, application pipeline, metrics, and activity.
---

<!-- last-verified: 2026-04-09 -->

# Dashboard

The Dashboard is the landing page at `/`. It brings together action items, application status, aggregate metrics, and the activity feed into one surface.

## What It Includes

| Section | Description |
|---------|-------------|
| **Action Items** | User tasks with polymorphic links to applications, leads, documents, and conversations |
| **Application Pipeline** | Current status of tracked job applications |
| **Metrics** | Aggregated counts and progress indicators |
| **Activity Feed** | Chronological stream of events across all domains |

## Action Items

Action items are cross-entity tasks that link back to the resource they belong to. They are managed through six CRUD endpoints under `/action-items` and support filtering by status, entity type, and due date.

Each action item tracks:

- A title and optional description
- A polymorphic foreign key to an application, lead, document, or conversation
- Completion status and priority
- Created and updated timestamps

## Activity Feed

The activity feed panel on the Dashboard aggregates events from across Baldin into a single chronological view. It is powered by the `/activity-feed` and `/activity-feed/summary` API endpoints rather than a separate frontend route.

## Frontend Surface

The Dashboard page lives at `frontend/src/page/dashboard.tsx`. It uses the action-items and activity-feed services:

- `frontend/src/service/action-items.tsx` — CRUD for action items
- `frontend/src/service/activity-feed.tsx` — Feed and summary queries

Action items can also be created from the application detail page and lead modal through integration hooks.

## User Story Book

### Current UI State

- The authenticated landing page at `/` already shows a welcome quick-start state when both leads and applications are empty.
- `frontend/src/page/dashboard.tsx` loads summary data, action items, the activity feed, and a small lead sample together, then keeps summary and action items fresh with lightweight polling.
- The metrics area now includes status breakdown, stage dwell time from `avg_days_per_stage`, and the offer-conversion funnel alongside unread messages, pending connections, overdue action items, and profile completion.

### Story Threads

**Canonical backlog — `BACKLOG_APPLICATIONS_STORY.md`**
Status: Implemented
The applications backlog's Phase 5 analytics story is already live on this page. The dashboard consumes `avg_days_per_stage` and `offer_conversion_funnel` from the summary surface, so this source is now historical delivery context instead of open scope for the Dashboard.

**Draft UX context — `plans/UX_POLISH_PLAN.md`**
Status: Partial
The current UI already uses the plain-language Dashboard label and shows a welcome state for first-session users, which addresses part of the draft critique. The remaining ideas on richer orientation and contextual help are still design inputs rather than a canonical committed backlog.

## Related Docs

- [Browse API Routes](../architecture/api-surface.md) — Route groups that power the dashboard
- [Follow Network Flows](../architecture/networking-and-messaging.md) — Activity and action item data model
- [Map The Data Model](../architecture/data-model.md) — ActionItem entity and relationships
