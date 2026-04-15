---
title: Baldin App Screens Polish Ledger
description: Per-screen UX polish findings from a Figma-first audit of Baldin-App-Screens against Baldin-Library shared surfaces.
---

<!-- last-verified: 2026-04-15 -->

# Baldin App Screens Polish Ledger

Figma-first UX polish audit of all 20 reviewed screens in [Baldin-App-Screens](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy/Baldin-App-Screens) against the 16 shipped [Baldin-Library](https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library) shared surfaces. This ledger captures specific findings and recommended Figma edits per screen across six focus areas.

**Scope:** Figma-only polish findings. No new shared-surface promotion, code integration, or harness expansion.

**Evidence sources:** Figma MCP metadata reads for both files, shipped code review of all 20 inventoried page components, and the reviewed [Baldin App Screens Inventory](./baldin-app-screens-inventory.md).

**Severity scale:**
- **High** — Missing states or broken hierarchy in core flows. Directly impacts the user's understanding of what the app does in a given state.
- **Medium** — Inconsistent library surface or token usage. Does not break comprehension but erodes visual trust.
- **Low** — Minor spacing, alignment, icon, or typographic polish. Noticeable on close inspection only.

## Focus 1: Consistency with Baldin-Library Shared Surfaces

Library baseline: 16 mapped surfaces in the [Design System Catalog](./design-system-catalog.md).

| Screen | Severity | Finding | Recommended Figma edit | Library surface reference |
| --- | --- | --- | --- | --- |
| Application detail | **High** | Code uses raw MUI `<Alert severity="error">` for API errors instead of `InlineFeedback`. The Figma frame should show the canonical InlineFeedback treatment, not a generic alert box. | Replace any raw alert-style error region with an InlineFeedback (tone="error") instance from Baldin-Library. | InlineFeedback `30-62` |
| Application detail | **Medium** | Code renders field-level loading with raw `<Skeleton>` components rather than the canonical `LoadingState`. The Figma frame should clarify whether individual field skeletons or a section-level LoadingState is the intended loading treatment. | Add a dedicated "loading" state frame showing `LoadingState` with section-appropriate `kind` and `itemHeight`, or document the per-field skeleton intent if that is the chosen pattern. | LoadingState `202-83` |
| Conversation detail | **High** | Code uses raw `<CircularProgress>` instead of the canonical `LoadingState` component for the page-level loading state. The Figma frame for conversation detail loading should show `LoadingState`, not an improvised spinner. | Replace any centered-spinner loading frame with a `LoadingState` instance (kind="list" or "detail"). | LoadingState `202-83` |
| Conversation detail | **Medium** | Code uses a local `<Snackbar>` instead of the app-level notification pattern. The Figma frame for transient action feedback (message sent, deleted, etc.) should show the canonical snackbar overlay from the notification system. | Add a snackbar overlay annotation or frame showing the canonical app-wide notification pattern for transient action feedback. | *(app-level pattern, not a single library surface)* |
| Applications queue | **Medium** | Stage-tone color mapping function (`stageTone()`) is defined locally; the same logic is duplicated in the board page. Figma frames for both queue and board should use identical tone-to-color mappings for status chips. | Ensure the stage StatusChip instances in the queue frame use the same Figma styles (color fills, text colors) as the board's lane headers and card chips. | StatusChip `5-34` |
| Applications board | **Medium** | Duplicates the stage-tone color mapping from the queue. The board lane headers and card status chips should use the same canonical StatusChip variant and color binding as the queue view. | Cross-check lane header colors and card StatusChip fills against the queue's StatusChip instances for exact match. | StatusChip `5-34` |
| Profile baseline | **Medium** | Profile uses a custom `ProfileHero` and `ProfileSection` component pattern not backed by any Baldin-Library surface. The Figma frames for profile section headers use a unique layout (icon + title + count chip + action button + divider). | Document the profile section header as a "feature-owned" pattern in the Figma frame annotations. Do not force it into a library surface, but ensure its spacing, typography scale, and chip treatment match the closest library equivalents (SectionHeader `6-24`, StatusChip `5-34`). | SectionHeader `6-24`, StatusChip `5-34` |
| Account settings | **Medium** | Code uses raw MUI `<Alert>` instead of `InlineFeedback` for subscription tier feedback. The Figma frame should show InlineFeedback. | Replace any raw Alert treatment with an InlineFeedback instance. | InlineFeedback `30-62` |
| Extractor workflow | **Medium** | Code uses raw MUI `<Dialog>` components instead of `SurfaceDialog` or `FormDialogShell` for the create/run extractor modals. The Figma frames for extractor dialogs should show the canonical SurfaceDialog shell. | Replace any generic dialog frames with SurfaceDialog instances, using SurfaceDialogTitle, SurfaceDialogContent, and SurfaceDialogActions slots. | SurfaceDialog `45-33`, FormDialogShell `8-24` |
| Crawlers | **Medium** | Code uses a local `RunStatusChip` wrapper around MUI `<Chip>` instead of the canonical `StatusChip`. The Figma frames for run status indicators should use StatusChip instances with the correct tone mapping. | Replace any local chip styling in crawler run-status indicators with StatusChip instances from Baldin-Library. Map status → tone: success → success, failed → danger, pending/running → info, cancelled/paused → warning. | StatusChip `5-34` |
| Review queue | **Medium** | Code renders review item type as an inline badge, not using the canonical StatusChip. The Figma frame for type indicators should use StatusChip instances. | Replace inline type badges with StatusChip instances. | StatusChip `5-34` |

