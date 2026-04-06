---
sidebar_position: 5
slug: /features/networking
title: Networking & Messaging
description: Directory profiles, peer connections, direct and group conversations, and activity tracking.
---

<!-- last-verified: 2026-04-06 -->

# Networking & Messaging

Baldin's network layer connects users through discoverable profiles, peer connections, and real-time messaging — all feeding into the activity feed and action items on the Command Center.

## Directory

The directory at `/network` surfaces discoverable user profiles. Visibility is governed by subscription tier:

| Tier | Directory Access |
|------|-----------------|
| Free | Limited visibility |
| Starter | Standard discovery |
| Pro | Full directory access |

Users can browse profiles and initiate connection requests from the directory.

**Frontend:** `/network` — Directory (`frontend/src/page/directory.tsx`)

**API:** `/directory` — Search and profile discovery endpoints

## Connections

Connections are peer relationships between users. Each connection passes through a lifecycle:

```mermaid
stateDiagram-v2
    [*] --> Pending: Send request
    Pending --> Accepted: Accept
    Pending --> Declined: Decline
    Pending --> Blocked: Block
    Accepted --> Blocked: Block
```

Connected users can message each other and see each other's activity in the feed.

**Frontend:** `/network/connections` — Connection management (`frontend/src/page/connections.tsx`)

**API:** `/connections` — Request, accept, decline, block, and list endpoints

## Messaging

Messaging supports both direct and group conversations:

- **Conversations** — Containers with participant lists and roles
- **Messages** — Content with threading support and edit history
- **Participants** — Membership and role tracking per conversation

Messages support single-level threading for focused discussions within a conversation.

**Frontend:**
- `/network/messages` — Conversation list (`frontend/src/page/messages/`)
- `/network/messages/:id` — Conversation detail with message thread

**API:** `/conversations` — Conversation CRUD, participant management, and message endpoints

## Activity Feed

The activity feed aggregates events from connections, conversations, applications, and documents into a single chronological stream. A summary endpoint groups counts by event type for quick-glance metrics on the Command Center.

**API:** `/activity-feed` — Feed list and summary endpoints

## Related Docs

- [Networking and Messaging Architecture](../architecture/networking-and-messaging.md) — Data model, access rules, and conversation lifecycle
- [Command Center](./command-center.md) — Activity feed and action items integration
- [Map The Data Model](../architecture/data-model.md) — Connection, Conversation, Message, and ActionItem entities
