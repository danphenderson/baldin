# Baldin Data Model & API Design Audit
## Source-of-Truth Audit for Schema v2 Planning

## 1. Executive Summary

Baldin’s current backend data model is still in the right phase for breaking cleanup, but it is not ready to carry forward unchanged into a migration-managed or user-data-bearing environment.

The highest-risk issues are structural, not cosmetic:

- the backend still relies on runtime schema creation and bootstrap drift repair instead of a migration framework
- the `Application` model lacks critical integrity constraints and carries the most dangerous data-model flaws in the system
- several important domain fields are validated only in Pydantic and are not enforced by the database
- pure junction tables are modeled incorrectly and inherit surrogate identity/timestamps they should not have
- foreign key nullability and delete behavior are underspecified across many core entities
- the API surface has accumulated contract inconsistencies that should be corrected before it hardens further

The correct next move is a coordinated **Schema v2 hardening effort** before Baldin moves beyond developer preview. That effort should:

1. replace bootstrap schema mutation with Alembic migrations
2. enforce critical integrity rules in the database
3. normalize the application pipeline model
4. stabilize the API contract around the cleaned schema

This is the last inexpensive point in the project lifecycle to make these corrections.

---

## 2. Audit Objective

Define the breaking data-model and API-design changes Baldin should make before:

- real user data exists
- migrations become expensive
- frontend and automation integrations deepen
- current schema drift becomes institutionalized

This document is intended to serve as the source of truth for implementation planning.

---

## 3. Scope

This audit covers the backend schema and API contract surfaces, including:

- ORM models in `models.py`
- Pydantic schemas in `schemas.py`
- route modules under `api/`
- bootstrap database setup in `db.py`

It focuses on:

- normalization issues
- missing constraints
- incorrect cardinality
- enum and status modeling
- naming and contract consistency
- migration readiness
- indexing on obvious operational query paths

It does **not** focus on general backend performance tuning, authorization redesign, infrastructure topology, or broader product strategy except where those directly affect schema design.

---

## 4. Final Judgment

Baldin should execute a **Schema v2 pre-deployment hardening sprint**.

The current system is still workable for local developer-preview iteration, but it is not a stable long-term schema. If left unchanged, the current model will make future migrations, cleanup, and behavioral guarantees significantly more costly.

The blocking concerns are:

- no migration framework
- runtime schema mutation at startup
- weak `Application` integrity guarantees
- database acceptance of invalid enum-like values
- missing foreign key delete/nullability policy
- incorrect modeling of junction tables
- inconsistent API contract patterns

These issues should be resolved before Baldin crosses into persistent or shared environments.

---

## 5. Primary Findings

### 5.1 Migration Management Is the Top Architectural Blocker

#### Problem

The backend still relies on bootstrap-time schema creation and repair logic rather than a migration framework. The current approach includes:

- `create_all` style schema creation
- additive drift repair at startup
- enum mutation/sync logic in bootstrap
- legacy table dropping during startup

This is acceptable only for temporary local iteration. It is not acceptable if schema changes are not reproducible, reviewable, and reversible.

#### Why it matters

Without migrations:

- schema history is not durable
- production-like environments cannot be upgraded safely
- rollback is undefined
- startup code becomes the schema authority instead of migration scripts
- one-off destructive actions get normalized into regular app boot behavior

#### Required correction

Move schema change control into Alembic and remove schema mutation responsibilities from bootstrap startup code.

#### Audit decision

Baldin should adopt **Alembic as the only schema change path** and use it to implement Schema v2. Bootstrap startup code should stop acting as the schema authority.

---

### 5.2 `Application` Is the Highest-Risk Model

#### Problem

`Application` carries the most important data-integrity gaps in the current schema.

Key issues:

- no uniqueness constraint on `(user_id, lead_id)`
- core ownership fields are underconstrained
- status-related state is semantically central but not modeled cleanly
- deletion behavior for related records is not explicit

#### Why it matters

A user should not be able to create two application records for the same lead. That breaks assumptions behind:

- board views
- funnel analytics
- export logic
- command center summaries
- user-facing state transitions
- automation tied to “the application” for a lead

#### Required correction

Harden `Application` first. This is the single most important schema correction in the system.

---

### 5.3 `Application` Missing Critical Constraints

#### Findings

The current `Application` model should be corrected to enforce the following:

##### A. One application per user per lead

Add:

- `UniqueConstraint("user_id", "lead_id")`

##### B. Required ownership and linkage

These fields should not be nullable in normal operation:

- `user_id`
- stage/status field(s)
- `lead_id` at creation time

##### C. Explicit lead deletion semantics

The product must explicitly choose what happens if a linked lead is deleted:

- `RESTRICT` if applications must not outlive a lead delete attempt
- `SET NULL` if detached historical applications are allowed
- `CASCADE` only if deleting a lead should also destroy downstream applications

`RESTRICT` or `SET NULL` are safer than implicit default behavior.

#### Audit decision

Treat `Application` as the first schema object to harden in Schema v2.

---

### 5.4 Application Pipeline Modeling Is Conceptually Right but Stored Wrong

#### Problem

The current model uses a union-style `status` representation in the database while the API layer already thinks in two separate concepts:

- `stage` for funnel progression
- `outcome` for terminal closure state

That split currently lives in validation logic rather than in the database itself.

#### Why it matters

This causes:

- avoidable validator complexity
- poor DB-level enforceability
- awkward status semantics
- harder analytics
- harder future transition auditing

#### Required correction

Replace the single union-style application status column with:

- `stage` — non-null enum
- `outcome` — nullable enum

Optional DB-level checks should enforce valid combinations.

#### Recommended invariant direction

Examples of intended semantics:

- open applications have `stage` and `outcome IS NULL`
- closed applications retain their last meaningful stage and set `outcome`
- impossible state combinations should be rejected by the DB

#### Audit decision

The application pipeline should be modeled directly in the database as `stage + outcome`, not synthesized indirectly in Pydantic.

---

### 5.5 Application History Is Under-Modeled

#### Problem

Application status history is currently tracked inline in JSON. This is workable for temporary storage but weak for long-term queryability, reporting, and contract clarity.

#### Why it matters

Inline JSON history makes it harder to:

- analyze transitions
- audit who changed what
- query funnel movement efficiently
- enforce shape guarantees over time

#### Required correction

For Schema v2 planning:

- treat current inline history as a migration concern that must be preserved or transformed during the status-model split
- evaluate moving to a dedicated `application_status_history` table as the cleaner long-term design

#### Audit decision

The status split must include a plan for history migration. A dedicated history table is the preferred long-term target, but it can be phased.

---

### 5.6 Enum Coverage Is Too Shallow at the Database Layer

#### Problem

Many fields represent closed domains but are stored as unconstrained strings in the database. Validation exists in Pydantic, but the DB will still accept invalid values.

Likely examples include fields such as:

- `Document.kind`
- `Document.status`
- `DocumentShare.role`
- `Connection.status`
- `ActionItem.status`
- `ActionItem.kind`
- `ActionItem.priority`
- `OrchestrationEvent.status`
- `Conversation.type`
- `ConversationParticipant.role`

#### Why it matters

This creates a gap between API validation and database truth. Any direct DB write, migration bug, or future bypass path can introduce invalid state.

#### Required correction

Closed-domain fields should be DB-constrained using one of:

- native Postgres enums
- `CHECK` constraints on string fields

#### Audit decision

The database must reject invalid domain values. Pydantic-only enforcement is insufficient for core status and role fields.

---

### 5.7 Foreign Key Policy Is Underspecified

#### Problem

Many foreign keys rely on default nullability and default delete behavior rather than explicit design.

This affects several categories:

- user-owned profile entities
- application-linked entities
- comments
- action items
- lead/company link tables
- other child records that should not outlive their parents unintentionally

#### Why it matters

Implicit FK behavior causes:

- orphaned records
- accidental destructive cascades to be avoided only in app code
- ambiguous deletion behavior
- inconsistent cleanup across entity families

#### Required correction

Adopt an explicit FK policy.

#### Recommended policy shape

##### User-owned children

Use:

- `nullable=False`
- `ondelete="CASCADE"`

for records that have no meaning without a parent user.

##### Historical or protected references

Use:

- `RESTRICT` when deletes should be blocked
- `SET NULL` when a child may survive detached

#### Audit decision

Schema v2 should include a deliberate FK nullability and `ondelete` pass across all child relationships.

---

### 5.8 Profile Tables Need Constraint and Type Cleanup

#### Problem

Several user-owned profile entities are underconstrained or inconsistently typed.