## Focus 2: Visual Hierarchy

| Screen | Severity | Finding | Recommended Figma edit |
| --- | --- | --- | --- |
| Applications queue | **Medium** | Code uses `usePageToolbarHeader()` (dynamic AppBar title/subtitle) but no `PageTitle` component. The toolbar header pattern provides a title + subtitle in the sticky AppBar, while other pages (Application detail, Dashboard) use `PageTitle` as an in-content heading. The queue frame should clarify: is the AppBar title the sole heading or should a `PageTitle` also appear below it? | Add an annotation to the Figma frame documenting the intended heading strategy: toolbar-header-only for collection pages vs. in-content `PageTitle` for detail pages. Apply this decision consistently across all collection pages (queue, board, leads, messages, settings). |
| Applications board | **Medium** | Same toolbar-header-only pattern as the queue. Board lane headers use h6-equivalent column titles, but there is no in-content page heading. | Align with the queue heading decision. If toolbar-header-only is canonical for collections, ensure the board frame's lane header typography (h6 for column names) is consistent with the queue's section rhythm. |
| Conversations list | **Medium** | Uses `SectionHeader` component (icon + title + count + action button) below the toolbar header. This is the only collection page that uses `SectionHeader` as a sub-heading within the main content area. | Decide whether `SectionHeader` is the intended sub-heading treatment for conversations or if it should align with the toolbar-header-only pattern used by applications and leads. If keeping it, ensure the Figma frame shows the SectionHeader instance from Baldin-Library. |
| Conversation detail | **Medium** | Uses toolbar-header-only. No in-content `PageTitle` or `SectionHeader`. Message thread has no visual content-area heading. | Add a thread-title treatment (e.g., conversation subject or participant names) at the top of the content area to establish visual hierarchy between the toolbar header and the message stream. |
| Dashboard | **Low** | Uses `PageTitle` as an in-content heading. This is currently the most explicit heading treatment among major pages. | Keep as the reference pattern. Ensure font size, weight, and spacing match the typography token scale (`h4` or equivalent from `typography.ts`). |
| Profile baseline | **Low** | `ProfileHero` card serves as the visual heading, with no `PageTitle`. The hero card (avatar, name, headline, completion badge) is unique to this page. | No Figma change needed — the hero card is a valid feature-owned heading treatment. Add an annotation noting this is intentionally distinct from PageTitle. |
| Settings pages | **Medium** | Uses toolbar-header-only with no in-content heading. The account settings page renders a subscription tier table and MFA card without section framing. | Add SectionHeader or SectionCard framing to group the subscription tier table and MFA card into distinct visual sections. |
| Leads | **Low** | Uses toolbar-header-only. The MetricStrip provides secondary visual hierarchy. Well-structured. | No change needed. The toolbar-header + MetricStrip pattern is the cleanest collection page layout. |

## Focus 3: Empty / Loading / Error Behavior

### State coverage gap matrix

