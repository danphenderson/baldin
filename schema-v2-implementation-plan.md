# Schema v2 Implementation Plan

Source of truth: [`baldin-schema-v2-audit-handoff.md`](baldin-schema-v2-audit-handoff.md)

---

## 1. Design Decisions (Finalized)

All six gating decisions have been resolved. No outstanding blockers for dispatch.

### DD-1: Lead deletion semantics for Application

**Decision:** `RESTRICT` — lead deletion is blocked while any application references the lead. Prevents accidental data loss; forces explicit cleanup.

### DD-2: Application history storage

**Decision:** Create a dedicated `application_status_history` table in Schema v2. Migrate existing inline JSONB `status_history` data into the new table during the status split (S-1.2). Drop the `status_history` JSONB column after migration. This gives queryable audit history from the start rather than deferring it.

### DD-3: Company dedup strategy

**Decision:** Canonical-name uniqueness using `lower(trim(name))` as a unique index. No full normalization scope creep.

### DD-4: Structured arrays for all list-like profile fields

**Decision:** Convert all four fields to `ARRAY(Text)`:
- `Education.activities` — currently JSON → `ARRAY(Text)`
- `Education.achievements` — currently JSON → `ARRAY(Text)`
- `Skill.subskills` — currently comma-delimited text → `ARRAY(Text)`
- `Experience.projects` — currently comma-delimited text → `ARRAY(Text)`

Pydantic schemas updated to match. Migration parses comma-delimited text into arrays for existing data.

### DD-5: Contact uniqueness

**Decision:** Yes — add `UniqueConstraint("user_id", "email")` on `contacts` to prevent duplicate contact entries per user.

### DD-6: API version prefix

**Decision:** `/api/v1/` — conventional, leaves room for non-API paths.

---

## 2. Phase Structure

```
Phase 0  Foundation (Alembic + bootstrap cleanup)
   │
   ▼
Phase 1  Backend-only integrity corrections (no API-breaking changes)
   │
   ▼
Phase 2  Backend structural cleanup (no API-breaking changes)
   │
   ▼
Phase 3  API contract changes (frontend coordination required)
   │
   ▼
Phase 4  Deferred normalization (post-v2, tracked but not scheduled)
```

Phases 0–2 are backend-only. Phase 3 is the API-breaking boundary requiring frontend coordination. Phase 4 is explicitly deferred.

---

## 3. Migration Strategy

### 3.1 Alembic bootstrap

| Step | Detail |
|------|--------|
| Initialize Alembic | `alembic init -t async backend/alembic` configured against async SQLAlchemy engine |
| `env.py` | Import `models.Base.metadata`; reuse `core/db.py` engine config; support `--autogenerate` |
| `alembic.ini` | Place in `backend/`; read `DATABASE_URL` from env |
| Initial migration | `alembic revision --autogenerate -m "baseline"` capturing current schema as-is |
| Stamp production | `alembic stamp head` on any existing database to mark baseline |

### 3.2 Bootstrap cleanup

| Current behavior | Target behavior |
|------------------|-----------------|
| `_create_and_sync_schema()` creates tables at startup | Startup runs `alembic upgrade head` or verifies head revision; does not mutate schema |
| `_sync_missing_columns()` adds missing columns | Removed; Alembic migrations own column additions |
| `_sync_missing_named_unique_constraints()` adds constraints | Removed; Alembic migrations own constraint additions |
| `_sync_named_enum_columns()` repairs enums | Removed; Alembic migrations own enum changes |
| `_drop_obsolete_tables()` drops legacy tables | One-time Alembic migration drops them; startup stops doing it |
| `drop_and_create_db_and_tables()` full reset | Replaced by `alembic downgrade base && alembic upgrade head` or retained as test-only utility |

### 3.3 Local developer workflow

| Scenario | Command |
|----------|---------|
| Apply pending migrations | `alembic upgrade head` (runs inside `web` container or host) |
| Create new migration | `alembic revision --autogenerate -m "description"` |
| Reset local DB (disposable) | `./scripts/reset_local_db.sh` updated to run `alembic upgrade head` after schema drop |
| Test DB for pytest | Keep `drop_and_create_db_and_tables()` as test-only; it uses metadata.create_all for speed, but is not the production path |

### 3.4 Migration authoring rules

