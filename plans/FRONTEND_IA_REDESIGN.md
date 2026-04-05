# Frontend Information Architecture Redesign — Execution Plan

## Scope and Non-Goals

This ExecPlan governs the authenticated-app information architecture, route topology, and shell navigation for the current Baldin frontend.

It covers:
- Drawer grouping and hierarchy
- Group-level secondary navigation
- Route restructuring and redirects
- Migration of existing pages to new route locations
- Cleanup of dead navigation-related frontend code

It does **not** define the broader design-system program (foundation tokens, semantic text primitives, composition primitives, or raw `Typography` governance). Those concerns require a separate plan.

### V1 Implementation Boundary

- V1 introduces **group-level** navigation only; it does not decompose every page-local section into its own route.
- `ProfilePage` keeps its current internal `Tabs` for Skills, Experiences, Education, Certificates, and Contacts.
- The Identity secondary nav only distinguishes `Profile` and `Documents` in V1.
- Future detail routes such as `/leads/:id`, `/applications/:id`, and `/workflows/:id` are explicitly deferred from this implementation pass.

## 0. Backend Validation Summary

> Added after validating the proposed IA against the full backend API surface
> (`openapi.json`, all 15 route modules, SQLAlchemy models, Pydantic schemas).

### Methodology

Every backend route was enumerated from the generated `openapi.json` (100+ endpoints across 15 routers). Each model's ownership (`user_id` FK), relationship cardinality, and query scoping in the route handlers was verified by reading the source. Frontend service files were cross-referenced against the backend route inventory to identify phantoms.

### Confirmed Alignments

| Frontend Proposal | Backend Support | Notes |
|---|---|---|
| Leads CRUD + extract + seed | ✅ `POST/GET/PATCH/DELETE /leads`, `POST /leads/extract`, `POST /leads/seed` | Fully aligned |
| Companies CRUD + extract | ✅ `POST/GET/PUT/DELETE /companies`, `POST /companies/extract` | Fully aligned |
| Companies → Leads sub-resource | ✅ `GET /companies/{id}/leads` | Backend supports the "expand to show leads" UX |
| Applications CRUD + pipeline | ✅ `POST/GET/PATCH/DELETE /applications` | Fully aligned; `ApplicationRead` eager-loads lead + companies + user |
| Application → Resumes, Cover Letters | ✅ `GET/POST /applications/{id}/resumes`, `GET/POST /applications/{id}/cover_letters` | Sub-resource attach pattern exists |
| Cover letter generation from application | ✅ `POST /applications/{id}/cover_letters/generate?template_id=` | Frontend `generatecoverLetter` matches exactly |
| Resumes CRUD + download | ✅ `POST/GET/PATCH/DELETE /resumes`, `GET /resumes/{id}/download` | Fully aligned |
| Cover Letters CRUD + download + generate | ✅ `POST/GET/PATCH/DELETE /cover_letters`, `GET /cover_letters/{id}/download`, `POST /cover_letters/generate` | Fully aligned |
| Profile (skills/experiences/education/certificates) | ✅ `GET /users/me/profile` returns `UserProfileRead` with nested skills, experiences, education, certificates | Aligned; see contacts note below |
| Contacts as separate resource | ✅ `GET/POST/PUT/DELETE /contacts`, `POST /contacts/extract`, `POST /contacts/seed` | Backend-supported but NOT included in `UserProfileRead` — fetched independently |
| Orchestration Pipelines + Events | ✅ `GET/POST/PUT/DELETE /data_orchestration/pipelines`, `GET/POST/PUT /data_orchestration/events` | Fully aligned |
| Extractors CRUD + run + examples | ✅ `GET/POST/PUT/DELETE /extractor`, `POST /extractor/{id}/run`, `GET/POST/DELETE /extractor/{id}/examples` | Fully aligned |
| Auth (login/logout/register) | ✅ `POST /auth/jwt/login`, `POST /auth/jwt/logout`, `POST /auth/register` | Fully aligned |
| DB Management (admin) | ✅ `GET /db-management/list-tables`, etc. | Backend exists; no frontend UI consumer — admin-only |

### Mismatches and Tensions

#### M1: `automation-tasks.tsx` — Phantom Service (No Backend)

The frontend ships `service/automation-tasks.tsx` with five endpoints (`GET /automation_tasks`, `GET /automation_tasks/{id}`, `POST /automation_tasks/discover`, `POST /automation_tasks/enrich`, `POST /automation_tasks/linkedin-easy-apply`). **None of these exist in the backend.** There is no `automation_tasks` router registered in `api.py`, no model, no schema.

The types in this file are hand-rolled (`Record<string, unknown>`) — not generated from `schema.d.ts`.

**Impact on plan:** The original plan's Phase 7 / Open Question 3 asked whether automation tasks should get a UI surface. Answer: **they cannot** — there is nothing to call. The service file is dead code and should be removed in the cleanup phase. If an automation-tasks feature is desired in the future, it requires backend-first work: model, migration, router, schema generation, then frontend service and UI.

**Status:** 🚫 Blocked pending backend work. Dead code; mark for removal.

#### M2: `getLeadOrchestrationEvents` — Phantom Endpoint (No Backend Route)

`service/leads.tsx` exports `getLeadOrchestrationEvents(token, id)` calling `GET /leads/{id}/orchestration_events`. **This endpoint does not exist** in the backend leads router. There is no relationship between `Lead` and `OrchestrationEvent` in the data model — orchestration events belong to `OrchestrationPipeline`, which belongs to `User`, not to `Lead`.

The function is never imported or called anywhere in the frontend.

**Impact on plan:** The proposed IA does not depend on this endpoint. It is dead code. Mark for removal in Phase 7.

**Status:** 🚫 Dead code. No backend support, no frontend consumer.

#### M3: Leads and Companies Are NOT User-Scoped