| Screen | Loading frame | Empty frame | Error frame | Gap notes |
| --- | --- | --- | --- | --- |
| Applications queue | ✅ `LoadingState` | ✅ `EmptyState` | ⚠️ Mixed (`InlineFeedback` + notifications) | Error frame should standardize on InlineFeedback for inline errors and snackbar for transient actions. |
| Applications board | ✅ `LoadingState` | ✅ Per-column `EmptyState` with board-specific hints | ⚠️ Mixed (`InlineFeedback` + `ConfirmDialog` + Snackbar) | Verify the per-column empty hints are present in Figma; they add useful onboarding context. |
| Application detail | ⚠️ `Skeleton` only | ❌ None (assumes entity exists) | ⚠️ Raw `Alert` | **High gap.** Add an error frame showing InlineFeedback for "application not found" and a loading frame showing the section-skeleton layout. |
| Leads | ✅ `LoadingState` | ✅ `EmptyState` | ✅ Notification toast | Strongest current state coverage. Reference pattern. |
| Apply | ✅ Implied | ✅ Implied (`already-applied`) | ⚠️ Unclear | Verify the "already-applied" empty state and any error path (e.g., missing ranked lead) have distinct Figma frames. |
| Profile baseline | ✅ Custom 3-section `LoadingState` | ⚠️ Builder panel (auto-opens when completion is 0%) | ✅ `InlineFeedback` | The builder-panel-as-empty-state is a valid product decision. Add a Figma annotation noting this intent. |
| Profile MFA states | ⚠️ Included in parent loading | ❌ N/A (MFA always has a state) | ✅ `InlineFeedback` | Add explicit MFA loading frame if the QR setup step has an async delay visible to the user. |
| Messages baseline | ✅ `LoadingState` (kind="list") | ✅ `EmptyState` | ✅ Notification toast | Good coverage. |
| Conversation detail | ⚠️ Raw `CircularProgress` | ❌ No empty-thread frame | ⚠️ Inline state + local Snackbar | **High gap.** Add an empty-thread `EmptyState` frame and replace loading with `LoadingState`. |
| Aspirations roles | ✅ `loading` state in harness | ✅ `empty` state in harness | ⚠️ `no-signal` and `rate-limited` exist but not fully backed | Ensure `no-signal` and `rate-limited` frames in Figma show InlineFeedback with appropriate tone and copy. |
| Aspirations companies | ✅ `loading` state in harness | ✅ `empty` state in harness | ⚠️ Same as roles | Same recommendation as aspirations roles. |
| Login baseline | ⚠️ Bitmap-only matrix | ❌ N/A | ⚠️ Broken error row | The large login matrix was moved to Wave 3 as `[Needs Recapture] Login States`. `Login · Error · dark` is blank; baseline and loading rows are bitmap-only evidence, not canonical editable design layers. |
| Register baseline | ⚠️ Bitmap-only matrix | ❌ N/A | ⚠️ Bitmap-only evidence | The large register matrix was moved to Wave 3 as `[Needs Recapture] Register States`. Existing rows show baseline, password rules, validation error, and loading as bitmap-only captures that need review-ready recapture. |
| Login MFA challenge | ⚠️ Bitmap-only matrix | ❌ N/A | ⚠️ Bitmap-only evidence | The large MFA matrix was moved to Wave 3 as `[Needs Recapture] Login MFA Challenge States`. Existing challenge, error, and loading rows are bitmap-only captures that need review-ready recapture. |
| Admin login states | ✅ Session-resolving spinner | ❌ N/A | ⚠️ Unclear | **Medium gap.** Add a dedicated "resolving authenticated session" frame showing the full-page centered spinner, distinct from the normal login form. |
| Admin access denied | ❌ N/A | ❌ N/A | ✅ Dedicated access-denied state | The access-denied frame should clearly show both exit CTAs: "Sign in again" and "Open product app." |
| Extractor workflow | ⚠️ Bitmap-only matrix | ✅ `EmptyState` (no extractors) | ✅ Snackbar | The large extractor matrix was moved to Wave 3 as `[Needs Recapture] Extractor Workflow States`. `Extractor Workflow · Create Extractor Dialog · dark` is blank; remaining rows are bitmap-only captures. Extractors remain a product-app workflow at `/workflows/extractors`, not an Admin SPA route. |
| DB management | ✅ Per-section loading | ✅ `EmptyState` (no users matching filter) | ✅ Per-section `Alert` | Ensure the destructive-action confirmation path (preview → confirm) has distinct Figma frames for each step. |
| Review queue | ✅ Implied | ✅ `EmptyState` ("Review queue is clear") | ✅ Snackbar | Confirmed via Figma MCP: empty state is present (node `192:4929`). Batch-action loading state should be explicit. |
| Crawlers | ✅ `MetricStrip` loading + skeleton cards | ✅ Implied (no pipelines) | ✅ Color-coded failed-run indicator | Verify the empty-pipelines state has a dedicated EmptyState frame, not just an absent card list. |