- Every Schema v2 change lands as an Alembic migration with both `upgrade()` and `downgrade()`.
- Data migrations (e.g., status column split) use separate migration files from DDL changes.
- Enum mutations use raw SQL `ALTER TYPE ... ADD VALUE` or column-swap patterns (Postgres enums cannot remove values).
- Each migration is independently testable: `upgrade` then `downgrade` must round-trip without error.

---

## 4. Implementation Stories

### Phase 0 — Foundation

#### S-0.1: Initialize Alembic

| Field | Value |
|-------|-------|
| **Owner** | Baldin Lead Full-Stack Architect |
| **Depends on** | — (all DD decisions finalized) |
| **Files** | `backend/alembic.ini`, `backend/alembic/` (env.py, script.py.mako, versions/) |
| **Complexity** | Low |
| **Risk** | Low — additive; does not change runtime behavior |
| **Acceptance** | `alembic upgrade head` succeeds against a fresh DB; `alembic current` reports head |

#### S-0.2: Baseline migration

| Field | Value |
|-------|-------|
| **Owner** | Baldin Lead Full-Stack Architect |
| **Depends on** | S-0.1 |
| **Files** | `backend/alembic/versions/0001_baseline.py` |
| **Complexity** | Low |
| **Risk** | Low — captures current schema; no behavior change |
| **Acceptance** | Fresh DB: `alembic upgrade head` produces identical schema to current `create_all`. Existing DB: `alembic stamp head` succeeds. |

#### S-0.3: Remove bootstrap schema mutation

| Field | Value |
|-------|-------|
| **Owner** | Baldin Lead Full-Stack Architect |
| **Depends on** | S-0.2 |
| **Files** | `backend/app/core/db.py`, `backend/app/main.py` |
| **Complexity** | Medium |
| **Risk** | Medium — any missed startup dependency breaks boot |
| **Acceptance** | `docker-compose up --build` boots cleanly with migrations as the only schema path. `_create_and_sync_schema`, `_sync_missing_columns`, `_sync_missing_named_unique_constraints`, `_sync_named_enum_columns`, `_drop_obsolete_tables` are removed or gated behind an explicit `LEGACY_BOOTSTRAP` flag for transition. |
| **Smoke check** | Stack boots; existing tests pass against test DB (test path may retain `create_all` for speed). |

#### S-0.4: Drop legacy tables via migration

| Field | Value |
|-------|-------|
| **Owner** | Baldin Lead Full-Stack Architect |
| **Depends on** | S-0.2 |
| **Files** | `backend/alembic/versions/0002_drop_legacy_tables.py` |
| **Complexity** | Low |
| **Risk** | Low — tables already dropped at startup; migration makes it durable |
| **Acceptance** | Migration drops `resumes`, `cover_letters`, `resumes_x_applications`, `cover_letters_x_applications` with CASCADE. Downgrade recreates them (empty). |

---

### Phase 1 — Highest-Risk Integrity Corrections (Backend-Only)

All Phase 1 changes land as Alembic migrations. No API route changes. No frontend coordination.

#### S-1.1: Application unique constraint `(user_id, lead_id)`

| Field | Value |
|-------|-------|
| **Owner** | Baldin Backend Agent |
| **Depends on** | S-0.3 |
| **Files** | `backend/app/models.py`, migration file |
| **Complexity** | Low |
| **Risk** | Medium — existing duplicate rows must be resolved before constraint applies |
| **Acceptance** | Migration adds `UniqueConstraint("user_id", "lead_id")`. Migration includes a pre-check/data-fix step for any existing duplicates (keep most recent, archive or delete others). Model updated with `__table_args__`. |

#### S-1.2: Application status split — `stage` + `outcome`

| Field | Value |
|-------|-------|
| **Owner** | Baldin Backend Agent |
| **Depends on** | S-1.1 |
| **Files** | `backend/app/models.py`, `backend/app/schemas.py`, `backend/app/api/routes/applications.py`, migration file(s) |
| **Complexity** | High |
| **Risk** | High — most complex single change; touches model, schemas, route logic, data migration, and new history table (per DD-2) |

**Migration sub-steps (separate migration files):**