The `Lead` and `Company` models have **no `user_id` column**. All authenticated users see all leads and companies. The backend route handlers do not filter by `user.id` for these resources — the only user reference is a log message during extraction.

All other domain entities (Application, Resume, CoverLetter, Skill, Experience, Education, Certificate, Contact, Extractor, OrchestrationPipeline) **are** user-scoped via `user_id` FK.

**Impact on plan:** The proposed IA groups Leads under "Pursue" and Companies under Leads. This grouping is valid from a UX-intent perspective, but the plan's Domain Model section should clarify that Leads and Companies are **shared/global entities** while everything else is user-owned. This has implications for:
- Dashboard metrics: lead/company counts are global, not personal
- Future multi-user scenarios: a user's "my leads" concept does not exist without backend changes
- The narrative around "Pursue" should acknowledge that leads are shared discovery resources, not personal property

**Status:** ⚠️ Frontend adaptation. Grouping is fine, but the plan must reflect the shared-entity nature and not imply user ownership.

#### M4: `UserProfileRead` Does Not Include Contacts or Documents

`GET /users/me/profile` returns `UserProfileRead` which includes `skills`, `experiences`, `education`, and `certificates` — but **NOT** `contacts`, `resumes`, or `cover_letters`.

The frontend Profile page fetches contacts separately via `GET /contacts/`. Documents (resumes, cover letters) have their own independent service calls.

**Impact on plan:** The proposed `/me` group aggregates Profile + Documents. This is purely a frontend navigation abstraction — it does NOT imply a single backend endpoint. The plan's Identity group is implemented by routing, not by a backend "identity bundle" endpoint. This is fine and correct, but should be stated explicitly to prevent future confusion about backend contract expectations.

**Status:** ✅ Supported with frontend adaptation. No backend changes needed; frontend already fetches contacts and documents independently.

#### M5: Application Uniqueness Constraint

`Application` has a unique constraint on `(lead_id, user_id)` — one application per lead per user. The frontend "Quick Apply" flow in the Leads page creates applications via `POST /applications/`.

**Impact on plan:** The constraints are already respected in the frontend. The plan's proposed UX does not change this flow, but the constraint should be documented for any future "re-apply" or "duplicate application" features.

**Status:** ✅ No plan changes needed. Noted for reference.

#### M6: `db-management.tsx` — Admin Service with No UI Surface

`service/db-management.tsx` wraps `GET /db-management/list-tables`, `GET /db-management/table-details/{table_name}`, `PATCH /db-management/users/{user_id}/purge`, `DELETE /db-management/users/{user_id}`. These exist in the backend but have **no frontend page or component consumer**.

**Impact on plan:** Not relevant to the IA redesign. This is an admin/dev-tools orphan. Can be cleaned up in Phase 7 alongside other dead code, or preserved intentionally as a dev utility.

**Status:** ℹ️ Out of scope for IA redesign. Optional cleanup.

### Revised Backend Ownership Model

```
GLOBAL (no user_id — shared across all authenticated users)
├── Lead
└── Company
    └── Lead ↔ Company (M:M via LeadXCompany)

USER-SCOPED (user_id FK — owned by authenticated user)
├── Application → Lead (FK) — unique per (lead_id, user_id)
│   ├── Resume ↔ Application (M:M via ResumeXApplication)
│   └── CoverLetter ↔ Application (M:M via CoverLetterXApplication)
├── Resume
├── CoverLetter
├── Skill
├── Experience
├── Education
├── Certificate
├── Contact
├── Extractor → ExtractorExample
└── OrchestrationPipeline → OrchestrationEvent
```

---

## 1. Audit Summary

### Current Structure

The authenticated app shell (`AppLayout`) renders a collapsible permanent sidebar drawer with seven flat top-level nav items:

```
Dashboard    /
Leads        /leads
Applications /applications
Documents    /documents
Companies    /companies
Profile      /profile
Workflows    /workflows
```

All seven routes are direct children of a single `<Route element={<AppLayout />}>` wrapped by `UserRoute` (auth guard). There is no nested routing, no secondary navigation, and no sub-routes. The `ToolbarHeaderContext` drives a per-page title/subtitle in the sticky top `AppBar`, but there is no breadcrumb, tab bar, or contextual nav bar below it.

Additional observations:

- **Extractor page** exists at `page/extractor.tsx` with a service layer and modal components, but is not wired into `app-routes.tsx` or the drawer `navItems`. It uses the older `DataGrid` pattern and is visually inconsistent with the rest of the app.
- **Home page** (`page/home.tsx`) is a stub, never routed.
- The `common/header.tsx` component is an older navigation bar used only in `HomeLayout` (public terms page). It lists a different set of nav links and is not the canonical signed-in header.
- `public-layout.tsx` is defined but never used in any route.

### Current Page Responsibilities

| Page | What It Does | Domain It Spans |
|------|-------------|-----------------|
| Dashboard | Aggregates leads, applications, companies, profile completeness; quick-extract; quick-apply | Cross-cutting summary |
| Leads | CRUD + AI extraction + search/filter + "Quick Apply" (creates Application) | Leads, Companies (fetched for form), Applications |
| Applications | Kanban pipeline by status; detail dialogs; cover-letter generation; resume/CL attachment | Applications, Leads, Resumes, Cover Letters |
| Documents | Unified Resumes + Cover Letters grid with sort/filter/CRUD/download | Resumes, Cover Letters |
| Companies | CRUD + AI extraction + expand-to-see-leads; industry filter | Companies, Leads |
| Profile | Tabs: user info, Skills, Experiences, Education, Certificates, Contacts; skill extraction from resume | User, Skills, Experiences, Education, Certificates, Contacts |
| Workflows | Pipeline CRUD + event viewer; overview strip; trigger events | Orchestration Pipelines, Events |

### Domain Model (from backend — revised)

