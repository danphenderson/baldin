---
sidebar_position: 2
slug: /architecture/data-model
title: Map The Data Model
description: Map how profile, search, document, automation, and networking entities fit together.
---

<!-- last-verified: 2026-04-06 -->

# Map The Data Model

Baldin's SQLAlchemy model layer is organized around a single authenticated `User` record and seven operational domains built on top of it: profile data, job-search state, versioned documents, automation, agents, networking, and user-facing work tracking.

Every entity inherits `id`, `created_at`, and `updated_at` from the shared `Base` model in `backend/app/models.py`. `User` also inherits the authentication fields from `SQLAlchemyBaseUserTableUUID`.

## Current Entity Map

The diagrams below are intentionally structural rather than field-complete. The seven domain diagrams that follow correspond directly to the Domain Breakdown section and show only the ownership links that matter when navigating the codebase.

### User Profile Entities

```mermaid
erDiagram
	accTitle: User Profile Entities
	accDescr: Shows the USER entity and its directly owned profile records — CONTACT, SKILL, EXPERIENCE, EDUCATION, and CERTIFICATE.
	USER {
		uuid id PK
		string subscription_tier
		string placement_status
	}
	CONTACT {
		uuid id PK
		uuid user_id FK
	}
	SKILL {
		uuid id PK
		uuid user_id FK
	}
	EXPERIENCE {
		uuid id PK
		uuid user_id FK
	}
	EDUCATION {
		uuid id PK
		uuid user_id FK
	}
	CERTIFICATE {
		uuid id PK
		uuid user_id FK
	}

	USER ||--o{ CONTACT : owns
	USER ||--o{ SKILL : owns
	USER ||--o{ EXPERIENCE : owns
	USER ||--o{ EDUCATION : owns
	USER ||--o{ CERTIFICATE : owns
```

*Figure 1 — USER owns all profile sub-records (contacts, skills, experiences, education, certificates) through a direct foreign key.*

### Job Search Pipeline Entities

```mermaid
erDiagram
	accTitle: Job Search Pipeline Entities
	accDescr: Shows COMPANY, LEAD, LEAD_X_COMPANY bridge, LEAD_REGISTRATION, LEAD_COMMENT, and APPLICATION and how USER relates to each.
	USER {
		uuid id PK
	}
	COMPANY {
		uuid id PK
		string name
	}
	LEAD {
		uuid id PK
		string canonical_url
		string review_status
	}
	LEAD_X_COMPANY {
		uuid lead_id PK_FK
		uuid company_id PK_FK
	}
	LEAD_REGISTRATION {
		uuid id PK
		uuid lead_id FK
		uuid user_id FK
	}
	LEAD_COMMENT {
		uuid id PK
		uuid lead_id FK
		uuid author_user_id FK
	}
	APPLICATION {
		uuid id PK
		uuid user_id FK
		uuid lead_id FK
		enum status
	}

	COMPANY ||--o{ LEAD_X_COMPANY : linked_to
	LEAD ||--o{ LEAD_X_COMPANY : linked_to
	LEAD ||--o{ LEAD_REGISTRATION : registrations
	LEAD ||--o{ LEAD_COMMENT : comments
	LEAD ||--o{ APPLICATION : applications
	USER ||--o{ APPLICATION : submits
	USER ||--o{ LEAD_REGISTRATION : registers
	USER ||--o{ LEAD_COMMENT : authors
```

*Figure 2 — LEAD is the hub of the job-search pipeline. COMPANY and LEAD are linked through a many-to-many bridge. USER registers interest, comments, and submits applications against a LEAD.*

### Document and Attachment Entities