1. **DDL migration:** Add `stage` column (`ApplicationStage`, non-null, server_default=`REGISTERED`), add `outcome` column (`ApplicationOutcome`, nullable). Add CHECK constraint: `outcome IS NULL OR stage IS NOT NULL`. Create `application_status_history` table with columns: `id` (UUID PK), `application_id` (FK → applications, non-null, ondelete CASCADE), `stage` (ApplicationStage, non-null), `outcome` (ApplicationOutcome, nullable), `changed_by_user_id` (FK → users, nullable, ondelete SET NULL), `changed_at` (TIMESTAMP WITH TIME ZONE, server_default=now()), `note` (Text, nullable). Add index on `(application_id, changed_at)`.
2. **Data migration:** Populate `stage` and `outcome` from existing `status` column. ETL existing `status_history` JSONB array entries into `application_status_history` rows, mapping each entry's status to `stage`/`outcome` and timestamp to `changed_at`.
3. **DDL migration:** Drop `status_history` JSONB column. Drop old `status` column. Drop old `applicationstatus` Postgres enum type.

**New model:** `ApplicationStatusHistory` — mapped class (not inheriting `Base` audit columns; has its own `id` + `changed_at`). ORM relationship: `Application.status_history` → `relationship("ApplicationStatusHistory", back_populates=..., order_by=changed_at)`.

**Acceptance:**
- `Application.stage` is non-null `ApplicationStage` enum.
- `Application.outcome` is nullable `ApplicationOutcome` enum.
- `application_status_history` table exists with FK to applications and index on `(application_id, changed_at)`.
- Open applications: `outcome IS NULL`.
- Closed applications: `outcome IS NOT NULL`, `stage` retains last meaningful value.
- Existing JSONB history entries migrated to `application_status_history` rows.
- Route logic updated to use `stage`/`outcome` instead of `status`.
- Pydantic schemas updated; API response shape changes are backend-internal at this point (read models shift, but the API route paths and methods stay the same — frontend coordination deferred to Phase 3).

**Risk mitigation:** Write the data migration with explicit mapping. Test against seeded data before applying to shared environments. Verify JSONB→table ETL preserves entry count.

#### S-1.3: Application non-null ownership fields

| Field | Value |
|-------|-------|
| **Owner** | Baldin Backend Agent |
| **Depends on** | S-1.1 |
| **Files** | `backend/app/models.py`, migration file |
| **Complexity** | Low |
| **Risk** | Low–Medium — must verify no existing rows have NULL user_id |
| **Acceptance** | `user_id` is `nullable=False` with `ondelete=CASCADE`. Migration includes data check. |

#### S-1.4: Application `lead_id` FK explicit delete behavior

| Field | Value |
|-------|-------|
| **Owner** | Baldin Backend Agent |
| **Depends on** | S-0.3 |
| **Files** | `backend/app/models.py`, migration file |
| **Complexity** | Low |
| **Risk** | Low |
| **Acceptance** | FK includes explicit `ondelete="RESTRICT"`. |

#### S-1.5: DB-enforced enums for bare-string domain fields

| Field | Value |
|-------|-------|
| **Owner** | Baldin Backend Agent |
| **Depends on** | S-0.3 |
| **Files** | `backend/app/models.py`, migration file(s) |
| **Complexity** | Medium |
| **Risk** | Medium — existing data must be validated before adding CHECK/enum constraints |

**Target columns:**

| Table | Column | Strategy |
|-------|--------|----------|
| `documents` | `kind` | CHECK constraint against known kinds |
| `documents` | `status` | CHECK constraint |
| `document_shares` | `role` | CHECK (`viewer`, `editor`) |
| `connections` | `status` | CHECK (`pending`, `accepted`, `declined`, `blocked`) |
| `action_items` | `status` | CHECK constraint |
| `action_items` | `kind` | CHECK constraint |
| `action_items` | `priority` | CHECK constraint |
| `orchestration_events` | `status` | CHECK constraint |
| `conversations` | `type` | CHECK (`direct`, `group`) |
| `conversation_participants` | `role` | CHECK constraint |
| `document_versions` | `content_format` | CHECK (`plain_text`, `tiptap_json`) |

**Acceptance:** Each migration validates existing data, then adds constraint. Downgrade drops constraint.

#### S-1.6: FK nullability and `ondelete` audit pass

| Field | Value |
|-------|-------|
| **Owner** | Baldin Backend Agent |
| **Depends on** | S-0.3 |
| **Files** | `backend/app/models.py`, migration file(s) |
| **Complexity** | Medium |
| **Risk** | Medium — broad surface area; batch into logical groups |

**Policy to apply:**