```
GLOBAL (shared entities)
├── Lead (no user_id)
└── Company (no user_id)
    └── Lead ↔ Company (M:M via LeadXCompany)

USER-SCOPED (user-owned entities)
├── Application → Lead (FK), unique per (lead_id, user_id)
│   ├── Resume ↔ Application (M:M)
│   └── CoverLetter ↔ Application (M:M)
├── Resume, CoverLetter (owned by user, also attachable to applications)
├── Skill, Experience, Education, Certificate, Contact (profile data)
├── Extractor → ExtractorExample
└── OrchestrationPipeline → OrchestrationEvent
```

Key relationships:
- **Lead ↔ Company** — many-to-many. Both are **global shared entities** (no `user_id`). A lead is discovered via a job URL; the company is extracted or associated as part of that lead. Companies exist independently but are *primarily discovered through leads*. All authenticated users see all leads and companies.
- **Application → Lead** — many-to-one from application to lead. An application is always created against a lead. Applications **are user-scoped** (`user_id` FK) with a unique constraint on `(lead_id, user_id)`.
- **Resume / CoverLetter → User** — owned by user. Also linked many-to-many to Application for attachment.
- **Skills, Experiences, Education, Certificates, Contacts** — all user-owned profile data. `UserProfileRead` includes skills, experiences, education, certificates but **not** contacts or documents — those are fetched via independent endpoints.
- **Extractors and OrchestrationPipelines** — user-scoped power-user tools.

---

## 2. Key IA Problems

### P1: Flat hierarchy does not reflect domain containment

All seven destinations sit at the same level in the drawer. The user has no navigational signal that Companies relate to Leads, that Documents relate to their Profile, or that Applications flow from Leads. Every resource looks equally important and equally independent.

### P2: Companies as a top-level destination is misleading

Companies are a *secondary entity*. They are almost always encountered through a lead (AI extraction or manual creation) or browsed to find leads. Making Companies a peer of Leads suggests they are an independent workflow entry point, which they are not. Users don't start their job search by creating companies—they create or extract leads, and companies appear as context.

> **Backend validation note:** Both Lead and Company are **global shared entities** (no `user_id`). This reinforces the point — companies are discovery-level context, not personal property. The "Pursue" grouping is a *user-intent* navigation frame, not a claim of ownership.

### P3: Documents are disconnected from identity

Resumes and Cover Letters belong to the user's professional identity. They are authored and maintained as part of building a profile, but their current position as a top-level "Documents" page has no navigational or conceptual relationship to Profile. A user building their identity (profile, skills, resume, cover letter) must jump between two unrelated nav items.

> **Backend validation note:** `GET /users/me/profile` does NOT include resumes, cover letters, or contacts. The proposed `/me` group is a **frontend navigation abstraction** layered over multiple independent backend endpoints (profile, contacts, resumes, cover letters). This is the correct architecture — no backend "identity bundle" endpoint is needed.

### P4: No visible user journey through the product

The flat nav provides no sense of progression. The core Baldin user journey is roughly:

1. **Build identity** — set up profile, skills, resume, cover letter
2. **Discover opportunities** — extract/browse leads (companies discovered alongside)
3. **Apply** — create applications against leads, attach resumes/CLs
4. **Track pipeline** — monitor application statuses
5. **Automate** — run workflows/extractions at scale

None of this progression is visible in the navigation. Dashboard exists but doesn't guide the user forward.

### P5: Profile is overloaded with no secondary navigation

The Profile page manages user info + five resource collections (Skills, Experiences, Education, Certificates, Contacts) in a single tabbed mega-page. With Documents potentially merging in, this will become even heavier without a proper secondary nav or sub-route structure.

### P6: No contextual sub-navigation pattern exists

When a user is inside Leads, there is no way to pivot to related Companies, related Applications, or to drill into a specific lead's detail view with sub-routes. Everything is modals and expandable cards. This limits future depth (lead detail page, company detail page, application detail page).

### P7: Workflows and Extractors have no navigational home

Workflows (orchestration pipelines) sit at the top level, but Extractors are entirely orphaned. Both are power-user / automation concerns that could share a navigational grouping.

> **Backend validation note:** Extractors have a full backend surface (`/extractor/` CRUD + run + examples + configurables + suggest). Orchestration pipelines and events have a full backend surface under `/data_orchestration/`. Both are user-scoped. The Workflows group is fully backend-supported.
>
> However, the `automation-tasks.tsx` **phantom service** has no backend at all (see §0 M1). Any future "Automation Tasks" tab under Workflows is 🚫 blocked pending backend implementation.

---

## 3. Proposed Target Hierarchy

### Design Principles

