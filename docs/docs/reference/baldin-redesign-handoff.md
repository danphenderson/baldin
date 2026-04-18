---
title: Baldin Redesign Handoff
description: Canonical redesign specification for Baldin's post-closeout implementation waves.
---

<!-- last-verified: 2026-04-16 -->

# Baldin Redesign Handoff

:::caution Archived
This Figma-gated redesign contract is historical as of `2026-04-17`. Active implementation now follows [v2.1 Hard Fork](./v2-1-hard-fork.md) and [v2.1 Implementation Program](../engineering/v2-1-implementation-program.md).
:::

This page records the historical redesign source of truth that existed before the `v2.1` hard fork.

Use it to answer four questions:

- what Baldin is
- how the redesign should feel across route families
- which Figma file, pages, and nodes are authoritative
- which implementation rules are fixed before code work starts

## Active Figma Contract

During redesign production, the active composed-screen working file is [Baldin Product Redesign — Command Center](https://www.figma.com/design/dVbBAwOLtz0Walj0oSP4x1).

Use these defaults:

- `Baldin Product Redesign — Command Center` is the active redesign working file.
- `Baldin-App-Screens` stays open as a reference-only behavioral archive.
- `Baldin-Library` remains the canonical reusable-component source.
- Do not copy archived capture, evidence, or baseline frames into the active working file. Reference the old file side by side instead.

The active working file must use this page order exactly:

1. `00 · Vision & Route Map`
2. `01 · Command Center System`
3. `02 · Dashboard`
4. `10 · Flagship · Profile & Aspirations`
5. `11 · Flagship · Leads`
6. `12 · Flagship · Applications`
7. `20 · Network · Discover & Connections`
8. `21 · Network · Messages`
9. `30 · Settings`
10. `40 · Workflows`
11. `41 · Admin`
12. `50 · Workspace`
13. `51 · Automation Agents`
14. `60 · Auth`
15. `70 · Marketing`

`00 · Vision & Route Map` must contain:

- the product-direction summary
- the in-scope route inventory from `frontend/src/route/app-routes.tsx`
- the redesign approval checklist
- the final route-to-page-to-node mapping table
- compact notes for any preserved behavior that still needs the archived file as a reference

`01 · Command Center System` must define:

- global navigation behavior
- app shell and command bar behavior
- collection versus detail layout rules
- heading hierarchy
- metric framing
- status tone mapping
- dialog and destructive-flow conventions
- responsive rules
- density rules
- typography contract (three-role split: display, body, mono)
- human surfaces conventions (candidate profiles, messaging warmth, empty-state empathy)
- exceptions and anti-patterns guidance
- theme parity rules (dark and light as first-class variants)
- responsive behavior rules (mobile navigation, metric collapse, touch targets)
- interaction patterns (focus, keyboard, loading, transitions, error recovery)

## Product Direction

Baldin is the command and control plane for the user's journey to employment.

The redesign must make that identity unmistakable. Every route family should feel like one instrument on a shared control surface, not a separate app that happens to share a sidebar. The user should always be able to answer the same three questions at a glance:

1. Where am I trying to go?
2. What deserves attention now?
3. What is the next highest-value action?

These principles govern every implementation wave:

1. **Direction before tracking.** Aspirations and profile define the user's intent. Leads and applications serve that intent. Collection views lead with ranked metrics and relevant status, not raw lists.
2. **Consistent situation awareness.** Every collection surface uses the same heading hierarchy, metric summary framing, and collection-to-detail drill pattern. The user should be able to navigate to any route family and immediately understand volume, status distribution, and urgency without relearning the page layout.
3. **One product, not twelve screens.** Cross-route consistency (heading hierarchy, feedback tone, status chip semantics, dialog conventions) is a first-class deliverable, not an afterthought discovered when two separately-approved waves ship different chrome.

## Command-Center Direction

The redesign should read like an employment operations room:

1. **Direction is always visible.** The current goal state, target role or company, or active workflow context must stay legible in the shell or situation header.
2. **Priorities are obvious.** Metric framing, ranking, urgency, and status tone must make the next area of attention clear before the user reads dense content.
3. **Next action is explicit.** The primary action hierarchy should leave little doubt about the most valuable next move on each route.
4. **One coordinated control surface.** Collections, detail pages, messaging, workflows, and documents must feel like one operating system, not a set of unrelated feature pages.

Visually, Baldin should be dense and operational without drifting into generic enterprise heaviness, card soup, or Tailwind or shadcn dark-mode sameness.

### Baldin vs. Generic Command Center

Baldin is not a generic operations dashboard that happens to track jobs. Five differentiators make the product unmistakable and cannot be stripped out without losing its identity:

1. **Hiring-intelligence signal ranking.** Leads and applications surface ranked signals — recruiter activity, match strength, response likelihood — not just raw status. The product does the prioritization work, not the user.
2. **Aspiration-driven direction.** The user's aspirations (target roles, companies, career themes) are a first-class data model that shapes every collection view, metric summary, and recommendation. Remove aspirations and the product becomes a flat tracker.
3. **Candidate-as-person dignity.** Messaging, profile presentation, and network surfaces treat the user as a whole person with a narrative, not a row in a pipeline. Typography, tone, and layout choices must support readable human content alongside dense operational data.
4. **Pipeline momentum as primary metric.** The dashboard and collection surfaces frame progress in terms of momentum (velocity, conversion, attention-needed) rather than static counts. The user sees whether things are moving, not just what exists.
5. **Employment journey as organizing principle.** Route families map to stages of the user's journey — aspiration → discovery → application → interview → offer — not to backend entity types. Navigation, heading hierarchy, and metric framing reinforce this arc.

## Cross-Screen Interaction Contract

These conventions are binding across all redesign work:

1. **Collection-to-detail drill.** Entity surfaces follow collection -> item -> action. Collection pages summarize state and momentum. Detail pages carry full context and actions. Dialogs handle mutations.
2. **Heading hierarchy.** Collection pages use one heading strategy, detail pages use one heading strategy, and routes do not invent local variants that break the shared reading order.
3. **Metric-first framing.** Collection surfaces lead with a `MetricStrip` or equivalent status summary that makes volume, distribution, and urgency legible before the user scans rows or cards.
4. **Feedback model.** Persistent inline issues stay inline, transient acknowledgements stay transient, and destructive actions use explicit confirmation. Do not invent route-specific feedback semantics.
5. **Status semantics.** Shared status tone mapping stays consistent across route families. Do not introduce local status-color rules that mean something different on different screens.
6. **Feature ownership.** Shared framing may be unified, but route-specific copy, entity logic, workflow behavior, and page-specific rendering remain local unless reuse is proven and promoted intentionally.
7. **Interaction model.** Focus, keyboard navigation, hover/press feedback, loading skeletons, optimistic updates, and error recovery must follow the shared interaction patterns defined in `01 · Command Center System`. Do not invent route-specific interaction models.

### Typography Contract

Three typographic roles govern all redesign surfaces. Do not apply monospace to headings, prose body, or narrative content.

| Role | Typeface | Use |
|------|----------|-----|
| **Display** | Space Grotesk | Page titles, section titles, dialog titles — structural headings that establish hierarchy and orientation. |
| **Body** | Source Sans 3 (upgrade path: Inter) | Prose, descriptions, candidate narratives, message bodies, and any content the user reads for meaning rather than scans for state. |
| **Mono** | JetBrains Mono | Data chrome — numeric values, IDs, timestamps, status tags, code snippets, metric numbers, and any content the user scans for state rather than reads for meaning. |

The display typeface must be confirmed against the repo's existing `Space Grotesk` display token in `frontend/src/design-system/tokens/typography.ts`. If a future decision replaces the display face, the handoff doc, Command Center specimens, and `Baldin-Library` typography foundation must be updated in the same slice.

### Exceptions and Escape Clause

The conventions in this contract are defaults. A route family may deviate when the deviation is documented in `01 · Command Center System` with rationale and the deviation does not break cross-screen consistency for the user.

Named exceptions:

- **MetricStrip framing.** Default: every collection surface leads with a MetricStrip. Exception: settings, auth, and marketing surfaces do not need metric framing because they are not pipeline or collection surfaces. Anti-pattern: showing a MetricStrip with all-zero or irrelevant counts just to comply with the default.
- **Heading hierarchy.** Default: collection and detail pages each use one shared heading strategy. Exception: marketing and auth surfaces may use display-weight headings that do not follow the collection/detail split because they serve a different reading intent. Anti-pattern: inventing a unique heading stack for a single route because it "feels different."
- **Density rules.** Default: density is page-level. Exception: a detail page may mix comfortable and compact zones when the page contains both narrative content (comfortable) and operational data (compact). Anti-pattern: allowing per-card or per-row density overrides that produce visual noise within a single scroll.
- **Status semantics.** Default: shared status-tone mapping is consistent across route families. Exception: a domain-specific status (e.g., "graduating" in settings) may define a local status only when no shared status already carries that meaning. Anti-pattern: redefining a shared status color for a route-specific meaning.
- **Dialog conventions.** Default: mutations use dialogs with explicit confirmation for destructive actions. Exception: lightweight inline-edit patterns may skip dialog confirmation when the edit is immediately reversible and the entity is low-risk. Anti-pattern: using a full destructive-confirm dialog for toggling a boolean setting.

## Shared-System Build Order

Before route-family pages, establish or revise the command-center language in `Baldin-Library` for:

- app shell and left navigation
- top command bar and page toolbar
- situation header for collection and detail pages
- metric deck and summary strip variants
- collection framing and inspector split patterns
- list-row and card base patterns
- section framing and dense detail blocks
- thread and conversation shell
- admin and workbench panel shells
- auth shell v2
- marketing hero and feature-band system

Keep these surfaces screen-owned until reuse is proven:

- lead-ranking modules
- application stage-lane specifics
- aspiration editing flows
- crawler, review, and admin domain actions
- document compare layouts
- agent orchestration and chat-specific behavior

## Required Route Coverage

The redesign must cover the real product surface in `frontend/src/route/app-routes.tsx`.

In scope:

- `02 · Dashboard`
  - `/dashboard`
- `10 · Flagship · Profile & Aspirations`
  - `/me`
  - `/me/aspirations/roles`
  - `/me/aspirations/companies`
- `11 · Flagship · Leads`
  - `/leads`
  - `/leads/companies`
- `12 · Flagship · Applications`
  - `/applications`
  - `/applications/board`
  - `/applications/:applicationId`
- `20 · Network · Discover & Connections`
  - `/network/discover`
  - `/network/discover/:userId`
  - `/network/connections`
- `21 · Network · Messages`
  - `/network/messages`
  - `/network/messages/:conversationId`
- `30 · Settings`
  - `/settings`
  - `/settings/subscription`
  - `/settings/discoverability`
  - `/settings/graduation`
- `40 · Workflows`
  - `/workflows`
  - `/workflows/extractors`
- `41 · Admin`
  - `/admin/`
  - `/admin/db-management`
  - `/admin/review`
  - `/admin/crawlers`
- `50 · Workspace`
  - `/workspace`
  - `/workspace/new`
  - `/workspace/:id`
  - `/workspace/:id/edit`
  - `/workspace/:id/compare`
- `51 · Automation Agents`
  - `/automation/agents`
  - `/automation/agents/:agentId`
  - `/automation/agents/:agentId/chat/:sessionId`
- `60 · Auth`
  - `/login`
  - `/register`
  - MFA challenge plus failure and retry states that live inside auth flows
- `70 · Marketing`
  - `/`

Non-blocking follow-up only after the core redesign is approved:

- `/user-terms`
- catch-all error handling

## Implementation Gates

Every in-scope route page in the active working file must include:

- one canonical desktop composition at `1440` width
- the primary populated state
- the primary empty state
- the primary inline error or warning state
- the main modal, drawer, or destructive-confirm state used by that surface
- annotations explaining behavior and layout intent rather than evidence provenance

Responsive requirements:

- required `390`-wide mobile compositions for Dashboard, Auth, Marketing, and the flagship journey pages
- required tablet or condensed behavior notes for Network
- desktop-primary only for Workflows, Admin, Workspace, and Automation Agents unless review expands them

Do not resume code implementation until all of these are true:

- `01 · Command Center System` exists and is approved
- every required page listed above exists in `Baldin Product Redesign — Command Center`
- every in-scope route maps to one approved node on `00 · Vision & Route Map`
- the route-to-page-to-node table on `00 · Vision & Route Map` is complete
- the implementation brief for the next slice cites the `Baldin Product Redesign — Command Center` file key and exact approved node IDs from that file only
- `npm --prefix docs run build` passes for the repo-side handoff updates

Approval order:

1. `01 · Command Center System`
2. `02 · Dashboard`, `10 · Flagship · Profile & Aspirations`, `11 · Flagship · Leads`, `12 · Flagship · Applications`
3. `20 · Network · Discover & Connections`, `21 · Network · Messages`, `30 · Settings`
4. `40 · Workflows`, `41 · Admin`, `50 · Workspace`, `51 · Automation Agents`, `60 · Auth`, `70 · Marketing`

## Fixed Implementation Rules

These rules are fixed before UI implementation begins:

- no ad hoc MUI shell sprawl outside `frontend/src/design-system/*`
- no new wrapper growth under legacy component folders
- no route-specific semantics promoted into shared surfaces
- no backend changes unless an approved UI need cannot be met with the current contract
- no speculative shared-foundation work before reuse is proven across approved route families, except for the cross-screen consistency rules already defined in this handoff
- application detail remains section-based; do not reintroduce tab assumptions
- applications board keeps drag and drop behavior
- messages keep edit and delete affordances plus group-thread handling
- workflow and admin surfaces keep explicit destructive, preview, confirm, and safety flows
- workspace and automation keep their feature-owned editing and monitoring semantics

Use the archived `Baldin-App-Screens` file only as behavioral reference for:

- real route states
- proven edge cases
- destructive and safety flows
- board, message, workflow, and admin behavior that cannot be flattened during redesign

Do not use the archived file to decide page layout direction, typography hierarchy, or visual styling quality.

## Derived Execution Artifacts

Use these documents as derived execution aids, not as competing redesign sources:

- [Redesign Implementation Program](../engineering/redesign-implementation-program.md)
- `plans/redesign/implementation-brief-template.md`
- `plans/redesign/wave-01-flagship-journey.md`
- `plans/redesign/wave-02-network.md`
- `plans/redesign/wave-03-settings-profile.md`
- `plans/redesign/wave-04-workflows-admin.md`
- `plans/redesign/wave-05-workspace-automation.md`

Dashboard, Auth, and Marketing require their own implementation briefs once the active working file is approved. The existing wave packets do not replace the route-to-node table on `00 · Vision & Route Map`.

If a derived packet conflicts with this handoff, the handoff wins.

## Non-Goals

This redesign phase does not exist to:

- reopen evidence capture as an ongoing planning loop
- turn every repeated visual choice into a shared abstraction
- invent backend work before an approved UI need proves it
- treat route families as disconnected screen buckets
- rebuild Baldin around generic Tailwind, shadcn, or Make scaffolding

Use the implementation program and route-family packets to execute this redesign only after the full-product Figma approval gate is satisfied. Do not treat them as a second place to redefine what Baldin is or how the redesign should work.