| Relationship category | `nullable` | `ondelete` |
|-----------------------|------------|------------|
| User-owned profile children (skills, experiences, education, certificates, contacts) | `False` | `CASCADE` |
| User-owned documents, applications | `False` | `CASCADE` |
| Application → Lead | `False` | `RESTRICT` |
| LeadComment → Lead | `False` | `CASCADE` |
| LeadComment → User | `False` | `CASCADE` |
| ActionItem → target FKs | per polymorphic pattern | `CASCADE` (item dies with target) |
| DocumentVersion → Document | `False` | `CASCADE` |
| DocumentShare → Document | `False` | `CASCADE` |
| DocumentActivity → Document | `False` | `CASCADE` |
| DocumentEmbedding → Document | `False` | `CASCADE` |
| DocumentXApplication → Application, Document | `False` | `CASCADE` |
| ConversationParticipant → Conversation, User | `False` | `CASCADE` |
| Message → Conversation | `False` | `CASCADE` |
| Message → User (author) | `False` | `SET NULL` or `RESTRICT` (preserve messages if user deactivated) |
| Connection → requester/addressee | `False` | `CASCADE` |
| CrawlerRun → CrawlerPipeline | `False` | `CASCADE` |
| OrchestrationEvent → OrchestrationPipeline | `False` | `CASCADE` |

**Acceptance:** Every FK in `models.py` has explicit `nullable` and `ondelete`. Migration applies changes in groups (profile tables, application family, document family, messaging family, orchestration family).

---

### Phase 2 — Structural Cleanup (Backend-Only)

#### S-2.1: Fix junction table inheritance

| Field | Value |
|-------|-------|
| **Owner** | Baldin Backend Agent |
| **Depends on** | S-0.3, S-1.6 |
| **Files** | `backend/app/models.py`, migration file(s) |
| **Complexity** | Medium |
| **Risk** | Medium — must handle existing data with `id`, `created_at`, `updated_at` columns |

**Target tables:**

| Table | Current | Target |
|-------|---------|--------|
| `leads_x_companies` | Inherits `Base` (has id, created_at, updated_at) with composite PK override | Plain `Table(...)` or minimal mapped class without Base inheritance |
| `documents_x_applications` | Inherits `Base` with composite PK override | Same treatment; preserve `version_id` FK |

**Migration:** Drop surrogate columns (`id`, `created_at`, `updated_at`) from junction tables. Rewrite primary key as composite `(lead_id, company_id)` / `(application_id, document_id)`.

**Acceptance:** Junction tables have no surrogate `id`, no `created_at`/`updated_at`. ORM relationships still function. Existing associations preserved.

#### S-2.2: Correct Lead → Application cardinality

| Field | Value |
|-------|-------|
| **Owner** | Baldin Backend Agent |
| **Depends on** | S-1.1 |
| **Files** | `backend/app/models.py` |
| **Complexity** | Low |
| **Risk** | Low — ORM-level only; no DDL change |
| **Acceptance** | `Lead.applications` relationship is `relationship("Application", back_populates=..., uselist=True)`. No `uselist=False` on the lead side. Relationship name is plural. |

#### S-2.3: Timezone-aware timestamps with server defaults

| Field | Value |
|-------|-------|
| **Owner** | Baldin Backend Agent |
| **Depends on** | S-0.3 |
| **Files** | `backend/app/models.py`, migration file |
| **Complexity** | Medium |
| **Risk** | Medium — column type change on every table; existing data preserved via `ALTER COLUMN ... TYPE ... USING` |

**Changes:**
- `Base.created_at`: `DateTime(timezone=True)`, `server_default=func.now()`
- `Base.updated_at`: `DateTime(timezone=True)`, `server_default=func.now()`, `onupdate=func.now()` or trigger-based
- All other datetime columns in models: same treatment

**Acceptance:** All timestamp columns are `TIMESTAMP WITH TIME ZONE`. `created_at` has `DEFAULT now()` in DDL. `updated_at` has server-visible update mechanism. Existing timestamps interpreted as UTC where naive.

#### S-2.4: Profile table cleanup

| Field | Value |
|-------|-------|
| **Owner** | Baldin Backend Agent |
| **Depends on** | S-1.6 |
| **Files** | `backend/app/models.py`, `backend/app/schemas.py`, migration file(s) |
| **Complexity** | Medium |
| **Risk** | Low–Medium |

**Changes:**

