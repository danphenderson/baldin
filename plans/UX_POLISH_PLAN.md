# UX Polish & Product Coherence Plan

Date: 2026-04-06
Branch: feat-sprint
Status: Draft — ready for owner review

---

## 1. Current User Journey Critique

### Registration → First Session

The first-time path is **Register → forced re-login → empty Command Center →
maybe auto-import modal**. Three problems compound here:

1. **Login wall after registration.** Users fill out the registration form and
   are then sent back to `/login` to type the same credentials again. This adds
   friction with zero value. The feeling is "did that work?"

2. **No profile bootstrapping.** If the user dismisses the LinkedIn import
   modal (which auto-opens when profile completion is 0%), there is no recovery
   path — no reminder, no "finish later" nudge, no re-entry point from the
   sidebar. The modal is a one-shot gate that can be permanently skipped.

3. **Empty dashboard, weak orientation.** A new user with zero leads and zero
   applications sees the quick-start panel (three cards: import lead, complete
   profile, browse directory), but no explanation of *what Baldin is for* or
   *what workflow to follow*. The quick-start cards are good scaffolding, but
   they appear in a full-width dashboard with an empty activity feed and zero
   action items — nothing feels alive.

### Core Loop: Leads → Applications → Documents

The **lead extraction → application creation → document generation** core loop
is the strongest part of the product, but it has structural seams:

- **Lead → Application conversion is clear.** "Create Application" on the lead
  card works well. Lead cards surface salary, type, location, interest count.
- **Application tracking is the best page.** The queue and board views, stats
  bar, and stage progression are coherent and purposeful.
- **Documents live under "Identity → Studio" which is unintuitive.** Users
  tracking applications will want to jump to their resume/cover letter, but
  "Studio" is nested under `/me/documents`, grouped with the profile. The
  mental model clash: "my documents" feels like profile data, not application
  material.
- **No contextual document creation from an application.** If you're on an
  application detail page and want to write a targeted cover letter, you have to
  navigate away to Studio, create the document, and return. No linking back.

### Navigation & Information Architecture

The sidebar groups — **Pursue, Identity, Network, Automate, Settings** — use
novel vocabulary that requires learning:

| Sidebar Label | What it means           | First guess |
| ------------- | ----------------------- | ----------- |
| Pursue        | Leads + Applications    | Unclear     |
| Identity      | Profile + Documents     | "My account?" |
| Automate      | Workflows/Pipelines     | Reasonable  |
| Network       | Directory/Connections   | Reasonable  |

- **"Pursue"** is the core workflow group but the label doesn't communicate
  "job tracking." A user looking for their applications might scan for
  "Applications" or "Jobs" and not find it.
- **"Identity"** conflates profile setup with document authoring. Profile is
  about *who you are*; documents are *what you produce*. These are different
  objects used at different times.
- **"Studio"** as the name for the document list is overpromising. Users see a
  list of documents with CRUD actions — that's a document library, not a studio.
- **"Command Center"** as the dashboard label matches the cyan-dark-mode
  aesthetic but is unnecessarily militaristic for a job-search tool.

### Dead Ends and Weak Spots

| Issue | Location | Impact |
|-------|----------|--------|
| No way to re-trigger LinkedIn import after dismissal | Profile page | Blocks profile bootstrapping for users who skipped |
| Subscription page exists but has no real payment integration | `/settings/subscription` | Creates false expectation, then dead end |
| Graduation and Discoverability settings are niche | `/settings/graduation`, `/settings/discoverability` | Clutter for 90% of users who don't need them |
| Pipelines page requires JSON editing | `/workflows` | Unusable for non-technical users |
| Extractor/Crawler/Review pages are admin tools exposed in sidebar | `/workflows/*` | Confusing for end users; blurs user vs. admin |
| No notification center | App-wide | Unread badge on messages is the only signal |
| No contextual back-navigation from detail pages | Application detail, Document detail | User must use sidebar or browser back |
| Messages require starter tier but the gate appears only after clicking Connect | Directory | Confusing — gate should be visible before action |

### What Works Well

- **Lead extraction from URL** is the most differentiated UI element and it's
  front-and-center on the Leads page. Good.
- **Application board view** (Kanban) is well-executed with drag-and-drop and
  stage colors.
- **Profile completion tracker** with ranked next-actions is a solid pattern.
- **Dark-mode visual design** is polished — the cyan/slate palette with gradient
  cards communicates a modern tool.
- **Empty states** are consistent — every list has an icon, message, and CTA
  button.
- **Activity feed** on the dashboard ties objects together and shows recency.

---

## 2. Most Urgent UX / Product Architecture Issues

**Ranked by impact on first-session retention and workflow clarity:**

### P0 — Immediate (blocks first impression)
1. **Auto-login after registration.** Eliminate the redundant login step.
2. **Post-registration welcome flow.** After first login, show a brief
   oriented welcome state that explains the three core actions: build your
   profile, import a lead, start applying.
