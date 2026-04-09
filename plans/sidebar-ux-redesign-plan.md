# Sidebar UX Redesign Plan

> **Status**: Planning artifact — no production code changes.
> **Owner**: Baldin Frontend Agent (implementation), Baldin Lead Full-Stack Architect (review).
> **Date**: 2026-04-09

---

## 1. Recommended Direction

Consolidate the permanent left sidebar from 7 visually separated sections (10 items) down to 3 labelled groups plus a fixed top entry and a new sidebar footer zone, organized around user jobs-to-be-done rather than implementation artifacts. The core change is: (a) merge Documents into the job-search group since documents in Baldin are resumes, cover letters, and job-search artifacts; (b) collapse the 3 Network sub-items into a single sidebar entry that relies on the existing secondary nav tabs; (c) demote Profile and Settings out of the main nav list into a compact sidebar footer; (d) fix the 2 missing sidebar icons; and (e) rename the "Workflows" sidebar item from "Pipelines" to "Workflows" to match its actual scope. No routes change, no pages merge, and no backend work is required. The route tree, page ownership, and secondary nav system stay intact.

---

## 2. Current State Summary

### Current sidebar structure (`navigation.ts:drawerSections`)

| # | Section key | Section label | Items | Path(s) |
|---|-------------|---------------|-------|---------|
| 1 | `top` | *(none)* | Dashboard | `/` |
| 2 | `jobs` | Jobs | Leads, Applications | `/leads`, `/applications` |
| 3 | `documents` | Documents | Documents | `/documents` |
| 4 | `profile` | Profile | Profile | `/me` |
| 5 | `network` | Network | Directory, Connections, Messages | `/network/directory`, `/network/connections`, `/network/messages` |
| 6 | `workflows` | Workflows | Pipelines | `/workflows` |
| 7 | `settings` | Settings | Settings | `/settings` |

### Current bugs and structural issues

1. **Missing icons**: `drawerIcons` in `app-layout.tsx` has no entries for `/documents` or `/settings`. These items render with an empty `<ListItemIcon>`.
2. **Singleton sections**: Documents, Profile, and Settings each burn a section heading + divider for a single item — 3 dividers and 3 section labels for 3 items.
3. **Network duplication**: Directory, Connections, and Messages each appear as top-level sidebar entries *and* as secondary nav tabs when any `/network/*` page is active. The sidebar is doing what secondary nav already does.
4. **Label mismatch**: The "Workflows" section contains an item labelled "Pipelines" at path `/workflows`. The secondary nav then shows Pipelines, Extractors, Review Queue, Crawlers. Users must click "Pipelines" to discover the other 3.
5. **No `/network` index route**: There is no index route or redirect for `/network` in `app-routes.tsx`. If a user lands on exactly `/network`, they get the error page.
6. **Unread badge coupling**: The message-unread badge is hard-coded to check `item.path === '/network/messages'`. Any path change for the Network entry requires updating this check.
7. **Settings vestiges**: Three Settings sub-routes (`subscription`, `discoverability`, `graduation`) exist only as redirects to `/settings`.

---

## 3. Proposed Navigation Model

### Target sidebar structure

```
[Logo + Baldin]                   ← existing logo zone
────────────────────
Dashboard                         ← unlabelled, always top (unchanged)
────────────────────
JOB SEARCH                        ← section label
  Leads                           → /leads
  Applications                    → /applications
  Documents                       → /documents
────────────────────
NETWORK                           ← section label
  Network                         → /network  (new: redirects to /network/directory)
────────────────────
AUTOMATION                        ← section label
  Workflows                       → /workflows  (renamed from "Pipelines")
────────────────────

       ← flex spacer ←

────────────────────
[Avatar] [User name]              → /me (Profile)
[⚙]    Settings                  → /settings
```

### What changes per destination