### Specific findings

| Screen | Severity | Finding | Recommended Figma edit | Library surface reference |
| --- | --- | --- | --- | --- |
| Application detail | **High** | No error state frame exists. Code renders a raw MUI Alert for "not found" or API failure. | Add an error state frame showing InlineFeedback tone="error" with "Application not found" or "Failed to load application" copy and a "Back to applications" CTA. | InlineFeedback `30-62` |
| Application detail | **High** | Loading state uses per-field Skeleton rather than the canonical LoadingState. If this is intentional (denser skeleton layout), document it. If not, the frame should show LoadingState. | Add a loading state frame. If using field-level skeletons, annotate the frame as "feature-owned skeleton layout" to distinguish from the library pattern. | LoadingState `202-83` |
| Conversation detail | **High** | No empty-thread frame. When a new conversation is started with no messages, the screen shows nothing. | Add an EmptyState frame for "No messages yet — start the conversation" with a message-input focus CTA. | EmptyState `47-65` |
| Conversation detail | **High** | Loading state uses raw CircularProgress. | Replace with a LoadingState frame showing kind="detail" or kind="list" to match message-stream layout. | LoadingState `202-83` |
| Admin login states | **Medium** | The "resolving authenticated session" intermediate state (full-page centered spinner) needs its own frame to distinguish from the login form and the redirect state. | Add a distinct "Session resolving" frame showing a centered LoadingState or spinner with explanatory copy (e.g., "Checking authentication..."). | LoadingState `202-83` |
| Crawlers | **Medium** | No explicit empty-pipeline EmptyState frame verified via MCP. The code implies one exists, but the Figma coverage should show it explicitly. | Add or verify an EmptyState frame for "No crawler pipelines configured" with a "Create pipeline" CTA. | EmptyState `47-65` |

## Focus 4: Auth Friction

| Screen | Severity | Finding | Recommended Figma edit |
| --- | --- | --- | --- |
| Login → MFA challenge | **High** | The transition from the baseline login form to the MFA challenge step is a conditional render replacement in code — the entire form swaps. In Figma, these should be two clearly distinct frames (not just a text change within one frame) to show the user that MFA is a separate auth step. The MFA step uses "Two-Factor Authentication" as its title, a 6-digit code field, a "Verify" button, and a "Back to login" link. | Ensure two separate Figma frames exist: (1) Login baseline with email + password + "Sign In" CTA, (2) MFA challenge with title "Two-Factor Authentication," the 6-digit code input, "Verify" CTA, and "Back to login" link. Both frames should use AuthPanel as the container. |
| Register | **Medium** | The password-rules checklist (4 rules with check/close icons) and the `LinearProgress` strength bar are important onboarding signals that must be visible in the Figma frame. If the register frame only shows the form fields without the rules list, the design will underweight the password guidance UX. | Ensure the register frame includes: (1) the strength bar (LinearProgress with error → warning → success color transitions), (2) the four password rules with checkbox icons (at least 8 chars, one uppercase, one lowercase, one digit), (3) the "Already have an account? Sign in" footer link. |
| Register | **Low** | The registration form auto-logs-in on success and redirects. If MFA is required post-registration, it falls back to `/login`. This flow branch isn't visually represented. | Add a brief annotation noting the post-registration flow: success → auto-login → redirect, or if MFA is required → redirect to login with MFA prompt. No separate Figma frame needed for this edge case. |
| Admin login | **Medium** | The admin login reuses `LoginPage` with custom props (title, description, icon, footer). The Figma frame must show these admin-specific overrides clearly: different title ("Admin Console" or similar), different description, and a different footer ("Back to product app" instead of "Register"). | Verify the admin login frame uses AuthPanel but with admin-specific title, description, and footer text. If the frame currently shows generic login copy, update it to match the admin variant. |
| Admin access denied | **Medium** | The access-denied state clears the unauthorized session and shows two exit CTAs. The "Sign in again" button should be primary and "Open product app" should be secondary/text, to guide the user toward the expected recovery path. | Verify the CTA hierarchy in the Figma frame: "Sign in again" as the primary contained button, "Open product app" as a secondary or text button. Ensure the error copy is clear (e.g., "You don't have admin access" not just a generic 403). |
| Admin session-resolving | **Medium** | The intermediate state between opening `/admin/*` with a valid token and completing the superuser check shows a full-page CircularProgress. This transient state exists in code but may not have a dedicated Figma frame. | Add a "Resolving session" frame if missing, showing a centered spinner with "Verifying admin access..." copy. This prevents the user from seeing an unexplained blank screen during auth resolution. |