```mermaid
erDiagram
	accTitle: Document and Attachment Entities
	accDescr: Shows DOCUMENT and its child records — DOCUMENT_VERSION, DOCUMENT_SHARE, DOCUMENT_ACTIVITY, and DOCUMENT_X_APPLICATION bridge — plus the deprecated RESUME and COVER_LETTER tables and their application attachment bridges.
	USER {
		uuid id PK
	}
	APPLICATION {
		uuid id PK
	}
	DOCUMENT {
		uuid id PK
		uuid user_id FK
		string kind
		uuid head_version_id FK
	}
	DOCUMENT_VERSION {
		uuid id PK
		uuid document_id FK
		int version_number
		string content_format
	}
	DOCUMENT_X_APPLICATION {
		uuid application_id PK_FK
		uuid document_id PK_FK
		uuid version_id FK
	}
	DOCUMENT_SHARE {
		uuid id PK
		uuid document_id FK
		uuid shared_with_user_id FK
		uuid shared_by_user_id FK
		string role
	}
	DOCUMENT_ACTIVITY {
		uuid id PK
		uuid document_id FK
		uuid actor_user_id FK
		string activity_type
	}
	RESUME["RESUME (deprecated)"] {
		uuid id PK
		uuid user_id FK
	}
	RESUME_X_APPLICATION["RESUME_X_APPLICATION (deprecated)"] {
		uuid application_id PK_FK
		uuid resume_id PK_FK
	}
	COVER_LETTER["COVER_LETTER (deprecated)"] {
		uuid id PK
		uuid user_id FK
	}
	COVER_LETTER_X_APPLICATION["COVER_LETTER_X_APPLICATION (deprecated)"] {
		uuid application_id PK_FK
		uuid cover_letter_id PK_FK
	}

	USER ||--o{ DOCUMENT : owns
	USER ||--o{ RESUME : owns
	USER ||--o{ COVER_LETTER : owns
	USER ||--o{ DOCUMENT_SHARE : shared_with
	USER ||--o{ DOCUMENT_SHARE : shared_by
	USER ||--o{ DOCUMENT_ACTIVITY : acts_on
	APPLICATION ||--o{ DOCUMENT_X_APPLICATION : uses
	APPLICATION ||--o{ RESUME_X_APPLICATION : uses
	APPLICATION ||--o{ COVER_LETTER_X_APPLICATION : uses
	DOCUMENT ||--o{ DOCUMENT_VERSION : versions
	DOCUMENT ||--o{ DOCUMENT_X_APPLICATION : attached_to
	DOCUMENT ||--o{ DOCUMENT_SHARE : shares
	DOCUMENT ||--o{ DOCUMENT_ACTIVITY : activity
	RESUME ||--o{ RESUME_X_APPLICATION : attached_to
	COVER_LETTER ||--o{ COVER_LETTER_X_APPLICATION : attached_to
```

*Figure 3 — DOCUMENT is the live material model with versioning, sharing, and activity tracking. RESUME and COVER_LETTER exist only as deprecated bridges; new material flows use DOCUMENT filtered by `kind`.*

### Automation and Review Entities

```mermaid
erDiagram
	accTitle: Automation and Review Entities
	accDescr: Shows EXTRACTOR and its EXTRACTOR_EXAMPLE and EXTRACTOR_VERSION children, ORCHESTRATION_PIPELINE with ORCHESTRATION_EVENT, and CRAWLER_PIPELINE with CRAWLER_RUN — all owned by USER.
	USER {
		uuid id PK
	}
	EXTRACTOR {
		uuid id PK
		uuid user_id FK
		string name
	}
	EXTRACTOR_EXAMPLE {
		uuid id PK
		uuid extractor_id FK
	}
	EXTRACTOR_VERSION {
		uuid id PK
		uuid extractor_id FK
		int version_number
	}
	ORCHESTRATION_PIPELINE {
		uuid id PK
		uuid user_id FK
		string name
	}
	ORCHESTRATION_EVENT {
		uuid id PK
		uuid pipeline_id FK
		string status
	}
	CRAWLER_PIPELINE {
		uuid id PK
		uuid created_by_user_id FK
		string source
	}
	CRAWLER_RUN {
		uuid id PK
		uuid crawler_pipeline_id FK
		string status
	}

	USER ||--o{ EXTRACTOR : owns
	USER ||--o{ ORCHESTRATION_PIPELINE : owns
	USER ||--o{ CRAWLER_PIPELINE : creates
	EXTRACTOR ||--o{ EXTRACTOR_EXAMPLE : examples
	EXTRACTOR ||--o{ EXTRACTOR_VERSION : versions
	ORCHESTRATION_PIPELINE ||--o{ ORCHESTRATION_EVENT : events
	CRAWLER_PIPELINE ||--o{ CRAWLER_RUN : runs
```