Likely issues include:

- `user_id` foreign keys that should be non-null
- missing cascade behavior for profile children
- inconsistent table naming
- fields modeled as structured data in one layer and strings in another

#### Examples of likely cleanup targets

- skills
- experiences
- education
- certificates
- contacts

#### Important correctness cases

##### `Education.gradePoint`

This should be renamed to snake_case form, e.g. `grade_point`.

##### `Education.activities` / `Education.achievements`

These must stop being treated as structured JSON in the DB while being exposed as strings in the API layer. The system should choose one representation and enforce it end-to-end.

##### `Skill.subskills`

Comma-delimited text is weak if the product wants structured querying or tag-like display behavior. This should either remain intentionally plain text or become structured array-like data with matching API types.

##### `Experience.projects`

Same issue: comma-joined text is not a robust structured-data strategy.

##### `Contact`

Duplicate contacts for the same user should be constrained if email identity matters. A uniqueness strategy such as `(user_id, email)` is appropriate if that matches product intent.

#### Audit decision

Profile-table cleanup belongs in Schema v2 because these inconsistencies will get harder to unwind after imports and user edits accumulate.

---

### 5.9 Junction Tables Are Modeled Incorrectly

#### Problem

Pure association tables such as:

- lead-to-company
- document-to-application

should not inherit a heavyweight base model that adds surrogate identity and timestamps when the true row identity is the composite key.

Current anti-pattern symptoms include inherited fields such as:

- `id`
- `created_at`
- `updated_at`

on rows that are semantically just associations.

#### Why it matters

This creates:

- misleading identity semantics
- unnecessary columns
- avoidable schema complexity
- confusing primary-key behavior

#### Required correction

Pure junctions should be remodeled as:

- plain `Table(...)` association tables, or
- minimal mapped classes without inherited surrogate identity/timestamps

#### Audit decision

Fixing junction-table inheritance is a low-risk early cleanup and should be done before migrations harden around the current shape.

---

### 5.10 Relationship Cardinality Should Match Product Reality

#### Problem

At least some relationship declarations appear to encode a narrower shape than the product model actually allows.

A representative example is a lead-to-application relationship that behaves as one-to-one in the ORM even though a shared lead model can legitimately have many applications across users.

#### Why it matters

Incorrect ORM cardinality causes:

- misleading API behavior
- silent truncation to “the first” related record
- confusion for future developers
- overconfident assumptions in route logic

#### Required correction

Relationships should reflect the actual business model:

- one lead can have many applications across users
- relationship names should match plurality
- ORM configuration should not imply one-to-one where the DB/business rules do not

#### Audit decision

Cardinality mismatches are correctness problems, not style issues, and should be corrected in the same pass as application hardening.

---

### 5.11 Timestamp Handling Needs Global Correction

#### Problem

Timestamp columns are currently under-specified.

Common issues include:

- naive datetimes instead of timezone-aware storage
- Python-side defaults instead of DB-visible defaults
- inconsistent update semantics

#### Why it matters

This creates ambiguity in:

- inserts outside the ORM
- migration-authored data changes
- time comparisons
- audit behavior
- cross-environment consistency

#### Required correction

Move to:

- `DateTime(timezone=True)` or equivalent timezone-aware timestamp type
- `server_default=func.now()` for created timestamps
- DB-visible update handling for `updated_at`

This should be applied consistently across base audit columns and operational datetime fields.

#### Audit decision

Timezone-aware, DB-default-backed timestamps are foundational schema hygiene and belong in Schema v2.

---

### 5.12 Company Deduplication Is Underspecified

#### Problem

Company records currently risk duplication without a clear dedup strategy.

A system that crawls, extracts, or imports lead/company data will become harder to clean if it allows many representations of the same company.

#### Why it matters

Without dedup rules:

- duplicate company records accumulate
- lead/company association quality degrades
- reporting becomes noisier
- enrichment/import logic becomes harder to reason about

#### Required correction

Adopt one of these strategies:

- exact-name uniqueness if product intent is simple exact dedup
- canonical-name uniqueness if case/whitespace normalization is needed

#### Audit decision

Company dedup should be addressed before import/crawl flows deepen further.

---

### 5.13 ActionItem Modeling Has FK and Query-Path Gaps

#### Problem