## Focus 5: Message and Application Detail Clarity

| Screen | Severity | Finding | Recommended Figma edit |
| --- | --- | --- | --- |
| Conversation detail | **High** | Message bubble visual hierarchy: the code renders messages as card-like containers with sender attribution and timestamps. The Figma frame should clearly show: (1) sent vs. received message alignment or color differentiation, (2) sender name placement relative to the message body, (3) timestamp placement (below-right of message or inline). | Ensure the conversation detail frame includes at least 3 sample messages with visible sender names, timestamps, and distinct treatment for sent vs. received messages. Use SurfaceCard or a clearly annotated feature-owned card pattern for message containers. |
| Conversation detail | **Medium** | Edit/delete affordance for messages: the code shows a hover or contextual menu with edit and delete options, each opening a SurfaceDialog. These interaction patterns should be represented in the Figma frame as separate state views or overlay annotations. | Add overlay or contextual-menu annotation showing the edit/delete affordance on hover. Include a "Delete message" ConfirmDialog frame and an "Edit message" inline editing state frame. |
| Conversation detail | **Low** | Participants sidebar: the code renders a sidebar with participant names and avatars for group conversations. If the sidebar is not represented in the detail frame, the group-conversation UX will be underspecified. | Verify the group-thread variant of the detail frame includes the participant sidebar. If absent, add a "group thread with participants" variant. |
| Application detail | **High** | Tab navigation (overview / timeline / documents): the code uses vertical tabs on desktop. The Figma frame should clearly show the tab structure and the content area for each tab, not just the overview state. | Ensure the application detail frame has at least two visible tab states: (1) overview tab with status, stage, and action items, (2) timeline tab with status-history entries. A documents tab frame is optional but recommended. |
| Application detail | **Medium** | Status chip + stage clarity: code renders `StatusChip` with stage-specific tone and a stage label. The stage-to-tone mapping should match the queue and board views exactly. | Verify the application detail's status chip uses the same tone → color binding as the queue and board's stage indicators. Cross-reference with StatusChip library variant. |
| Application detail | **Medium** | Action-item dialog: code uses `SurfaceDialog` for action items. Ensure the dialog frame shows the full slot structure (SurfaceDialogTitle with action, SurfaceDialogContent, SurfaceDialogActions with primary + secondary buttons). | Add an action-item dialog overlay frame using the SurfaceDialog library instance. |
| Application detail | **Low** | Next-step reminder: code renders reminders as inline cards with a date and description. The reminder visual treatment should be consistent across queue, board, and detail. | Verify reminder card styling in the detail frame matches the overdue-reminder indicator used in the board and queue. |
| Applications board | **Medium** | Drag affordance: the code uses dnd-kit for drag-and-drop between lanes. The Figma frame should show a "dragging" state for an application card (elevated, semi-transparent, or outlined) and a "drop target" visual on the receiving lane. | Add a "dragging card" overlay state and a "drop target lane highlight" frame or annotation. |
| Applications board | **Low** | Overdue-reminder visual treatment: code shows a colored indicator on cards with overdue next-step reminders. The indicator color should use the canonical `warning` or `danger` tone from the status token scale. | Verify the overdue indicator color in the board frame matches `theme.palette.warning.main` or `theme.palette.error.main` from the design token scale. |
| Applications queue | **Low** | Sort and filter affordance: code renders a toolbar with sort dropdown and stage/status filter chips. The Figma frame should clearly show the filter state (active filter chips highlighted, clear-all option visible). | Verify the toolbar frame in the queue shows both the collapsed (default) and expanded (filters active) states. |

## Focus 6: Privileged Admin Workflow Usability

Admin frames confirmed via Figma MCP: DB management (`184:4929`), Review queue (`192:4929`), Crawlers (`201:4929`).