3. **Rename sidebar groups to plain language.** "Pursue" → "Job Tracker" or
   "Jobs." "Identity" → split into "Profile" (top-level) and "Documents"
   (top-level or nested under Jobs). "Command Center" → "Dashboard."

### P1 — High (breaks workflow continuity)
4. **Re-entry point for LinkedIn import.** Add a persistent "Import profile"
   action on the Profile page so users who dismissed the modal can get back.
5. **Contextual document link from Application detail.** Let users create or
   attach a document from the application detail page.
6. **Surface tier gates earlier.** If messaging requires starter tier, show
   the gate on the Connect button, not after.
7. **Breadcrumb or back-link on detail pages.** Application detail and
   Document detail should show where the user came from and how to go back.

### P2 — Medium (reduces confusion)
8. **Separate user tools from admin tools in Workflows.** Move
   Review Queue and Crawlers behind an "Admin" section or keep the existing
   superuser route guard but remove them from the Automate sidebar for
   non-superusers entirely (currently filtered, but the group still appears).
9. **Clarify or remove Subscription page.** If no payment is wired, replace
   with a "Preview — all features unlocked" banner or remove the page.
10. **Hide Graduation/Discoverability behind profile settings.** These are
    edge-case controls that don't warrant top-level settings pages.

### P3 — Low (polish)
11. **Add contextual help tooltips** on empty Dashboard sections.
12. **Add a global notification/alert center** beyond the message badge.
13. **Improve Pipelines UX** beyond raw JSON editing (future scope).

---

## 3. Proposed Improved Flow

### First-Time User Journey (Revised)

```
Register → auto-login → Dashboard (welcome state)
                              │
              ┌────────────────┼─────────────────┐
              ▼                ▼                  ▼
      Import Profile    Extract a Lead     Browse Directory
       (/me)             (/leads)           (/network)
              │                │
              ▼                ▼
      Complete Profile   Create Application
              │                │
              ▼                ▼
      Create Resume      Track in Board
       (/documents)      (/applications/board)
              │                │
              └───────┬────────┘
                      ▼
              Dashboard shows progress
              Activity feed populates
              Action items appear
```

### Revised Navigation Hierarchy

```
Sidebar:
  Dashboard          (was "Command Center")
  ─────────
  Jobs               (was "Pursue")
    Leads
    Applications
  ─────────
  Documents          (was nested under Identity → Studio)
    My Documents
    Shared With Me
  ─────────
  Profile            (was grouped with Documents under Identity)
  ─────────
  Network
    Directory
    Connections
    Messages
  ─────────
  Workflows          (was "Automate")
    Pipelines
    Extractors
  ─────────
  Settings
    Account           (subscription, discoverability, graduation merged)
```

Key changes:
- **Documents become a top-level section**, not nested under profile. This
  reflects their role as work products tied to applications.
- **Profile becomes its own top-level item**, not grouped with documents.
- **"Jobs" replaces "Pursue"** — immediately understandable.
- **"Dashboard" replaces "Command Center"** — removes jargon.
- **Admin tools (Crawlers, Review Queue)** remain superuser-gated but move to
  a clearly labeled admin section or stay hidden for non-superusers.
- **Settings consolidated** into a single Account page or minimal tabs instead
  of three separate pages.

---

## 4. Phased Implementation Plan

### Milestone 1: First Impression & Navigation Clarity

**Owner: Baldin Frontend Agent**
**Scope: frontend/src only**
**Duration estimate: single sprint**

| Task | Files Likely Affected |
|------|-----------------------|
| Auto-login after registration | `page/register.tsx`, `context/user-context.tsx`, `service/auth.tsx` |
| Rename sidebar: Command Center → Dashboard | `route/navigation.ts`, `page/command-center.tsx` |
| Rename sidebar: Pursue → Jobs | `route/navigation.ts` |
| Promote Documents to top-level sidebar item | `route/navigation.ts`, `route/app-routes.tsx`, layout files |
| Promote Profile to top-level sidebar item | `route/navigation.ts`, `route/app-routes.tsx` |
| Remove "Identity" group wrapper | `route/navigation.ts`, layout files |
| Update legacy redirects for new paths | `route/app-routes.tsx` |
| Add "Import profile" button on Profile page | `page/profile/ProfilePage.tsx` |
| Add back-link on Application detail page | `page/applications/applications-detail-page.tsx` |
| Add back-link on Document detail/editor pages | `page/documents/document-detail.tsx`, `page/documents/document-editor.tsx` |

**Validation:**
- `npm run test` passes
- `tsc --noEmit` passes
- `VITE_API_URL=https://api.example.com npm run build` succeeds
- Manual walkthrough: register → auto-login → dashboard → profile → leads → apply
- Sidebar labels match the revised hierarchy
- Legacy URLs still redirect correctly