| Change | Detail |
|--------|--------|
| `Education.gradePoint` → `grade_point` | Column rename in DB and model |
| `Education.activities`, `Education.achievements` | Convert from JSON to `ARRAY(Text)` per DD-4 |
| `Skill.subskills` | Parse comma-delimited text → `ARRAY(Text)` per DD-4; update model and Pydantic schema |
| `Experience.projects` | Parse comma-delimited text → `ARRAY(Text)` per DD-4; update model and Pydantic schema |
| `Contact` uniqueness | Add `UniqueConstraint("user_id", "email")` per DD-5 |
| Verify all profile `user_id` FKs | Already covered by S-1.6 |

**Acceptance:** Schema matches snake_case naming. All four list-like profile fields are `ARRAY(Text)` in both model and schema layers. Contact dedup constraint in place. Migration parses existing comma-delimited text data into arrays.

#### S-2.5: Company dedup constraint

| Field | Value |
|-------|-------|
| **Owner** | Baldin Backend Agent |
| **Depends on** | S-0.3 |
| **Files** | `backend/app/models.py`, migration file |
| **Complexity** | Low |
| **Risk** | Medium — must deduplicate existing company records before constraint applies |
| **Acceptance** | Unique index on `lower(trim(name))`. Migration merges duplicate companies (reassign lead associations to winner). |

#### S-2.6: High-value indexes

| Field | Value |
|-------|-------|
| **Owner** | Baldin Backend Agent |
| **Depends on** | S-1.2, S-1.5, S-1.6 |
| **Files** | `backend/app/models.py`, migration file |
| **Complexity** | Low |
| **Risk** | Low — additive only |

**Candidate indexes:**

| Table | Columns | Purpose |
|-------|---------|---------|
| `applications` | `(user_id, stage)` | Board view filtering |
| `applications` | `(user_id, outcome)` | Outcome filtering |
| `documents` | `(user_id, kind, status)` | Document list/filter |
| `action_items` | `(user_id, status)` | Command center |
| `action_items` | `(user_id, due_date)` | Due-date queries |
| `lead_comments` | `(lead_id, created_at)` | Timeline ordering |
| `orchestration_events` | `(pipeline_id, created_at)` | Event stream ordering |
| `connections` | `(requester_id, status)` | Connection list |
| `connections` | `(addressee_id, status)` | Connection list |

**Acceptance:** Indexes present in schema via migration. Explain plans for core list queries show index usage.

#### S-2.7: ActionItem FK and query-path hardening

| Field | Value |
|-------|-------|
| **Owner** | Baldin Backend Agent |
| **Depends on** | S-1.5, S-1.6, S-2.6 |
| **Files** | `backend/app/models.py`, migration file(s) |
| **Complexity** | Low |
| **Risk** | Low |
| **Acceptance** | Target FKs have explicit `ondelete`. Domain fields (status, kind, priority) are DB-constrained (covered by S-1.5). Indexes for user/status and user/due_date in place (covered by S-2.6). |

#### S-2.8: Messaging and connection constraint tightening

| Field | Value |
|-------|-------|
| **Owner** | Baldin Backend Agent |
| **Depends on** | S-1.5, S-1.6 |
| **Files** | `backend/app/models.py`, migration file(s) |
| **Complexity** | Low |
| **Risk** | Low |

**Changes:**
- `Connection`: existing `UniqueConstraint(requester_id, addressee_id)` prevents exact duplicates. Evaluate if bidirectional dedup is needed (CHECK: `requester_id < addressee_id` or application-layer guard). Domain fields constrained by S-1.5.
- `Conversation.type`, `ConversationParticipant.role`: constrained by S-1.5.

**Acceptance:** Domain fields DB-constrained. Bidirectional connection dedup strategy documented and implemented if product-needed.

---

### Phase 3 — API Contract Changes (Frontend Coordination Required)

**Prerequisite:** All Phase 1–2 backend changes are merged and stable. Contract regeneration follows each sub-story.

#### S-3.1: Add `/api/v1/` prefix

| Field | Value |
|-------|-------|
| **Owner** | Baldin Lead Full-Stack Architect |
| **Depends on** | Phases 0–2 complete |
| **Files** | `backend/app/api/api.py`, `backend/app/main.py`, `frontend/src/service/**`, `frontend/src/config/**` |
| **Complexity** | Medium |
| **Risk** | Medium — every frontend service call path changes |

**Implementation:**
- Wrap all routers in `APIRouter(prefix="/api/v1")` in `api.py`.
- Update `main.py` app mount.
- Regenerate OpenAPI spec: `SCHEMA_UPDATE_FORCE=1 ./scripts/update_frontend_schemas.sh`.
- Update frontend base URL config to include `/api/v1`.
- Verify all frontend service calls resolve against new paths.