| Current label | Current path | Proposed label | Proposed path | Change type |
|---------------|-------------|----------------|---------------|-------------|
| Dashboard | `/` | Dashboard | `/` | Unchanged |
| Leads | `/leads` | Leads | `/leads` | Moves to "Job Search" section |
| Applications | `/applications` | Applications | `/applications` | Moves to "Job Search" section |
| Documents | `/documents` | Documents | `/documents` | Moves to "Job Search" section; leaves singleton section |
| Profile | `/me` | *(avatar row)* | `/me` | Demoted to sidebar footer |
| Directory | `/network/directory` | *(removed from sidebar)* | `/network/directory` | Accessed via secondary nav under "Network" |
| Connections | `/network/connections` | *(removed from sidebar)* | `/network/connections` | Accessed via secondary nav under "Network" |
| Messages | `/network/messages` | *(removed from sidebar)* | `/network/messages` | Accessed via secondary nav under "Network" |
| Pipelines | `/workflows` | Workflows | `/workflows` | Renamed; section renamed to "Automation" |
| Settings | `/settings` | Settings | `/settings` | Demoted to sidebar footer |

### Section count change

| Before | After |
|--------|-------|
| 7 sections, 10 items | 3 sections + top + footer, 6 items |

---

## 4. Mapping to Current Route Tree

The redesign changes **zero routes**. All existing paths, group layouts, secondary nav tabs, and page components remain valid.

| Proposed sidebar item | Navigates to | Route definition | Page component | Secondary nav |
|-----------------------|-------------|------------------|----------------|---------------|
| Dashboard | `/` | `app-routes.tsx:73` | `CommandCenterPage` | None |
| Leads | `/leads` | `app-routes.tsx:77` | `LeadsPage` | All Leads, Companies |
| Applications | `/applications` | `app-routes.tsx:83` | `ApplicationsQueuePage` | All Applications, Board |
| Documents | `/documents` | `app-routes.tsx:95` | `DocumentListPage` | None (single-page group today) |
| Network | `/network` | **New: index redirect** | → `/network/directory` | Directory, Connections, Messages |
| Workflows | `/workflows` | `app-routes.tsx:104` | `PipelinesPage` | Pipelines, Extractors, Review Queue†, Crawlers† |
| Profile *(footer)* | `/me` | `app-routes.tsx:90` | `ProfilePage` | None |
| Settings *(footer)* | `/settings` | `app-routes.tsx:121` | `AccountPage` | Account (single-tab) |

*† = superuser-only tabs*

### New route required

```tsx
// app-routes.tsx — inside <Route path="network" ...>
<Route index element={<Navigate to="/network/directory" replace />} />
```

This is the **only route-tree change** in the entire plan.

---

## 5. Alignment Assessment

### Data model alignment
✅ The proposed grouping matches the domain model. Leads, Applications, and Documents are job-search entities. Network items (directory, connections, messages) are social/communication entities. Workflows/Pipelines are automation entities. Profile and Settings are identity/configuration. No grouping crosses domain boundaries.

### Route/page ownership alignment
✅ Each proposed sidebar entry maps 1:1 to an existing route group layout. No page moves between route groups. Group layouts remain pure Outlet wrappers. Secondary nav mappings in `secondaryNavByGroup` require no changes.

### User workflow alignment
✅ Baldin's primary workflow is: discover leads → apply → manage documents → track applications. Grouping Leads, Applications, and Documents under "Job Search" mirrors this flow. Network is a secondary social workflow. Automation is an advanced/power-user workflow.

### Future scale alignment
✅ The "Job Search" section can absorb future destinations (e.g., Action Items, Interview Prep) without new sections. "Network" can absorb future social features as secondary nav tabs. "Automation" can absorb new workflow types. The footer zone can absorb future identity-adjacent destinations (notifications, preferences).

### Misalignments and constraints

| Issue | Type | Resolution |
|-------|------|------------|
| No `/network` index route | Frontend-only | Add `<Route index>` redirect in `app-routes.tsx` |
| Unread badge hard-coded to `/network/messages` | Frontend-only | Move badge to the new `/network` sidebar entry |
| Documents has no secondary nav tabs | Frontend-only | Not a blocker; single-destination groups are fine. Add secondary nav tabs later if Documents grows sub-views. |
| Settings has vestigial sub-route redirects | Frontend-only | Leave as-is; they're harmless redirects, cleanup is optional |
| "Automation" vs "Workflows" naming | Product decision | Recommend "Automation" as the section label because the route already uses `/workflows` and the secondary nav tab says "Pipelines". Three non-conflicting labels at three levels: section="Automation", sidebar="Workflows", tab="Pipelines". |