### Milestone 2: Workflow Continuity & Tier Clarity

**Owner: Baldin Frontend Agent (UI), Baldin Lead Full-Stack Architect if API changes needed**
**Scope: frontend/src, possibly backend API for document-application linking**

| Task | Files Likely Affected |
|------|-----------------------|
| Add "Create document for this application" on application detail | `page/applications/applications-detail-page.tsx`, `service/documents.tsx` |
| Surface tier gate on Connect button before click | `page/directory.tsx`, `component/tier-gate.tsx` |
| Consolidate Settings into single Account page | `page/settings/*`, `route/navigation.ts`, `route/app-routes.tsx` |
| Improve welcome state on empty dashboard | `page/command-center.tsx` |
| Add contextual help text on Dashboard sections | `page/command-center.tsx` |

**Validation:**
- Same frontend checks as M1
- If backend API changes: schema regeneration + backend tests
- Tier gate visible on Directory before Connect action
- Application detail → document link round-trips

### Milestone 3: Polish & Confidence

**Owner: Baldin Frontend Agent**
**Scope: frontend/src**

| Task | Files Likely Affected |
|------|-----------------------|
| Admin tools hidden from non-superuser sidebar (not just route-guarded) | `route/navigation.ts`, `layout/app-layout.tsx` |
| Subscription page shows "Preview" banner if no payment integration | `page/settings/subscription-page.tsx` |
| Document compare and version history review for usability | `page/documents/document-compare.tsx` |
| Empty-state copy review across all pages | All pages with empty states |
| Consistent loading skeletons and error recovery | Cross-cutting |

**Validation:**
- Full frontend test + build pass
- Visual review of all empty states
- Non-superuser sidebar does not show admin tools

---

## 5. Acceptance Criteria for Milestone 1

Milestone 1 is considered complete when ALL of the following hold:

1. **Registration auto-login:** A new user who completes registration is
   automatically logged in and redirected to the Dashboard without re-entering
   credentials. The auth token is stored and UserContext is populated.

2. **Sidebar labels revised:**
   - "Command Center" → "Dashboard"
   - "Pursue" → "Jobs"
   - "Identity" group removed; "Profile" and "Documents" are separate top-level
     sidebar items
   - "Automate" → "Workflows" (or remains "Workflows" if already labeled)

3. **Documents route restructured:** `/me/documents` still works (redirect) but
   the canonical path is a top-level route (e.g., `/documents`). Secondary nav
   shows "My Documents" and "Shared With Me" if applicable.

4. **Profile route restructured:** `/me` remains the canonical profile path.
   Profile appears as its own sidebar section, not grouped with Documents.

5. **Legacy redirects preserved:** `/profile`, `/documents`, `/companies`,
   `/extractor`, `/pipelines`, `/data-orchestration` all still redirect to
   correct destinations.

6. **LinkedIn import re-entry:** The Profile page has a visible "Import"
   button/action that opens the profile import modal, regardless of whether the
   user previously dismissed it.

7. **Back-navigation on detail pages:** Application detail and Document
   detail/editor pages show a breadcrumb or back-link to the parent list.

8. **All frontend checks pass:**
   - `npm --prefix frontend run test` — green
   - `node frontend/node_modules/typescript/bin/tsc --project frontend/tsconfig.json --noEmit` — green
   - `VITE_API_URL=https://api.example.com npm --prefix frontend run build` — green

9. **No backend API changes required** (M1 is frontend-only).

10. **No hand-edits to generated artifacts** (`schema.d.ts`, `openapi.json`).

---

## 6. Owner-Selection Rationale

| Milestone | Owner | Rationale |
|-----------|-------|-----------|
| M1 | Baldin Frontend Agent | All changes are frontend-only: routing, navigation config, page components. No API contract changes. |
| M2 | Baldin Frontend Agent + Baldin Lead Full-Stack Architect (if API) | Document-application linking may need a backend endpoint. Tier gate and settings consolidation are frontend-only. |
| M3 | Baldin Frontend Agent | Pure UI polish, copy review, and visibility cleanup. |

---

## 7. Risks and Assumptions

- **Assumption:** Auto-login after registration can be implemented by having the
  register endpoint return a token, or by calling the login endpoint
  programmatically after successful registration. If the backend register
  endpoint does not return a token, a backend change is needed (escalate to
  Baldin Lead Full-Stack Architect).
- **Risk:** Renaming routes may break bookmarks or shared links. Mitigated by
  preserving all legacy redirects.
- **Risk:** Promoting Documents to top-level may feel like scope creep to the
  sidebar. Mitigated by keeping the same icon/visual treatment.
- **Assumption:** No backend API changes are needed for M1. If any surface
  during implementation, escalate to Baldin Lead Full-Stack Architect before
  proceeding.