*Figure 4 — Extraction, orchestration, and crawler automation entities. EXTRACTOR and ORCHESTRATION_PIPELINE are user-owned. CRAWLER_PIPELINE is superuser-managed.*

### Agent and Session Entities

```mermaid
erDiagram
	accTitle: Agent and Session Entities
	accDescr: Shows AGENT owned by USER, with AGENT_RUN recording execution history. Each run links to an APPLICATION context and produces a DOCUMENT session with a specific DOCUMENT_VERSION.
	USER {
		uuid id PK
	}
	APPLICATION {
		uuid id PK
	}
	DOCUMENT {
		uuid id PK
		string kind
	}
	DOCUMENT_VERSION {
		uuid id PK
		uuid document_id FK
		int version_number
	}
	AGENT {
		uuid id PK
		uuid user_id FK
		string name
		string model
		string instructions
	}
	AGENT_RUN {
		uuid id PK
		uuid agent_id FK
		uuid application_id FK
		uuid session_document_id FK
		uuid session_version_id FK
		string status
		string error_summary
	}

	USER ||--o{ AGENT : owns
	AGENT ||--o{ AGENT_RUN : runs
	APPLICATION ||--o{ AGENT_RUN : context_for
	DOCUMENT ||--o{ AGENT_RUN : session_document
	DOCUMENT_VERSION ||--o{ AGENT_RUN : session_version
```

*Figure 6 — AGENT is user-owned. Each AGENT_RUN records the execution context (application), the produced session document (a cell_doc DOCUMENT), and the specific version created by the run.*

### Networking and Messaging Entities

```mermaid
erDiagram
	accTitle: Networking and Messaging Entities
	accDescr: Shows CONNECTION between two USER records, CONVERSATION with its CONVERSATION_PARTICIPANT bridge and MESSAGE children, and ACTION_ITEM owned by USER.
	USER {
		uuid id PK
	}
	CONNECTION {
		uuid id PK
		uuid requester_id FK
		uuid addressee_id FK
		string status
	}
	CONVERSATION {
		uuid id PK
		string type
		uuid created_by_user_id FK
	}
	CONVERSATION_PARTICIPANT {
		uuid conversation_id PK_FK
		uuid user_id PK_FK
		string role
	}
	MESSAGE {
		uuid id PK
		uuid conversation_id FK
		uuid author_user_id FK
		uuid parent_message_id FK
	}
	ACTION_ITEM {
		uuid id PK
		uuid user_id FK
		string kind
		string status
	}

	USER ||--o{ CONNECTION : requests
	USER ||--o{ CONNECTION : receives
	USER ||--o{ CONVERSATION_PARTICIPANT : joins
	USER ||--o{ MESSAGE : authors
	USER ||--o{ ACTION_ITEM : tracks
	CONVERSATION ||--o{ CONVERSATION_PARTICIPANT : participants
	CONVERSATION ||--o{ MESSAGE : messages
	MESSAGE ||--o{ MESSAGE : replies
```

*Figure 5 — Networking and messaging entities. CONNECTION is a peer relationship. CONVERSATION holds both direct and group threads. ACTION_ITEM links tasks back to applications, leads, documents, or conversations.*

## Domain Breakdown

### User Profile