The `ActionItem` model appears to use a polymorphic “exactly one target FK” shape. That can be valid, but it needs stronger integrity and better support for common query paths.

#### Likely issues

- target FKs need explicit `ondelete` behavior
- dashboard queries likely need better indexing
- status and priority fields should be DB-constrained if domain-limited

#### Why it matters

This entity appears central to command-center and due-date workflows. Weak integrity or missing indexes here has both correctness and operational cost.

#### Required correction

- make target-FK deletion behavior explicit
- add indexes for common user/status and user/due-date queries
- constrain closed-domain fields at the DB layer

#### Audit decision

Action items should be included in the enum + FK + indexing cleanup pass.

---

### 5.14 Messaging and Connection Models Need Constraint Tightening

#### Problem

Messaging and connection entities appear to contain several underconstrained domain fields and at least one likely duplicate-edge problem.

#### Likely gaps

- connection status stored as unconstrained string
- conversation type stored as unconstrained string
- participant role stored as unconstrained string
- bidirectional connection duplication may not be fully prevented by directional uniqueness alone

#### Why it matters

These are stateful collaborative entities. Weak constraints here allow invalid or duplicate graph edges and ambiguous UI behavior.

#### Required correction

- constrain closed-domain string fields
- evaluate bidirectional uniqueness rules for connections
- ensure indexes support common filtering patterns

#### Audit decision

These are not the first blocking fixes, but they belong in Schema v2 while the model is still cheap to change.

---

### 5.15 API Contract Design Needs Cleanup Before It Hardens

#### Problem

The API surface is inconsistent in several ways:

- route naming varies across singular, plural, hyphenated, and underscored forms
- update semantics mix `PUT` and `PATCH` even where update schemas are partial
- pagination shapes vary across endpoints
- some endpoints likely over-fetch nested objects
- route parameter naming is inconsistent
- there is no stable version boundary for upcoming breaking changes

#### Why it matters

Once frontend services and generated types deepen around the current contract, cleanup becomes more expensive.

#### Required correction

##### A. Route naming normalization

Use a consistent resource-path strategy:

- plural where appropriate
- hyphenated or simplified resource names
- avoid underscores in route segments

##### B. Update semantics

Use `PATCH` for partial updates where the update schema is partial. Reserve `PUT` only for true full-replacement semantics.

##### C. Pagination normalization