---

## 6. Frontend Surfaces Impacted

### Definitely changed

| File | Change |
|------|--------|
| `frontend/src/route/navigation.ts` | Rewrite `drawerSections` to 3 sections + top. Collapse Network items. Rename "Pipelines" → "Workflows". Export new `drawerFooterItems` array for Profile and Settings. |
| `frontend/src/layout/app-layout.tsx` | Add missing icon imports (`Description`, `Settings`). Update `drawerIcons` map. Add Network icon at `/network`. Build sidebar footer zone below the `<List>`. Move unread badge logic from `/network/messages` to `/network`. Render footer items (Profile avatar, Settings gear) below flex spacer. |
| `frontend/src/route/app-routes.tsx` | Add `<Route index element={<Navigate to="/network/directory" replace />} />` inside the network group. |

### Possibly changed (low probability)

| File | Condition |
|------|-----------|
| `frontend/src/component/common/secondary-nav-bar.tsx` | Only if we want to add Documents secondary nav tabs in this pass (not recommended). |
| `frontend/src/route/app-routes.test.tsx` | If tests assert specific sidebar item counts or paths. |
| `frontend/src/layout/network-group-layout.tsx` | Only if the new index redirect needs layout-level awareness (it doesn't — `<Navigate>` works at route level). |

### Explicitly not changed

| Surface | Reason |
|---------|--------|
| All page components | No page-level changes. Pages keep their existing `usePageToolbarHeader` behavior. |
| `secondaryNavByGroup` | Existing secondary nav definitions are correct for the new model. |
| `legacyRedirects` | No new redirects needed beyond the `/network` index. |
| Backend routes/schemas | Zero backend changes. |
| `openapi.json` / `schema.d.ts` | No contract changes. |
| Group layout files | All remain pure Outlet wrappers. |

---

## 7. Phased Execution Plan

### Phase 1 — Fix bugs and regroup sections

**Goal**: Eliminate missing icons and restructure `drawerSections` to the new information architecture without touching the sidebar rendering code beyond icon additions.

**Scope**:
- Add `Description as DocumentsIcon` and `Settings as SettingsIcon` imports to `app-layout.tsx`
- Add `/documents`, `/settings`, and `/network` entries to `drawerIcons`
- Rewrite `drawerSections` in `navigation.ts`:
  - Top section: Dashboard (unchanged)
  - "Job Search" section: Leads, Applications, Documents
  - "Network" section: single "Network" item at `/network`
  - "Automation" section: single "Workflows" item at `/workflows` (renamed from "Pipelines")
- Export new `drawerFooterItems` array: Profile (`/me`), Settings (`/settings`)
- Add `/network` index redirect in `app-routes.tsx`
- Change badge condition from `item.path === '/network/messages'` to `item.path === '/network'`

**Files**: `navigation.ts`, `app-layout.tsx`, `app-routes.tsx`
**Dependencies**: None
**Risk**: Low — regrouping `drawerSections` is a data-only change; rendering code iterates over whatever sections exist. Badge is a single conditional change.
**Validation**: `tsc --noEmit`, `npm run build`, manual check that all sidebar items render with icons and correct active states, verify `/network` redirects to `/network/directory`, verify unread badge renders on Network entry.

### Phase 2 — Build sidebar footer zone

**Goal**: Move Profile and Settings out of the main `<List>` into a visually distinct footer zone below a flex spacer.

**Scope**:
- In `app-layout.tsx`, restructure the Drawer interior:
  - Main nav `<List>` keeps `flexGrow: 0` (natural height)
  - Add `<Box sx={{ flexGrow: 1 }} />` spacer after the `<List>`
  - Add `<Divider />`
  - Render Profile as a compact avatar row (reuse existing `UserAvatar` component) that navigates to `/me`
  - Render Settings as an icon + label row that navigates to `/settings`
- Both footer items must support collapsed mode (icon-only with tooltip)
- Active-state highlighting should work identically to main nav items
- Import `drawerFooterItems` from `navigation.ts` for path/label data

**Files**: `app-layout.tsx`
**Dependencies**: Phase 1 (footer items must be defined in `navigation.ts`)
**Risk**: Medium — this is the most visual change. The sidebar `<Drawer>` currently has `<List flexGrow=1>` filling all space; adding a footer below requires restructuring the flex column inside the drawer paper.
**Validation**: `tsc --noEmit`, `npm run build`, manual check in both expanded and collapsed sidebar states, verify profile/settings active states, check short viewport behavior.

### Phase 3 — Cleanup and polish (optional)

**Goal**: Remove vestigial code and tighten up.

**Scope**:
- Remove the 3 Settings sub-route redirects (`subscription`, `discoverability`, `graduation`) from `app-routes.tsx` if they have no external link dependencies
- Verify `app-routes.test.tsx` still passes; update assertions if they reference old sidebar item counts
- Consider adding a secondary nav entry for Documents if a second document view surfaces (defer to future work)

**Files**: `app-routes.tsx`, `app-routes.test.tsx`
**Dependencies**: Phases 1-2 complete
**Risk**: Low
**Validation**: `npm run test`, `tsc --noEmit`

---

## 8. Rollout Path (Lowest Risk)

1. **Phase 1 ships first** as a single atomic change. Regrouping the sections, fixing icons, adding the `/network` index redirect, and moving the unread badge are tightly coupled — you cannot collapse Network without all four. This is the **MVP of the redesign**.

2. **Phase 2 ships separately** after Phase 1 stabilizes. The footer zone is the most visual and structurally complex change, and it is independent of the regrouping. If it takes longer or needs iteration, the app is already improved by Phase 1.

3. **Phase 3 ships opportunistically** as a cleanup pass. It is not blocking and has no user-facing impact.

This ordering means the app always has a working sidebar at every step. Phase 1 delivers the information architecture improvement. Phase 2 delivers the visual polish.

---

## 9. Pages: Merge, Rename, Nest, Demote, or Defer

| Page | Recommendation | Rationale |
|------|---------------|-----------|
| Dashboard (CommandCenterPage) | **Keep** as top-level | Primary landing; no change needed |
| Leads | **Keep** in primary nav | Core job-search workflow |
| Applications | **Keep** in primary nav | Core job-search workflow |
| Documents | **Nest** under "Job Search" section | Job-search artifact; currently orphaned in a singleton section |
| Profile | **Demote** to sidebar footer | Identity management, not a primary workflow destination |
| Directory | **Nest** under secondary nav | Already has secondary nav; remove from primary sidebar |
| Connections | **Nest** under secondary nav | Already has secondary nav; remove from primary sidebar |
| Messages | **Nest** under secondary nav | Already has secondary nav; remove from primary sidebar |
| Pipelines → Workflows | **Rename** sidebar label | "Pipelines" is misleading when the group includes Extractors, Review Queue, Crawlers |
| Settings | **Demote** to sidebar footer | Configuration, not a primary workflow destination |
| Extractors | **Defer** — leave as secondary nav tab | Not important enough for primary sidebar even after redesign |
| Review Queue | **Defer** — leave as superuser secondary nav tab | Correct placement today |
| Crawlers | **Defer** — leave as superuser secondary nav tab | Correct placement today |

---

## 10. Acceptance Criteria

An implementation agent should validate against these criteria:

### Phase 1 (MVP)
- [ ] Sidebar renders exactly 6 items in 3 labelled sections + 1 unlabelled top entry: Dashboard; Job Search (Leads, Applications, Documents); Network (Network); Automation (Workflows)
- [ ] All 6 sidebar items have visible icons (no empty `<ListItemIcon>`)
- [ ] Clicking "Network" navigates to `/network/directory`
- [ ] `/network` as a direct URL redirects to `/network/directory`
- [ ] Unread message badge renders on the "Network" sidebar entry
- [ ] Active-state highlighting works for all 6 items, including prefix matching for `/network/*`
- [ ] Secondary nav tabs for Network (Directory, Connections, Messages) render when any `/network/*` page is active
- [ ] Secondary nav tabs for Leads, Applications, Workflows are unchanged
- [ ] Collapsed sidebar (72px) renders all 6 items as icon-only with tooltips
- [ ] Profile and Settings still render in the main nav list (footer zone deferred to Phase 2)
- [ ] `tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] No console errors on navigation between all sidebar destinations

### Phase 2 (Footer zone)
- [ ] Profile and Settings are no longer in the main nav `<List>`
- [ ] Profile renders as a compact avatar row at the bottom of the sidebar, above Settings
- [ ] Settings renders as a gear icon + label row at the bottom
- [ ] Both footer items navigate to their correct paths (`/me`, `/settings`)
- [ ] Both footer items show active-state highlighting when their route is active
- [ ] Collapsed sidebar renders footer items as icon-only with tooltips
- [ ] Footer zone is visually separated from the main nav by a divider or spacer
- [ ] Sidebar scroll behavior works on short viewports (main nav scrolls, footer stays pinned)
- [ ] `tsc --noEmit` passes
- [ ] `npm run build` succeeds

### Phase 3 (Cleanup)
- [ ] Settings legacy sub-route redirects removed (if no external dependencies exist)
- [ ] `npm run test` passes
- [ ] `app-routes.test.tsx` assertions updated if needed

---

## 11. Shipping Recommendation

**This should ship as a pure frontend navigation refactor.**

Rationale:
- Zero backend changes required
- Zero contract changes required (`openapi.json`, `schema.d.ts` unaffected)
- Zero route-group restructuring (all group layouts remain intact)
- The only route-tree change is adding one `<Navigate>` index redirect
- All page components are untouched
- The change is fully contained in 3 files (`navigation.ts`, `app-layout.tsx`, `app-routes.tsx`)

No backend follow-up is needed. No broader IA refactor is required. The recommended model aligns with the current domain boundaries, page ownership, and route structure without forcing conceptual product changes.

The one product decision embedded in the plan is renaming the section from "Workflows" to "Automation" and the sidebar item from "Pipelines" to "Workflows". If that naming is contested, the redesign works equally well with the current "Workflows" section label and a renamed "Workflows" item — the structural change is the same.

---

## 12. Risks and Open Questions

| Risk | Severity | Mitigation |
|------|----------|------------|
| Users who navigate to Network via sidebar muscle memory will need one extra click to reach Messages or Connections | Low | Secondary nav tabs are already visible and the pattern is established in other groups |
| "Automation" section name may not resonate with all users | Low | Can be changed to "Workflows" if feedback is negative; it is a string in `navigation.ts` |
| Sidebar footer zone may look odd on very short viewports | Medium | Use `overflow-y: auto` on the main nav list and `flex-shrink: 0` on the footer to keep it always visible |
| `app-routes.test.tsx` may have assertions that count sidebar items or assert specific paths | Low | Check and update test assertions in Phase 3 |
| Removing Profile from main nav may confuse users who rely on it as a primary destination | Low | The avatar in the footer is a common pattern (Slack, Discord, Linear); profile is an infrequent destination |
| Network collapse removes the direct Messages sidebar shortcut | Low | The unread badge on the Network entry still signals unread messages; one click to Network, then one tab click to Messages |

---

## 13. Out of Scope

- Adding new pages, routes, or features
- Backend route or schema changes
- Mobile/responsive sidebar behavior changes (the current permanent drawer is desktop-only; responsive behavior is a separate concern)
- Sidebar search or command-palette integration
- Notification center or activity feed in the sidebar
- Dark/light theme changes beyond existing behavior
- Changes to the AppBar/toolbar (user avatar, theme toggle, and sign-out remain in the toolbar)
- Documents secondary nav tabs (deferred until Documents grows sub-views)
- Settings sub-page restoration (subscription, discoverability, graduation pages exist but are redirect-only today)

---

## 14. Downstream Owner

**Implementation**: Baldin Frontend Agent — this is a frontend-only change.
**Review**: Baldin Lead Full-Stack Architect — to verify no cross-stack assumptions were missed.
**Dispatch**: Baldin Project Manager — Phase 1 as one work slice, Phase 2 as a follow-on, Phase 3 as optional cleanup.