**Acceptance:** All API requests route through `/api/v1/`. Frontend builds and smoke-tests pass. OpenAPI spec and `schema.d.ts` regenerated.

#### S-3.2: Route naming normalization

| Field | Value |
|-------|-------|
| **Owner** | Baldin Lead Full-Stack Architect |
| **Depends on** | S-3.1 |
| **Files** | `backend/app/api/api.py`, route modules, frontend service files |
| **Complexity** | Medium |
| **Risk** | Medium — broad surface; all frontend calls must update |

**Normalization targets:**

| Current | Target | Change type |
|---------|--------|-------------|
| `/data_orchestration` | `/orchestration-pipelines` | Underscore → hyphen + clearer name |
| `/certificate` | `/certificates` | Singular → plural |
| `/extractor` | `/extractors` | Singular → plural |
| `/education` | `/education` | Keep (uncountable noun) |
| `/db-management` | `/db-management` | Keep or remove from production surface |
| `/auth/mfa` | `/auth/mfa` | Keep |

**Acceptance:** All route prefixes use plural-hyphenated form where applicable. Frontend service paths updated. Contract regenerated.

#### S-3.3: Standardize `PATCH` for partial updates

| Field | Value |
|-------|-------|
| **Owner** | Baldin Lead Full-Stack Architect |
| **Depends on** | S-3.1 |
| **Files** | `backend/app/api/routes/companies.py` (PUT → PATCH), others as needed |
| **Complexity** | Low |
| **Risk** | Low — method change only; bodies unchanged |

**Known target:** `PUT /companies/{id}` → `PATCH /companies/{id}` (update schema is partial).

**Acceptance:** No `PUT` routes remain unless they are true full-replacement semantics. Contract regenerated.

#### S-3.4: Standardize pagination envelope

| Field | Value |
|-------|-------|
| **Owner** | Baldin Lead Full-Stack Architect |
| **Depends on** | S-3.1 |
| **Files** | Route modules with list endpoints, `backend/app/schemas.py`, frontend list-fetching services |
| **Complexity** | Medium |
| **Risk** | Medium — every paginated list endpoint and its frontend consumer changes |

**Target shape:**
```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "page_size": 20
}
```

**Implementation:** Create a generic `PaginatedResponse[T]` Pydantic model. Refactor all list endpoints to return this envelope. Update frontend service parsing.

**Acceptance:** All list endpoints return the standard envelope. Frontend list rendering works end-to-end. Contract regenerated.

#### S-3.5: Application response shape update (stage + outcome)

| Field | Value |
|-------|-------|
| **Owner** | Baldin Lead Full-Stack Architect + Baldin Frontend Agent |
| **Depends on** | S-1.2 backend complete, S-3.1 |
| **Files** | `backend/app/schemas.py`, `frontend/src/page/applications/**`, `frontend/src/service/applications.tsx` |
| **Complexity** | Medium |
| **Risk** | Medium — frontend board views depend on status semantics |

**Changes:**
- API read models expose `stage` and `outcome` instead of `status`.
- API create/update models accept `stage` and `outcome`.
- Frontend board view, queue view, detail page updated to consume new fields.
- Frontend filtering/grouping logic updated for stage + outcome.

**Acceptance:** Frontend application views render correctly with stage/outcome. No references to old `status` field in frontend code. Contract regenerated.

#### S-3.6: Summary DTOs for list endpoints

| Field | Value |
|-------|-------|
| **Owner** | Baldin Lead Full-Stack Architect |
| **Depends on** | S-3.4 |
| **Files** | `backend/app/schemas.py`, route modules, frontend services |
| **Complexity** | Medium |
| **Risk** | Low — reduces response size; frontend must consume leaner shape |

**High-value targets:** Application list, Document list, Lead list — avoid returning full nested objects when summary fields suffice.

**Acceptance:** List endpoints return summary DTOs. Detail endpoints still return full read models. Frontend list views work with summary shape. Contract regenerated.

#### S-3.7: Normalize route parameter naming

| Field | Value |
|-------|-------|
| **Owner** | Baldin Lead Full-Stack Architect |
| **Depends on** | S-3.1 |
| **Files** | Route modules, frontend service files |
| **Complexity** | Low |
| **Risk** | Low |

**Acceptance:** All path parameters use consistent naming (e.g., `{id}` for primary resource, `{resource_id}` for nested). Contract regenerated.

---

### Phase 4 — Deferred Normalization (Not Scheduled)