| Screen | Severity | Finding | Recommended Figma edit |
| --- | --- | --- | --- |
| DB management | **High** | Destructive-action gating: the code implements a two-step path (preview → confirm) for user data cleanup and a separate full-delete path. The Figma frame must clearly show both the preview step (what will be deleted) and the ConfirmDialog with warning language. Self-deletion and last-superuser deletion are blocked in code — this safety gate should be visually annotated. | Add or verify these DB management sub-state frames: (1) data cleanup domain checkboxes, (2) preview results panel, (3) ConfirmDialog with destructive-action warning, (4) annotation noting self-delete and last-superuser blocks. |
| DB management | **Medium** | MetricStrip at the top of the page shows database status metrics. Verified via MCP metadata that the page has a title/subtitle header and a "Refresh" button. The MetricStrip should use the `variant="card"` treatment from code. | Verify the MetricStrip in the Figma frame uses the card variant (individual metric cells as raised cards, not inline text). |
| DB management | **Low** | Table browser: the sidebar-style layout (left panel = table list with search, right panel = table detail with columns and row count) is a feature-owned pattern. | Ensure the table browser panel layout is represented in the Figma frame with at least one table selected and showing column details. The current Figma capture (68KB metadata) suggests this is already present. |
| Review queue | **Medium** | Batch action toolbar: code shows a "Selected (N)" badge with "Approve Selected" and "Reject Selected" buttons only when items are selected. The Figma frame (currently showing empty queue, `192:4929`) does not show the batch toolbar because the queue is empty. | Add a "populated queue" variant frame showing: (1) items with checkboxes, (2) the batch toolbar with selected count and approve/reject buttons, (3) an expanded row showing full item detail JSON. |
| Review queue | **Medium** | Type filter badges: the dropdown shows item counts per type as "(count)" badges. This should be shown in the Figma frame for the populated state. | Include the type filter dropdown in the populated queue frame with example counts for each review type. |
| Review queue | **Low** | Expand-to-detail: individual items expand to show full JSON detail. This affordance (expand icon or row click) should be visible in the frame. | Add an expanded-row state showing the JSON detail panel below a selected item. |
| Crawlers | **Medium** | Pipeline card expand/collapse: code uses Framer Motion `AnimatePresence` for expand/collapse animation. The Figma frame should show both collapsed and expanded states of a pipeline card. | Ensure the Figma frame includes: (1) a collapsed pipeline card (name, source badge, enabled toggle, last-run status), (2) an expanded card with schedule details, execution policy, and the recent-runs table. |
| Crawlers | **Medium** | Create/edit pipeline dialog: the dialog includes complex JSON fields (query_definition, schedule_definition, execution_policy, extraction_policy) with AI-assisted editing. This is a power-user surface. | Add a create/edit pipeline dialog frame showing the FormDialogShell with at least 2 visible JSON fields and the enabled/requires_approval toggles. |
| Crawlers | **Low** | Run-history table pagination: each expanded pipeline card shows a paginated table of recent runs (default 10 rows). The run status chips should use the canonical StatusChip variant. | Verify the run-history table in the expanded card uses StatusChip instances with the correct status → tone mapping. |

## Cross-Screen Summary

### Patterns that need Figma alignment

1. **Collection page heading pattern:** Applications queue, Applications board, Leads, Messages, and Settings all use the toolbar-header-only pattern (title + subtitle in the sticky AppBar). Application detail and Dashboard use in-content `PageTitle`. Conversations list uniquely uses both toolbar-header and `SectionHeader`. Recommend standardizing: toolbar-header-only for collection pages, in-content PageTitle for detail/landing pages.

2. **Error feedback surface:** InlineFeedback is canonical. Application detail, Account settings, and DB management still show raw MUI `Alert` in code. Crawlers and Review queue use Snackbar. Figma frames should standardize on InlineFeedback for inline errors and snackbar overlays for transient action feedback.

3. **Loading surface:** LoadingState is canonical. Conversation detail using raw CircularProgress and Application detail using raw Skeleton are the main gaps. Figma frames should show LoadingState except where feature-owned skeleton layouts are documented.

4. **Dialog surface:** SurfaceDialog is canonical. Extractor workflow still uses raw MUI Dialog in code. Figma frames for all dialogs should use the SurfaceDialog slot structure unless a documented exception exists.