| Tables | Purpose |
| --- | --- |
| `users` | Authenticated user identity plus profile, discovery, subscription, and placement lifecycle fields |
| `contacts` | Recruiters, hiring managers, and other external contact records |
| `user_skills` | Skills and subskills with simple experience metadata |
| `user_experiences` | Work history entries |
| `user_education` | Education entries with activities and achievements JSON |
| `user_certificates` | Certifications with issuer and validity dates |

### Job Search Pipeline

| Tables | Purpose |
| --- | --- |
| `companies` | Company directory records |
| `leads` | Canonicalized job leads and review state |
| `leads_x_companies` | Many-to-many bridge between leads and companies |
| `lead_registrations` | Per-user registration or interest in a lead |
| `lead_comments` | Lead discussion thread with single-level replies |
| `applications` | User application state, notes, next steps, and status history |

### Documents and Attachments

| Tables | Purpose |
| --- | --- |
| `documents` | Versioned multi-kind document record with status, pinning, and persisted Yjs state. Supports `kind` values: resume, cover_letter, follow_up, reference_sheet, freeform. |
| `document_versions` | Immutable snapshots of document content |
| `documents_x_applications` | Application attachment bridge for versioned documents |
| `document_shares` | Per-user viewer/editor access grants |
| `document_activities` | Audit-style document events |

The unified `Document` model is the only remaining material model. Frontend document and application-material flows use the Document API exclusively, filtering by `kind` (resume, cover_letter, etc.) where needed, and bootstrap schema sync drops the removed legacy resume and cover-letter tables when present in older local databases.

### Automation and Review

| Tables | Purpose |
| --- | --- |
| `extractors` | User-owned extraction definitions |
| `extractor_examples` | Example input/output pairs used to tune extractors |
| `extractor_versions` | Immutable snapshots of extractor instruction/schema state |
| `orchestration_pipelines` | User-owned orchestration definitions |
| `orchestration_events` | Execution history for orchestration pipelines |
| `crawler_pipelines` | Superuser-managed crawler definitions and policies |
| `crawler_runs` | Individual crawler execution records |

### Agents

| Tables | Purpose |
| --- | --- |
| `agents` | User-owned reusable AI assistant definitions with model, instructions, and generation parameters |
| `agent_runs` | Execution history recording application context, session document, produced version, status, and error summary |

### Networking and Messaging

| Tables | Purpose |
| --- | --- |
| `connections` | Peer connection requests between users |
| `conversations` | Direct and group conversation containers |
| `conversation_participants` | Membership and role bridge for conversations |
| `messages` | Conversation messages, including threaded replies |

### Personal Work Tracking

| Tables | Purpose |
| --- | --- |
| `action_items` | User-facing tasks associated with applications, leads, documents, or conversations |

The activity feed shown in the frontend is not backed by a dedicated event-log table. It is assembled on demand from application status history, document versions, messages, connections, and completed action items.

## Model Conventions That Matter

- `documents.head_version_id` points at the current immutable `document_versions` row instead of mutating content in place.
- `documents.yjs_state` stores the authoritative collaboration snapshot once real-time editing has persisted changes.
- `users.subscription_tier` and `users.placement_status` drive several route-level guards in `backend/app/api/deps.py`.
- `applications.status` uses a Postgres-native enum (`ApplicationStatus`: applied, screening, interview, offer, rejected, withdrawn).
- `leads.review_status` uses a Postgres-native enum (`LeadReviewStatus`: pending_review, approved, rejected).
- `crawler_runs.status` uses a Postgres-native enum (`CrawlerRunStatus`: pending, running, success, failed, cancelled, paused, pending_review).
- `applications.status_history` is JSONB and doubles as an input to the activity feed.
- `action_items` uses nullable foreign keys to support multiple parent types without introducing one table per task context. A CHECK constraint (`ck_action_items_exactly_one_fk`) ensures exactly one FK is non-null.

## Schema Management

The repo uses Alembic migrations bootstrapped under `backend/alembic/`. Local startup runs `alembic upgrade head` by default, while `LEGACY_BOOTSTRAP=1` activates the older `create_all` path. Test fixtures still use `metadata.create_all` for speed.