These items are tracked for future planning. They are explicitly out of scope for Schema v2.

| Item | Audit ref | Why deferred |
|------|-----------|-------------|
| Encrypt `mfa_secret` at rest | §5.17 | Important but independent of schema shape |
| Subscription/address extraction from `User` | §5.17 | Low urgency; no external consumer yet |
| Soft-delete/archive patterns | §5.17 | Design decision larger than schema v2 |
| Application next-step consolidation into ActionItems | §6.2 | Product design needed first |
| Lead provenance fields | §5.12 | Deferred alongside company dedup |

*Note: Application status history (§5.5) is **not** deferred — resolved in S-1.2 per DD-2.*

---

## 5. Dependency Graph

All design decisions (DD-1–DD-6) are finalized. No decision gates remain.

```
S-0.1 ─► S-0.2 ─┬► S-0.3 ─┬► S-1.1 ─► S-1.2 (includes history table per DD-2)
                 │         │         ├► S-1.3
                 └► S-0.4  │         └► S-2.2
                           │
                           ├► S-1.4
                           ├► S-1.5
                           ├► S-1.6
                           │
                           ├► S-2.1 (needs S-1.6)
                           ├► S-2.3
                           ├► S-2.4 (needs S-1.6)
                           ├► S-2.5
                           ├► S-2.6 (needs S-1.2, S-1.5, S-1.6)
                           ├► S-2.7 (needs S-1.5, S-1.6, S-2.6)
                           └► S-2.8 (needs S-1.5, S-1.6)

Phases 1–2 complete ──► S-3.1 ──┬► S-3.2
                                ├► S-3.3
                                ├► S-3.4 ──► S-3.6
                                ├► S-3.5
                                └► S-3.7
```

---

## 6. Parallel Execution Windows

### Within Phase 0
- S-0.1 → S-0.2 → S-0.3 are strictly sequential.
- S-0.4 can run in parallel with S-0.3 (depends only on S-0.2).

### Within Phase 1
Once S-0.3 is complete:
- **Parallel track A:** S-1.1 → S-1.2 → S-1.3 (Application hardening chain)
- **Parallel track B:** S-1.4 (Application lead FK — independent)
- **Parallel track C:** S-1.5 (enum constraints — independent of Application work)
- **Parallel track D:** S-1.6 (FK audit — independent but broad)

Tracks A and B touch `Application` in `models.py` — **serialize these if file-conflict risk is high**.

### Within Phase 2
Once Phase 1 is merged:
- S-2.1, S-2.2, S-2.3, S-2.4, S-2.5 can run in parallel (different model families).
- S-2.6 depends on S-1.2, S-1.5, S-1.6 — runs after those are stable.
- S-2.7 and S-2.8 run after S-2.6 and S-1.5/S-1.6.

### Phase 3
All Phase 3 stories depend on S-3.1 (`/api/v1/` prefix). After that:
- S-3.2, S-3.3, S-3.5, S-3.7 can run in parallel.
- S-3.4 → S-3.6 are sequential (summary DTOs depend on pagination envelope).

---

## 7. Frontend / API Coordination

### Phase 1–2: No frontend changes

Backend schema and model changes in Phases 1–2 are internal. API response shapes may shift slightly (e.g., `status` → `stage` + `outcome`), but the frontend should **not** be updated until Phase 3 stabilizes the full API contract.

**Exception:** If S-1.2 (status split) must ship with frontend support before Phase 3 begins, create a temporary backward-compatible shim in the backend that exposes both `status` (computed) and `stage`/`outcome` fields. Remove the shim in S-3.5.

### Phase 3: Coordinated frontend update

| Step | Action |
|------|--------|
| 1 | Backend completes Phase 3 API changes on a feature branch |
| 2 | Run `SCHEMA_UPDATE_FORCE=1 ./scripts/update_frontend_schemas.sh` to regenerate `openapi.json` and `frontend/src/schema.d.ts` |
| 3 | Baldin Frontend Agent updates all service files, page components, and type references against new schema |
| 4 | Frontend build validation: `cd frontend && VITE_API_URL=https://api.example.com npm run build` |
| 5 | End-to-end smoke check with `docker-compose up --build` |
| 6 | Merge backend + frontend changes together to avoid breaking the main branch |

### Contract regeneration checkpoints

After **every** Phase 3 story:
```bash
SCHEMA_UPDATE_FORCE=1 ./scripts/update_frontend_schemas.sh
```
Verify `openapi.json` and `frontend/src/schema.d.ts` changed as expected. Commit regenerated artifacts with the backend change.