5. **Status indicator surface:** StatusChip is canonical. Crawlers' RunStatusChip and Review queue's inline type badges are the main gaps. Figma frames should use StatusChip instances for all status indicators.

### Screens with no polish findings

None. Every screen has at least one finding. The cleanest screen is **Leads** (all Low severity — it is the strongest current reference pattern).

## Figma Frame Coverage Confirmation

### Cleanup update (2026-04-15)

The large auth and extractor state matrices were removed from `Flagship Flow Screens` because they are not part of the flagship aspirations → ranked leads → apply-handoff story and are not review-ready. They now live on `Wave 3 · Auth & Workflow Screens` with `[Needs Recapture]` prefixes:

| Matrix | Node ID | Current status |
| --- | --- | --- |
| `[Needs Recapture] Login States` | `131:6090` | Partial. `Login · Error · dark` is blank; other rows are bitmap-only captures. |
| `[Needs Recapture] Login MFA Challenge States` | `131:6098` | Partial. Rows are bitmap-only captures. |
| `[Needs Recapture] Register States` | `131:6106` | Partial. Rows are bitmap-only captures. |
| `[Needs Recapture] Extractor Workflow States` | `131:6116` | Partial. `Extractor Workflow · Create Extractor Dialog · dark` is blank; other rows are bitmap-only captures. |

### Pre-existing frames (confirmed via MCP metadata reads)

| Screen | Node ID | Page | Frame name | Notes |
| --- | --- | --- | --- | --- |
| Messages baseline | `1:2` | Baseline Captured Screens | Baldin Wave 1 Harness · messages · dark | Full harness capture with SectionHeader, conversation rows |
| Profile baseline | `2:2` | Baseline Captured Screens | Baldin Wave 1 Harness · profile · light | Full harness capture with hero, completion card, and 7 profile sections |
| Applications queue | `5:2` | Baseline Captured Screens | Baldin Wave 1 Harness · applications · dark | Full harness capture with MetricStrip, toolbar, and application cards |
| Leads ranked | `46:1167` | Baseline Captured Screens | Baldin Wave 1 Harness · leads · ranked · dark | Full harness capture with ranked lead cards |

### Frames created in polish implementation pass (2026-04-15)

All 13 previously unconfirmed frames were verified MISSING from the Figma file on 2026-04-15. The 3 admin-capture frames listed in the original audit (184:4929, 192:4929, 201:4929) were also absent. 23 new frames were created across 4 new pages.

**Page: Wave 2 · Detail & State Screens** (page ID `221:1168`)

| Screen | Node ID | Frame name | Findings addressed |
| --- | --- | --- | --- |
| Application detail error | `227:1167` | Application Detail · Error | HIGH: InlineFeedback error state replacing raw MUI Alert |
| Application detail loading | `227:1179` | Application Detail · Loading | HIGH: LoadingState detail skeleton replacing per-field Skeleton |
| Application detail overview | `227:1203` | Application Detail · Overview | HIGH: Tab navigation (overview/timeline/docs), StatusChip from library |
| Conversation detail loading | `228:1168` | Conversation Detail · Loading | HIGH: LoadingState list skeleton replacing CircularProgress |
| Conversation detail empty | `228:1203` | Conversation Detail · Empty Thread | HIGH: EmptyState with message-input CTA |
| Conversation detail baseline | `228:1217` | Conversation Detail · Baseline | HIGH: Sent vs received message hierarchy, sender names, timestamps |
| Profile MFA disabled | `235:1168` | Profile · MFA Disabled | MED: Section framing, security tab, Enable 2FA CTA |
| Profile MFA setup QR | `235:1191` | Profile · MFA Setup QR | MED: QR code + manual entry + verification input |
| Profile MFA enabled | `235:1207` | Profile · MFA Enabled | MED: Active state with recovery codes, Disable 2FA with ConfirmDialog annotation |
| Profile MFA recovery | `235:1229` | Profile · MFA Recovery Notice | MED: Recovery codes grid, warning InlineFeedback, Copy All CTA |
| Applications board loading | `237:1168` | Applications Board · Loading | MED: Skeleton columns replacing generic loading |
| Applications board empty | `237:1192` | Applications Board · Empty | MED: EmptyState with Add Application CTA + secondary link |

**Page: Wave 3 · Auth & Workflow Screens** (page ID `221:1169`)