1. **Group by user intent**, not by database table.
2. **Primary navigation** = drawer (preserved). **Secondary navigation** = new contextual nav bar below the top `AppBar`.
3. **Three user-intent groups**: Identity (who I am), Opportunities (what I'm pursuing), Automation (what runs for me).
4. Drawer items link to *group entry points*. The secondary nav bar shows *sections within the active group*.
5. Use a single navigation metadata source of truth so the drawer, group nav, and redirects cannot drift.
6. Keep V1 constrained to the current page surfaces; defer detail pages and full identity sub-route decomposition to a later follow-on.

### Proposed Drawer Navigation

```
Dashboard          /

─── PURSUE ─────────────────────
Leads              /leads
Applications       /applications

─── IDENTITY ───────────────────
Profile            /me

─── AUTOMATE ───────────────────
Workflows          /workflows
```

**Changes from current:**

| Current | Proposed | Backend Status | Rationale |
|---------|----------|----------------|-----------|
| Companies (top-level) | Removed from drawer; accessed via Leads secondary nav and Lead detail | ✅ `GET /companies/` + `GET /companies/{id}/leads` fully supported | Companies are almost always a supporting entity reached through Leads |
| Documents (top-level) | Removed from the drawer; accessed via the Identity secondary nav at `/me/documents` | ✅ `GET /resumes/`, `GET /cover_letters/` are independent user-scoped endpoints | Resumes and Cover Letters are part of professional identity, not a standalone primary workflow |
| Profile `/profile` | Renamed to `/me` with sub-routes | ✅ `GET /users/me/profile` + independent contacts/documents endpoints | Cleaner URL, room for sub-sections |
| — | Section labels in drawer | N/A | Visual grouping signals user intent |

### Proposed Secondary Navigation (Contextual Nav Bar)

The secondary nav bar renders below the `AppBar` / `Toolbar` header *within* `AppLayout`, driven by the active route group. In V1 it establishes consistent **group-level** wayfinding and complements existing page-local controls rather than replacing them wholesale.

**Leads group** (`/leads/*`):
```
All Leads | Companies
```
> ✅ Both `GET /leads/` and `GET /companies/` are fully backend-supported.
> Note: Leads and Companies are global shared entities — no user-scoping filter.

**Identity group** (`/me/*`):
```
Profile | Documents
```
> ✅ Both items are backend-supported through existing frontend composition. `GET /users/me/profile` covers profile + skills + experiences + education + certificates.
> Contacts fetched independently via `GET /contacts/`. Documents via `GET /resumes/` and `GET /cover_letters/`.
> V1 keeps the existing internal `Tabs` inside `ProfilePage`; URL-backed identity sub-sections are explicitly deferred.

**Applications group** (`/applications/*`):
```
Pipeline
```
> ✅ `GET /applications/` with eager-loaded lead + companies + user. Sub-resources for resumes/cover-letters on each application.

**Workflows group** (`/workflows/*`):
```
Pipelines | Extractors
```
> ✅ Pipelines: `GET /data_orchestration/pipelines` + events. Extractors: `GET /extractor/` + run + examples.
> 🚫 Automation Tasks: no backend model, router, or schema exists. Blocked pending backend implementation.

**Dashboard**: No secondary nav in V1.

Deferred from V1 shell navigation:
- Saved searches under Leads
- Analytics under Applications
- Automation Tasks under Workflows (blocked on backend implementation)

### Proposed Route Tree

| Path | Element |
|------|---------|
| `/` | `DashboardPage` |
| `/leads` | `LeadsPage` |
| `/leads/companies` | `CompaniesPage` |
| `/applications` | `ApplicationsPage` |
| `/me` | `ProfilePage` |
| `/me/documents` | `DocumentsPage` |
| `/workflows` | `PipelinesPage` |
| `/workflows/extractors` | `ExtractorPage` |
| `*` | `ErrorPage` |

Deferred from V1: `/leads/:id`, `/applications/:id`, `/workflows/:id`, and URL-backed identity sub-sections such as `/me/skills`.

Note: In V1, `ProfilePage` keeps its existing internal tabs and the secondary nav only handles the `Profile` ↔ `Documents` switch.

---

## 4. Route and Layout Restructuring Strategy

### 4.1 Introduce a Secondary Nav Bar Component

Create a new `SecondaryNavBar` component that:
- Receives a config of `{ label, path }[]` items
- Renders a horizontal tab-like bar below the `AppBar`
- Highlights the active item based on current route
- Integrates into `AppLayout` between the `AppBar` and the `<Outlet />`
- Uses a horizontally scrollable layout on narrow screens rather than wrapping into a second header row

This component provides a consistent navigation pattern across grouped pages. In V1 it does **not** replace the internal `Tabs` already embedded in `ProfilePage`.

### 4.2 Create a Navigation Metadata Module

Create a single navigation metadata module, for example `route/navigation.ts`, that defines:

- Drawer groups and entry points
- Secondary nav items for each route group
- Legacy redirects (`/companies` → `/leads/companies`, etc.)
- Active-path matching rules where plain `startsWith` is insufficient

`AppLayout`, route-group layouts, and redirect routes should all derive from this module. Individual pages should not declare their own shell navigation structure.

### 4.3 Introduce Route Group Layout Wrappers

For each group that needs secondary nav, introduce a thin layout wrapper:

- `LeadsGroupLayout` — renders `SecondaryNavBar` with Leads tabs + `<Outlet />`
- `IdentityGroupLayout` — renders `SecondaryNavBar` with Identity tabs + `<Outlet />`
- `ApplicationsGroupLayout` — renders `SecondaryNavBar` with Applications tabs + `<Outlet />`
- `WorkflowsGroupLayout` — renders `SecondaryNavBar` with Workflows tabs + `<Outlet />`

These are *nested route layouts* in React Router terms — they render below `AppLayout` and wrap sub-routes.

### 4.4 Restructure the Route Tree

In `app-routes.tsx`, migrate from flat routes to nested route groups with this structure:

- `AppLayout` remains the authenticated shell root.
- `UserRoute` remains the auth guard inside `AppLayout`.
- `leads/*` is wrapped by `LeadsGroupLayout` and contains:
   - index route → `LeadsPage`
   - `companies` route → `CompaniesPage`
- `applications/*` is wrapped by `ApplicationsGroupLayout` and contains:
   - index route → `ApplicationsPage`
- `me/*` is wrapped by `IdentityGroupLayout` and contains:
   - index route → `ProfilePage`
   - `documents` route → `DocumentsPage`
- `workflows/*` is wrapped by `WorkflowsGroupLayout` and contains:
   - index route → `PipelinesPage`
   - `extractors` route → `ExtractorPage`
- Legacy top-level paths redirect into the nested structure.
- The authenticated catch-all route still renders `ErrorPage`.

### 4.5 Update Drawer Navigation

Modify the `navItems` array in `AppLayout` to derive from the shared navigation metadata. Add a `section` field to the nav item model to enable rendering dividers and group labels.

### 4.6 Migrate Companies under Leads

- Move `CompaniesPage` from `/companies` to `/leads/companies`
- Add redirect: `/companies` → `/leads/companies` for backward compat
- CompaniesPage itself needs no immediate internal changes — the same CRUD + expand-to-leads behavior works in either routing location
- Remove Companies from the drawer `navItems`

### 4.7 Migrate Documents under Identity

- Move `DocumentsPage` from `/documents` to `/me/documents`
- Add redirect: `/documents` → `/me/documents`
- Remove Documents from the drawer `navItems`
- The secondary nav bar in the Identity group handles navigation between Profile and Documents

### 4.8 Rename Profile Route

- Change `/profile` to `/me`
- Add redirect: `/profile` → `/me`
- Update all internal navigation references

---

## 5. Phased Implementation Plan

### Phase 1: Secondary Nav Bar Foundation

**Goal:** Introduce the reusable `SecondaryNavBar` component and integrate it into `AppLayout` without changing routes.

**Work:**
1. Create `component/common/secondary-nav-bar.tsx`
   - Props: `items: { label: string; path: string }[]`
   - Renders MUI `Tabs` or a custom horizontal nav below the toolbar
   - Uses `useLocation` to determine active tab
   - Uses `useNavigate` for tab clicks
   - Defines explicit active, hover, and focus-visible states
   - Uses horizontal overflow on narrow screens
2. Create `route/navigation.ts` as the single source of truth for drawer groups, secondary nav items, and legacy redirects
3. Add the `SecondaryNavBar` render slot in `AppLayout` between `Toolbar` and `<Outlet />`
4. Keep `ToolbarHeaderContext` focused on page title/subtitle only; do not overload it with shell-navigation metadata
5. Validate: typecheck and build; no visible route change yet beyond an empty or hidden secondary-nav slot when no items are configured

**Files affected:**
- New: `component/common/secondary-nav-bar.tsx`
- New: `route/navigation.ts`
- Modified: `layout/app-layout.tsx` (add secondary nav render slot)

**Estimated risk:** Low. Additive only.

---

### Phase 2: Route Group Layouts + Nesting

**Goal:** Introduce route group layout wrappers and restructure `app-routes.tsx` to use nested routing.

**Work:**
1. Create `layout/leads-group-layout.tsx` — secondary nav: "All Leads", "Companies"
2. Create `layout/identity-group-layout.tsx` — secondary nav: "Profile", "Documents"
3. Create `layout/applications-group-layout.tsx` — secondary nav (single item for now, extensible)
4. Create `layout/workflows-group-layout.tsx` — secondary nav: "Pipelines", "Extractors"
5. Refactor `route/app-routes.tsx` to nest routes under group layouts, including:
   - Leads + Companies under `LeadsGroupLayout`
   - Profile + Documents under `IdentityGroupLayout`
   - Pipelines + Extractors under `WorkflowsGroupLayout`
6. Wire `page/extractor.tsx` into the route tree at `/workflows/extractors` (resurrected — fully backend-supported per §0)
7. Add redirect routes for backward compat (`/companies` → `/leads/companies`, `/documents` → `/me/documents`, `/profile` → `/me`, `/pipelines` → `/workflows`)
8. Run a repo-wide hard-coded path audit and update legacy references in `page/dashboard.tsx`, `component/common/header.tsx`, and any other discovered route literals
9. Validate: all existing pages still render, URLs resolve correctly

**Files affected:**
- New: `route/navigation.ts` (consumed by layouts and redirects)
- New: `layout/leads-group-layout.tsx`, `layout/identity-group-layout.tsx`, `layout/applications-group-layout.tsx`, `layout/workflows-group-layout.tsx`
- Modified: `route/app-routes.tsx` (major restructure)
- Modified: `layout/app-layout.tsx` (consume navigation metadata)
- Modified: `component/common/header.tsx` (remove stale authenticated-app destinations)
- Modified: `page/dashboard.tsx` (route literal updates)

**Estimated risk:** Medium. Route restructuring can break deep links, redirects, and active-path detection in the drawer. Thorough URL testing required.

**Key concern:** The `isActive` logic in the drawer currently checks `location.pathname.startsWith(item.path)`. After nesting, `/leads` will match both the Leads drawer item and all sub-routes, which is correct. `/me` replaces `/profile`, which also needs the redirect to work cleanly. Active-path logic must be validated per drawer item.

---

### Phase 3: Drawer Reorganization

**Goal:** Update the drawer nav model to reflect the new grouped hierarchy.

**Work:**
1. Modify the `navItems` structure in `AppLayout` to include a `section` property
2. Render section dividers and labels in the drawer list
3. Remove "Companies" and "Documents" from the top-level drawer items
4. Keep the drawer label as `Profile` and update its path to `/me`
5. Verify collapsed-drawer behavior with section labels; in collapsed state, show divider rhythm without section label text

**Files affected:**
- Modified: `layout/app-layout.tsx` (nav items model + render logic)

**Estimated risk:** Low to medium. Mostly visual. Collapsed drawer state needs testing.

---

### Phase 4: Companies Migration

**Goal:** Move Companies from its current top-level position into the Leads group.

**Work:**
1. CompaniesPage already at `/leads/companies` from Phase 2. Verify it renders correctly under the `LeadsGroupLayout` secondary nav.
2. Update Dashboard page references — `companyCount` metric tile currently navigates to `/companies`; update to `/leads/companies`.
3. Update LeadsPage — the Leads page already fetches companies for the lead form dialog. Verify no broken references.
4. Update Companies page — the Companies page fetches its own data independently; this should work without changes. Verify the "expand to show leads" UX still works.
5. Verify redirect from `/companies` works end-to-end.

**Files affected:**
- Modified: `page/dashboard.tsx` (update navigation target)
- Verified: `page/companies.tsx` (minimal or zero changes)
- Verified: `page/leads.tsx` (should work as-is)

**Estimated risk:** Low. CompaniesPage is self-contained. Main risk is stale links.

---

### Phase 5: Documents Migration + Identity Group Polish

**Goal:** Move Documents under the Identity group and verify the identity sub-navigation works coherently.

**Work:**
1. DocumentsPage already at `/me/documents` from Phase 2. Verify it renders correctly under `IdentityGroupLayout`.
2. Keep the existing internal `Tabs` in `ProfilePage` for Skills/Experiences/Education/Certificates/Contacts in V1.
3. Ensure the secondary nav highlights "Profile" at `/me` and "Documents" at `/me/documents` without attempting to mirror the internal tab state.
4. Do **not** introduce `/me/skills`, `/me/experience`, or similar sub-routes in this implementation pass.
5. Verify redirect from `/documents` works end-to-end.
6. Update any internal links discovered in the Phase 2 path audit.

**Files affected:**
- Verified: `page/documents.tsx` (minimal or zero changes)
- Modified: `page/profile.tsx` (only if toolbar copy or internal tab labeling needs minor cleanup)
- Verified: `layout/identity-group-layout.tsx` (from Phase 2)

**Estimated risk:** Low. DocumentsPage is self-contained.

---

### Phase 6: Dashboard Integration + UX Polish

**Goal:** Update the Dashboard to reflect the new navigation model and polish the overall experience.

**Work:**
1. Update Dashboard metric tiles and navigation targets to use new paths.
2. Verify quick-extract flow still works (creates lead → user may want to see it in `/leads`).
3. Do **not** add a new dashboard journey rail or onboarding track in this pass. Limit Dashboard changes to route alignment, copy alignment, and shell polish.
4. Polish the secondary nav visual treatment with explicit acceptance criteria:
   - clear active, inactive, hover, and focus-visible states
   - visual hierarchy subordinate to the page title, not competing with it
   - section labels in the drawer read as grouping aids, not clickable destinations
   - horizontally scrollable behavior on small screens instead of multi-line wrapping
5. Ensure the `ToolbarHeaderContext` plays well with the secondary nav — each page's `usePageToolbarHeader()` call should still work without conflict.
6. Revisit Dashboard metric copy so global shared counts (Leads, Companies) and user-owned counts (Applications, Profile completeness) are not presented as the same kind of number.

**Files affected:**
- Modified: `page/dashboard.tsx`
- Modified: `component/common/secondary-nav-bar.tsx` (polish)
- Modified: `layout/app-layout.tsx` (polish)

**Estimated risk:** Low to medium. Dashboard integration is cross-cutting.

---

### Phase 7: Cleanup and Future Prep

**Goal:** Remove dead code (including phantom services), validate production build, document the new IA.

**Work:**
1. **Remove phantom services identified in backend validation (§0):**
   - Delete `service/automation-tasks.tsx` — no backend router, model, or schema exists. All five endpoints are phantom. No frontend consumer. (🚫 M1)
   - Remove `getLeadOrchestrationEvents` from `service/leads.tsx` — endpoint `GET /leads/{id}/orchestration_events` does not exist in backend. Never imported or called. (🚫 M2)
2. **Retain admin-only service files that are unrelated to the IA migration:**
   - Keep `service/db-management.tsx` unchanged in this pass. It has backend support but no role in the navigation migration. (ℹ️ M6)
3. Audit legacy public-shell pieces:
   - `layout/home-layout.tsx` stays because it serves `/user-terms`
   - `component/common/header.tsx` must stop advertising stale authenticated-app routes
   - `layout/public-layout.tsx` should be removed because it is unreferenced
   - `page/home.tsx` should be removed because it is unrouted
4. Refresh `page/extractor.tsx` to current authenticated-page conventions:
   - add `usePageToolbarHeader`
   - remove redundant standalone page-title treatment if it conflicts with the shell header
   - use the same spacing and feedback patterns as the rest of the signed-in app
5. Run local validation:
   - `./node_modules/.bin/tsc --noEmit`
   - `npm run build`
   - `npm run test` (informational only; current repo config allows passing with no tests)
   - manual walkthrough of `/`, `/leads`, `/leads/companies`, `/applications`, `/me`, `/me/documents`, `/workflows`, `/workflows/extractors`, `/companies`, `/documents`, `/profile`, and `/pipelines`
6. Update the redirect map: because nothing is in production, the legacy redirects are migration aids for local review and branch stabilization, not long-term compatibility commitments. Remove them once reviewers are no longer relying on them.

**Files removed:**
- `service/automation-tasks.tsx` (phantom — no backend)
- `page/home.tsx` (stub, never routed)
- `layout/public-layout.tsx` (never used)

**Files modified:**
- `service/leads.tsx` (remove `getLeadOrchestrationEvents`)
- `page/extractor.tsx` (refresh to current authenticated-page conventions)
- `route/app-routes.tsx` (cleanup redirects)
- `component/common/header.tsx` (remove stale authenticated-app destinations)

**Estimated risk:** Low to medium. Cleanup is straightforward, but redirect removal and legacy header cleanup should happen only after the branch-level migration is stable.

---

## 6. Affected Files Summary

### New Files
| File | Purpose |
|------|---------|
| `component/common/secondary-nav-bar.tsx` | Reusable sub-navigation bar |
| `route/navigation.ts` | Single source of truth for drawer groups, secondary nav items, and legacy redirects |
| `layout/leads-group-layout.tsx` | Leads group route wrapper |
| `layout/identity-group-layout.tsx` | Identity group route wrapper |
| `layout/applications-group-layout.tsx` | Applications group route wrapper |
| `layout/workflows-group-layout.tsx` | Workflows group route wrapper |

### Modified Files
| File | Phase | Nature of Change |
|------|-------|-----------------|
| `layout/app-layout.tsx` | 1, 3, 6 | Add secondary nav slot; restructure navItems; polish |
| `route/app-routes.tsx` | 2 | Major route tree restructuring |
| `page/dashboard.tsx` | 2, 4, 6 | Update route literals, navigation targets, and metric copy |
| `page/profile.tsx` | 5 | Minor: align toolbar copy with `/me`; preserve existing internal tab behavior |
| `component/common/header.tsx` | 2, 7 | Remove stale authenticated-app destinations from the public shell |

### Unchanged (Verified)
| File | Why Unchanged |
|------|---------------|
| `page/leads.tsx` | Self-contained; fetches companies internally |
| `page/companies.tsx` | Self-contained; works at any route |
| `page/applications.tsx` | Self-contained |
| `page/documents.tsx` | Self-contained |
| `page/pipelines.tsx` | Self-contained |
| `layout/home-layout.tsx` | Remains the public shell for `/user-terms`; outside the authenticated IA redesign |
| Most `service/*.tsx` | No URL/routing logic; pure API layer |
| `context/user-context.tsx` | No routing awareness |
| `theme/theme-provider.tsx` | No routing awareness |
| All `component/*.tsx` (modals, cards, bars) | No routing awareness |

### Removed (Phase 7)
| File | Reason |
|------|--------|
| `service/automation-tasks.tsx` | 🚫 Phantom — no backend endpoints exist (§0 M1) |
| `page/home.tsx` | Stub, never routed |
| `layout/public-layout.tsx` | Never used in any route |

### Modified in Cleanup (Phase 7)
| File | Change |
|------|--------|
| `service/leads.tsx` | Remove `getLeadOrchestrationEvents` — phantom endpoint (§0 M2) |
| `page/extractor.tsx` | Refresh to current authenticated-page conventions |

---

## 7. Dependencies and Sequencing

```
Phase 1 → Phase 2 → Phase 3 → Phase 4
                  ↘          ↘
                Phase 5 → Phase 6 → Phase 7
```

- **Phase 1 must complete first** — the secondary nav bar and shared navigation metadata are prerequisites for all group layouts.
- **Phase 2 must complete before Phases 3–5** — route nesting must be in place before the drawer can remove items or pages can be verified in their new locations.
- **Phase 3 can run in parallel with Phases 4–5** after Phase 2 — drawer changes are independent of verifying individual page migrations.
- **Phase 6** should wait until Phases 3–5 are complete so the Dashboard reflects the final navigation model.
- **Phase 7** is a cleanup pass that depends on all prior phases.

---

## 8. Risks and Migration Concerns

### Route breakage
Changing URLs risks breaking bookmarks, browser history, and in-branch muscle memory. Mitigation: maintain `<Navigate>` redirects for all changed paths during implementation and review. Because nothing is in production, these redirects are migration aids rather than release-cycle commitments.

### Drawer active-state detection
The current `isActive` logic uses `startsWith`. After nesting, `/me` must match both `/me` and `/me/documents`, while `/leads` must match both `/leads` and `/leads/companies`. The existing logic supports this naturally for most cases, but the root path `/` needs special handling (exact match only) — which it already has.

### Navigation metadata drift
If the drawer, route tree, and redirects are declared in separate places, they will diverge over time. Mitigation: centralize all shell-navigation metadata in `route/navigation.ts` and have `AppLayout`, route-group layouts, and redirect routes consume it.

### Profile page decomposition risk
If the Profile page's internal tab state conflicts with the secondary nav bar (both trying to highlight "Profile" vs sub-sections), there will be visual confusion. Mitigation: Phase 5 explicitly defers sub-route decomposition and keeps internal tabs, letting the secondary nav only distinguish between "Profile" and "Documents".

### ToolbarHeaderContext interaction
Each page calls `usePageToolbarHeader(title, subtitle)`. The secondary nav bar should sit below the toolbar but not conflict with this context. The render slot in `AppLayout` must be between the `AppBar` and the `<Outlet />`, not inside the `AppBar`. This is architecturally clean but needs visual polish.

### Mobile responsive behavior
The secondary nav bar adds vertical space. On mobile viewports, this could create a "chrome-heavy" feel with the drawer (even if hidden behind a hamburger), the toolbar header, and the secondary nav bar all stacking. Mitigation: use a horizontally scrollable secondary nav on mobile and keep it visually subordinate to the page title; do not add a second dropdown-style shell control in V1.

### Validation confidence
`npm run test` exists but currently passes even when no tests are present. Mitigation: treat typecheck and build as the hard automated gates for this work, and treat the manual route walkthrough in Phase 7 as the required migration confidence check.

### Service layer stability
All `service/*.tsx` files use plain HTTP calls with token auth — no routing or navigation logic. These are completely unaffected by the IA redesign. Confirmed safe.

**Exception:** Two service-layer cleanups are required in Phase 7:
- Delete `service/automation-tasks.tsx` entirely (phantom, no backend)
- Remove `getLeadOrchestrationEvents` from `service/leads.tsx` (phantom endpoint, no consumers)

---

## 9. Implementation Decisions and Assumptions

### Locked Decisions For V1

1. **Identity remains a two-item group in shell navigation.**
   V1 ships `Profile` and `Documents` as the only Identity secondary-nav items. Skills, Experiences, Education, Certificates, and Contacts stay as internal `ProfilePage` tabs.

2. **Extractor moves under Workflows in V1.**
   The backend surface is already present, so `/workflows/extractors` is part of the implementation plan, not a speculative future idea.

3. **Automation Tasks are explicitly out of scope.**
   `service/automation-tasks.tsx` is phantom code and should be deleted. Any future automation-task UI requires backend-first work.

4. **The public `/user-terms` surface remains outside this redesign.**
   `layout/home-layout.tsx` stays because it serves a public route. `layout/public-layout.tsx` is unused and should be removed in Phase 7.

5. **Unused stub files should be removed in cleanup.**
   `page/home.tsx` is unrouted and should be removed in Phase 7.

6. **Collapsed drawer sections show structure, not text labels.**
   In collapsed state, preserve divider rhythm without rendering section-label text.

7. **Dashboard copy should distinguish shared inventory from user-owned progress when touched.**
   Leads and Companies are global shared entities; Applications and profile completion are user-scoped. The IA migration should not reinforce the wrong ownership model in metric copy.

8. **`service/db-management.tsx` stays out of scope for this migration.**
   Keep it unchanged unless a separate admin-surface cleanup is explicitly requested.

### Assumptions

- The existing `AppLayout` drawer remains the primary navigation shell. We extend it, not replace it.
- React Router nested routing (`<Outlet />` within route group layouts) is the implementation mechanism.
- **No backend API changes are needed for this redesign** — it is purely a frontend routing and navigation restructuring. All proposed navigation targets map to existing, verified backend endpoints.
- The `/me` identity group is a **frontend-only navigation abstraction** that aggregates data from multiple independent backend endpoints (`/users/me/profile`, `/contacts/`, `/resumes/`, `/cover_letters/`). There is no single backend "identity bundle" endpoint, and none is needed.
- Leads and Companies are **global shared entities** in the current backend model. The "Pursue" navigation group frames them by user intent, not by data ownership. If user-scoped leads are desired in the future, that requires backend changes (adding `user_id` to Lead/Company models + query filtering).
- The `ToolbarHeaderContext` pattern is preserved for title/subtitle only; shell-navigation metadata lives separately in `route/navigation.ts`.
- Temporary redirects from old paths to new paths are acceptable during branch migration and local review, but they are not required as permanent compatibility shims.
- The phantom `automation-tasks.tsx` service and `getLeadOrchestrationEvents` function are dead code that will be removed, not preserved.

---

## 10. Agent Handoff Ticket Breakdown

Use the seven phases above as the detailed implementation spec. The breakdown below is the handoff package for another coding agent.

### Ticket 1 — Phase 1: Secondary Nav Foundation

**Depends on:** none

**Deliverable:**
- Add `component/common/secondary-nav-bar.tsx`
- Add `route/navigation.ts`
- Add an empty or hidden secondary-nav slot to `layout/app-layout.tsx`

**Done when:**
- `AppLayout` can render secondary-nav items from shared metadata
- `ToolbarHeaderContext` remains title/subtitle-only
- `./node_modules/.bin/tsc --noEmit` and `npm run build` pass

### Ticket 2 — Phase 2: Nested Route Groups

**Depends on:** Ticket 1

**Deliverable:**
- Add group layout wrappers for Leads, Identity, Applications, and Workflows
- Restructure `route/app-routes.tsx` to nest group routes
- Route Extractors at `/workflows/extractors`
- Add temporary redirects for `/companies`, `/documents`, `/profile`, and `/pipelines`
- Update hard-coded route literals discovered in the repo-wide audit

**Done when:**
- All target routes resolve under their new groups
- Legacy paths redirect correctly
- `component/common/header.tsx` and `page/dashboard.tsx` no longer point at stale destinations
- `./node_modules/.bin/tsc --noEmit` and `npm run build` pass

### Ticket 3 — Phase 3: Drawer Reorganization

**Depends on:** Ticket 2

**Deliverable:**
- Update the drawer to render grouped sections from shared navigation metadata
- Remove top-level drawer entries for Companies and Documents
- Point Profile to `/me`

**Done when:**
- Expanded drawer shows section labels and correct destinations
- Collapsed drawer preserves grouping rhythm without label text
- Active-state logic works for `/`, `/leads/*`, `/applications/*`, `/me/*`, and `/workflows/*`

### Ticket 4 — Phase 4: Companies Migration

**Depends on:** Ticket 2 and Ticket 3

**Deliverable:**
- Treat `/leads/companies` as the canonical Companies location
- Update stale Companies links, especially on the Dashboard

**Done when:**
- Dashboard company navigation lands on `/leads/companies`
- `/companies` redirects to `/leads/companies`
- Companies page behavior is unchanged apart from route location

### Ticket 5 — Phase 5: Documents Migration

**Depends on:** Ticket 2 and Ticket 3

**Deliverable:**
- Treat `/me/documents` as the canonical Documents location
- Keep `ProfilePage` internal tabs intact in V1

**Done when:**
- Identity secondary nav switches only between `Profile` and `Documents`
- `/documents` redirects to `/me/documents`
- No `/me/skills`-style routes are introduced in this pass

### Ticket 6 — Phase 6: Dashboard and Shell Polish

**Depends on:** Ticket 4 and Ticket 5

**Deliverable:**
- Align Dashboard navigation targets with the new route structure
- Tighten shell polish for the secondary nav and grouped drawer
- Adjust Dashboard copy where ownership semantics are misleading

**Done when:**
- Dashboard route targets match canonical V1 locations
- Secondary nav has explicit active, hover, and focus-visible states
- Mobile behavior uses horizontal overflow rather than multi-line shell chrome
- No new onboarding/journey rail is added in this pass

### Ticket 7 — Phase 7: Cleanup and Final Validation

**Depends on:** Tickets 1 through 6

**Deliverable:**
- Remove `service/automation-tasks.tsx`
- Remove `getLeadOrchestrationEvents` from `service/leads.tsx`
- Remove `layout/public-layout.tsx` and `page/home.tsx`
- Refresh `page/extractor.tsx` to current authenticated-page conventions
- Keep `service/db-management.tsx` unchanged

**Done when:**
- Dead navigation-related code is removed
- Extractor matches the current signed-in shell conventions
- `./node_modules/.bin/tsc --noEmit`, `npm run build`, and `npm run test` complete
- Manual walkthrough succeeds for `/`, `/leads`, `/leads/companies`, `/applications`, `/me`, `/me/documents`, `/workflows`, `/workflows/extractors`, `/companies`, `/documents`, `/profile`, and `/pipelines`

Each ticket should leave the branch in a shippable, non-broken state. No ticket should partially migrate a surface and depend on a later ticket to restore baseline navigation correctness.