---

## 8. Validation Plan

| Phase | Validation |
|-------|-----------|
| Phase 0 | `alembic upgrade head` on fresh DB matches current schema. `docker-compose up --build` boots without bootstrap schema mutation. Existing backend tests pass. |
| Phase 1 | Each migration: `upgrade` + `downgrade` round-trips without error. Backend tests pass after all Phase 1 migrations applied. Seeded/demo data survives migration. |
| Phase 2 | Same as Phase 1. ORM relationships functional — spot-check via route smoke tests. |
| Phase 3 | Contract regenerated after each story. Frontend production build succeeds. `docker-compose up --build` end-to-end smoke check. Application board, document list, lead list render correctly. |

---

## 9. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Existing data violates new constraints (duplicates, NULLs) | High | Medium | Every constraint migration includes a data-fix step that runs before the constraint is applied |
| Application status split breaks frontend before Phase 3 | Medium | High | Backward-compatible shim option; or keep Phase 1–2 on a branch until Phase 3 is ready |
| Enum removal in Postgres (cannot drop values) | Medium | Low | Use column-swap migration pattern: add new column, migrate data, drop old column, rename |
| Junction table column removal order-of-operations | Low | Medium | Test migration against a seeded database; verify ORM relationships after |
| Phase 3 frontend update scope is larger than expected | Medium | Medium | Use contract regen early to measure frontend diff size; scope frontend work per-route-module |
| Alembic autogenerate misses or misgenerates | Medium | Low | Review every generated migration manually; test upgrade+downgrade |

---

## 10. Story-Level Complexity and Effort Estimates

| Story | Complexity | Relative Effort |
|-------|-----------|----------------|
| S-0.1 Initialize Alembic | Low | 1 |
| S-0.2 Baseline migration | Low | 1 |
| S-0.3 Remove bootstrap mutation | Medium | 3 |
| S-0.4 Drop legacy tables migration | Low | 1 |
| S-1.1 Application unique constraint | Low | 2 |
| S-1.2 Application status split + history table | **High** | **10** |
| S-1.3 Application non-null ownership | Low | 1 |
| S-1.4 Application lead FK delete behavior | Low | 1 |
| S-1.5 DB enum constraints | Medium | 4 |
| S-1.6 FK nullability/ondelete pass | Medium | 5 |
| S-2.1 Junction table fix | Medium | 3 |
| S-2.2 Lead→Application cardinality | Low | 1 |
| S-2.3 Timezone timestamps | Medium | 3 |
| S-2.4 Profile table cleanup | Medium | 3 |
| S-2.5 Company dedup | Low | 2 |
| S-2.6 High-value indexes | Low | 2 |
| S-2.7 ActionItem hardening | Low | 1 |
| S-2.8 Messaging constraints | Low | 1 |
| S-3.1 API version prefix | Medium | 3 |
| S-3.2 Route name normalization | Medium | 4 |
| S-3.3 PATCH standardization | Low | 1 |
| S-3.4 Pagination envelope | Medium | 4 |
| S-3.5 Application response shape | Medium | 3 |
| S-3.6 Summary DTOs | Medium | 3 |
| S-3.7 Parameter naming | Low | 1 |

---

## 11. Agent Ownership Summary

| Owner | Stories |
|-------|---------|
| **Baldin Lead Full-Stack Architect** | S-0.1, S-0.2, S-0.3, S-0.4, S-3.1, S-3.2, S-3.3, S-3.4, S-3.5, S-3.6, S-3.7 |
| **Baldin Backend Agent** | S-1.1, S-1.2, S-1.3, S-1.4, S-1.5, S-1.6, S-2.1, S-2.2, S-2.3, S-2.4, S-2.5, S-2.6, S-2.7, S-2.8 |
| **Baldin Frontend Agent** | S-3.5 (co-owner with Lead Architect for frontend view updates) |

---

## 12. Execution Start Checklist

Before dispatching any implementation work:

- [x] DD-1 through DD-6 decisions confirmed (RESTRICT, dedicated history table, canonical-name dedup, all-structured arrays, contact uniqueness, /api/v1/)
- [ ] Feature branch created for Schema v2 work
- [ ] Local stack boots cleanly (`docker-compose up --build`)
- [ ] Current backend tests green
- [ ] S-0.1 dispatched to Baldin Lead Full-Stack Architect
