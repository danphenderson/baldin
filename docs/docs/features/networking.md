---
sidebar_position: 5
slug: /features/networking
title: Networking & Messaging
description: Opt-in profiles, private connections, conversations, and personal activity tracking.
---

<!-- last-verified: 2026-04-17 -->

# Networking & Messaging

Baldin's networking surfaces provide private-by-default context around a job search. Profiles become discoverable only when a user opts in, accepted connections unlock conversations, and the resulting activity rolls into the operator's own dashboard and action-item workflow rather than a public market feed.

## Discover

The Discover surface at `/network/discover` shows only profiles whose owners allow discovery. Regular users default to `is_discoverable=false`; superusers default to `true`, and any user can toggle visibility later. Subscription tier still governs how much of the directory a user can browse:

| Tier | Discover Access |
|------|-----------------|
| Free | Limited visibility |
| Starter | Standard discovery |
| Pro | Full directory access |

Users can browse profiles and initiate connection requests from Discover.

**Frontend:** `/network/discover` — Discover (`frontend/src/page/directory.tsx`)

**API:** `/directory` — Search and profile discovery endpoints

## Connections

Connections are peer relationships between users. Each connection passes through a lifecycle:

```mermaid
stateDiagram-v2
    accTitle: Connection Lifecycle States
    accDescr: State machine showing a connection moving from initial state to Pending on send request, then from Pending to Accepted (accept), Declined (decline), or Blocked (block). An Accepted connection can also be Blocked.
    [*] --> Pending: Send request
    Pending --> Accepted: Accept
    Pending --> Declined: Decline
    Pending --> Blocked: Block
    Accepted --> Blocked: Block
```

Connected users can message each other and see relevant workflow events in their personal activity feed.

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
- `/network/messages/:conversationId` — Conversation detail with message thread

**API:** `/conversations` — Conversation CRUD, participant management, and message endpoints

## Activity Feed

The activity feed aggregates per-user events from connections, conversations, applications, and documents into a single chronological stream. A summary endpoint groups counts by event type for quick-glance metrics on the Dashboard. It is a personal workflow surface, not a public listing-health feed or broader market-intelligence view.

**API:** `/activity-feed` — Feed list and summary endpoints

## Agents

The Agents surface at `/automation/agents` lets users build reusable AI assistants that support both one-shot workspace generation and conversational follow-up against tracked applications.

Each agent is defined by a name, model, instructions, and optional temperature/top-p overrides. The same agent can be used in two modes:

- `Run Agent` creates or appends to a cell-doc workspace session, producing a document version tied to an `AgentRun`.
- `Chat with Agent` opens a persisted chat session with streamed assistant replies and an optional save-to-document export when the conversation should become a workspace artifact.

**Frontend:**
- `/automation/agents` — Agent list (`frontend/src/page/agents.tsx`)
- `/automation/agents/:agentId` — Agent detail with run history, session list, and launch controls (`frontend/src/page/agent-detail.tsx`)
- `/automation/agents/:agentId/chat/:sessionId` — Persisted chat session shell with streamed replies and save-to-document export (`frontend/src/page/agent-chat-shell.tsx`)
- Rerun button on cell-doc editor footer (`frontend/src/component/rerun-agent-button.tsx`)

**API:** `/agents` — Agent CRUD, supported-model discovery, per-agent run history, one-shot execution, chat session CRUD/history, streamed replies, and chat export

See [Map The Data Model](../architecture/data-model.md) for `Agent`, `AgentRun`, `AgentChatSession`, and `AgentChatMessage`.

## User Story Book

### Current UI State

- The Network area is organized around `/network/discover`, `/network/connections`, and `/network/messages`, while agents live in the Automation area at `/automation/agents`.
- Connections and conversations already use dedicated list and detail surfaces rather than a single combined hub.
- Unread message counts surface through badges and dashboard summaries instead of a dedicated notifications page.
- Agents support full CRUD, configurable models, one-shot workspace generation, persisted chat sessions with streamed replies, and in-session rerun from both the agent detail page and the cell-doc editor.

### Planned Improvements

- The app still relies on unread badges and dashboard activity summaries rather than a broader notification center for network events.

## Related Docs

- [Networking and Messaging Architecture](../architecture/networking-and-messaging.md) — Data model, access rules, and conversation lifecycle
- [Dashboard](./dashboard.md) — Activity feed and action items integration
- [Map The Data Model](../architecture/data-model.md) — Connection, Conversation, Message, Agent, AgentRun, AgentChatSession, AgentChatMessage, and ActionItem entities