| Screen | Node ID | Frame name | Findings addressed |
| --- | --- | --- | --- |
| Login baseline | `229:1167` | Login · Baseline | HIGH: AuthPanel with email + password + Sign In CTA |
| Login MFA challenge | `229:1185` | Login · MFA Challenge | HIGH: Distinct auth step with 6-digit code, Verify CTA, Back to login |
| Register baseline | `229:1202` | Register · Baseline | MED: Password rules checklist, LinearProgress strength bar, 4 validation rules |
| Admin login baseline | `232:1167` | Admin Login · Baseline | MED: AuthPanel with admin-specific title/description/footer |
| Admin session resolving | `232:1185` | Admin Login · Session Resolving | MED: Centered spinner with "Verifying admin access..." copy |
| Admin access denied | `232:1192` | Admin · Access Denied | MED: CTA hierarchy: primary "Sign in again", secondary "Open product app" |
| Extractor workflow | `232:1202` | Extractor Workflow · Baseline | MED: Two-column layout with StatusChip library instance, SurfaceDialog annotation |

The single baseline frames above remain useful reference sketches. They do not replace the moved `[Needs Recapture]` matrices, which still need nonblank, review-ready state coverage.

**Page: Admin · Privileged Workflows** (page ID `221:1170`)

| Screen | Node ID | Frame name | Findings addressed |
| --- | --- | --- | --- |
| DB management baseline | `234:1167` | DB Management · Baseline | HIGH: Destructive actions in danger zone, ConfirmDialog annotation |
| DB management confirm | `234:1198` | DB Management · Confirm Dialog | HIGH: Type-to-confirm pattern, disabled button until match |
| Review queue baseline | `234:1215` | Review Queue · Baseline | MED: CollectionToolbar visual ref, StatusChip tone consistency |
| Crawlers baseline | `234:1239` | Crawlers · Baseline | MED: StatusChip library instances (Success, Danger), schedule section |

**Page: Wave 1 · Aspirations & Apply** (page ID `221:1167`)

| Screen | Node ID | Frame name | Findings addressed |
| --- | --- | --- | --- |
| Aspirations roles matrix | `236:1167` | Aspirations · Roles Matrix | MED: SectionCard pattern, role cards with skills, match percentages |
| Aspirations companies matrix | `236:1216` | Aspirations · Companies Matrix | MED: Company cards with logo, industry, open role count |
| Apply matrix | `236:1253` | Apply · Matrix | MED: Kanban board with 4 columns, StatusChip per stage |

### Library component usage in new frames

- **StatusChip** (imported from library): Used in Application Detail Overview, DB Management Baseline, Extractor Workflow, Crawlers (Success + Danger variants)
- **Visual representations** (built faithfully, annotated with library node refs): InlineFeedback, LoadingState, EmptyState, AuthPanel, ConfirmDialog, CollectionToolbar, SurfaceDialog — these components are not published to the team library and cannot be imported cross-file

## Next Owners

| Owner | Responsibility | Exit condition |
| --- | --- | --- |
| Baldin Design Lead Agent | ✅ **Completed 2026-04-15.** Created 23 frames covering the original High-severity and qualifying Medium-severity Figma findings. | Single-frame references exist for the original findings, but the moved auth/extractor matrices still require recapture. |
| `baldin_frontend` | Recapture the moved `[Needs Recapture]` Wave 3 auth and extractor matrices. | `Login · Error · dark` and `Extractor Workflow · Create Extractor Dialog · dark` are no longer blank, and all auth/extractor rows are review-ready captures or editable compositions. |
| Baldin Frontend Agent | Review Medium-severity code consistency findings (InlineFeedback vs Alert, LoadingState vs CircularProgress, SurfaceDialog vs raw Dialog, StatusChip vs local chip wrappers) and decide which to fix in code vs. accept as feature-owned patterns. | Each Medium finding is either resolved in code or documented as intentional in the design-system catalog. |
| Baldin Lead Full-Stack Architect | Review the cross-screen summary for any pattern decisions that should be formalized in design-system governance docs. | Collection-page heading pattern, error feedback surface, and dialog surface decisions are documented. |
| Baldin Design Lead Agent | Publish remaining library components (InlineFeedback, LoadingState, EmptyState, AuthPanel, ConfirmDialog, SurfaceDialog, SurfaceCard, CardShell) to the team library so future App-Screens frames can import them directly instead of using visual representations. | All 8 unpublished components are published and importable cross-file. |