Standardize paginated responses to one envelope shape, for example:

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "page_size": 20
}
```

##### D. API version boundary

Introduce `/api/v1/` before additional breaking schema/API work lands.

##### E. Over-fetching cleanup

List endpoints should prefer summary DTOs over full nested read models when those nested objects are not needed.

#### Audit decision

API cleanup should follow core schema corrections but should be planned as part of the same Schema v2 program.

---

### 5.16 Missing Indexes Should Be Treated as Part of Hardening

#### Problem

Several obvious operational query patterns likely lack explicit supporting indexes.

High-value candidate areas include:

- applications filtered by user and state
- documents filtered by user, kind, and status
- action items filtered by user, status, and due date
- lead comments ordered by lead and creation time
- orchestration events ordered by pipeline and creation time

#### Why it matters

This is not just a performance nicety. Indexes reinforce the intended access model and reduce the risk of slow critical-path screens as data grows.

#### Required correction

Add indexes for the query paths that power:

- boards
- command center views
- timelines
- document lists
- event streams

#### Audit decision

Index additions should be included in Schema v2 rather than deferred indefinitely.

---

### 5.17 Security and Lifecycle Normalization: Important but Secondary

#### Problem

A few model areas are valid concerns but are not as urgent as integrity and migration readiness.

Examples include:

- plaintext storage risk for MFA secrets
- over-denormalized user lifecycle fields such as subscriptions
- address data embedded directly on `User`
- lack of soft-delete/archive patterns for some entities

#### Audit decision

These should be tracked as follow-on design work, with one exception:

- encrypting `mfa_secret` at rest is important enough to include soon, even if full user-entity normalization is deferred

---

## 6. Recommended Schema v2 Decisions

The following decisions should be treated as the source-of-truth target state for implementation planning.

### 6.1 Migration and bootstrap

- adopt Alembic
- remove schema drift repair from bootstrap startup code
- remove destructive bootstrap cleanup behavior such as legacy table dropping from app startup
- make migration scripts the only durable schema authority

### 6.2 Application model

- add unique `(user_id, lead_id)`
- make ownership and core state fields non-null
- replace single union-style status with `stage + outcome`
- explicitly define `lead_id` delete behavior
- plan migration for status history shape

### 6.3 Enum and domain fields

- constrain closed-domain string fields in the DB
- use native enums or `CHECK` constraints consistently
- stop relying on Pydantic-only enforcement for core domain state

### 6.4 Foreign keys

- make child ownership nullability explicit
- add `ondelete` policies intentionally
- cascade user-owned children where appropriate
- restrict or nullify historical references deliberately, not accidentally

### 6.5 Junction tables

- remove inherited surrogate base identity/timestamps from pure association tables
- remodel them as true association tables

### 6.6 Profile and structured fields

- rename schema outliers to snake_case
- eliminate model/schema type disagreement
- choose structured arrays vs plain text explicitly for list-like fields
- add uniqueness where product identity requires it, such as duplicate-contact prevention

### 6.7 Timestamps

- move to timezone-aware timestamp columns
- add server-side defaults
- make update timestamps DB-visible and consistent

### 6.8 Company and provenance

- add company dedup strategy
- consider creator provenance on leads if ownership and permissions need it

### 6.9 API contract

- add `/api/v1/`
- normalize route naming
- standardize on `PATCH` for partial updates
- standardize paginated response envelopes
- reduce over-fetching with summary read models
- normalize path parameter naming conventions

### 6.10 Indexing

- add explicit indexes on common list/filter/timeline query paths

---

## 7. Prioritized Implementation Order

### Priority 0 — Foundation

- freeze Schema v2 target decisions
- introduce Alembic as the only schema change path
- remove bootstrap drift-repair responsibilities from runtime startup logic

### Priority 1 — Highest-risk integrity corrections

- harden `Application`
- split application status into `stage + outcome`
- add missing FK nullability and `ondelete` policies
- constrain bare-string enum-like fields in the DB

### Priority 2 — Structural cleanup

- fix junction table inheritance
- correct cardinality mismatches
- repair profile-table type and naming inconsistencies
- upgrade timestamps
- add missing high-value indexes

### Priority 3 — API contract cleanup

- add `/api/v1/`
- normalize route names
- normalize `PATCH` semantics
- standardize pagination envelope
- introduce summary DTOs for list endpoints
- normalize route parameter naming

### Priority 4 — Follow-on normalization

- company dedup strategy
- lead provenance fields
- application next-step consolidation into action items
- encrypt MFA secrets at rest
- evaluate subscription/address extraction
- evaluate soft-delete/archive patterns

---

## 8. Items That Are Blocking Before Real Users or Persistent Environments

The following should be treated as blockers:

- no migration framework
- bootstrap schema mutation at startup
- duplicate-application risk
- underconstrained core ownership/state fields
- invalid enum-like values allowed in the DB
- ambiguous foreign-key deletion behavior
- incorrectly modeled junction tables

These are the issues most likely to create expensive future cleanup if left unresolved.

---

## 9. Constraints for the Planning Agent

The next planning phase should assume:

- Schema v2 is intentionally breaking and should be designed as a coordinated cleanup effort
- backend-only changes should be separated from API-breaking changes that require frontend coordination
- the application status split is the most complex single data-model change
- API contract regeneration must be included after schema/API changes
- bootstrap logic must stop acting as migration infrastructure
- any local data preservation or reset strategy should be treated explicitly in development workflows

The planning agent should also distinguish:

- changes that can land backend-only
- changes that require synchronized frontend updates
- changes that are safe to phase later

---

## 10. Out of Scope

The following are intentionally out of scope for this audit unless they become necessary to support the schema corrections above:

- broad performance tuning unrelated to schema correctness
- authorization redesign beyond fields needed for data ownership/provenance
- infrastructure/deployment topology
- ETL redesign outside the user-facing data model
- broad product roadmap changes
- polished UX changes unrelated to API contract cleanup

---

## 11. Confidence

Confidence is high.

The findings in this audit are structural and implementation-relevant. They reflect consistent patterns of under-enforcement, schema drift risk, contract inconsistency, and normalization gaps that are best addressed before migrations and user data make them expensive to unwind.

---

## 12. Planning Handoff Summary

The implementation-planning phase should start from this assumption:

Baldin needs a deliberate Schema v2 program, not incremental patching of the current schema.
