# Baldin Frontend Design System Rollout Plan

## Executive Summary
- Build the design system on top of the existing MUI foundation in [theme-provider.tsx](/Users/doe/Desktop/baldin/frontend/src/theme/theme-provider.tsx:17), not as a redesign or framework swap.
- Treat the current repo as having a partial system already: theme tokens, semantic color helpers, navigation metadata, text wrappers, shared empty/confirm states, and global toasts in [notification-context.tsx](/Users/doe/Desktop/baldin/frontend/src/context/notification-context.tsx:46).
- The main problem is composition drift: cards, collection toolbars, dialogs, section shells, and feedback patterns are repeatedly rebuilt inside pages like [leads.tsx](/Users/doe/Desktop/baldin/frontend/src/page/leads.tsx:1), [applications-queue-page.tsx](/Users/doe/Desktop/baldin/frontend/src/page/applications/applications-queue-page.tsx:1), [pipelines.tsx](/Users/doe/Desktop/baldin/frontend/src/page/pipelines.tsx:1), and [crawlers.tsx](/Users/doe/Desktop/baldin/frontend/src/page/crawlers.tsx:1).
- The rollout should be incremental: formalize the foundation, migrate a few high-leverage list/detail surfaces, then widen adoption after the primitives prove stable.

## Current-State Findings
- Shared foundations worth formalizing already exist in [theme-provider.tsx](/Users/doe/Desktop/baldin/frontend/src/theme/theme-provider.tsx:17), [effects.ts](/Users/doe/Desktop/baldin/frontend/src/theme/effects.ts:11), [status-colors.ts](/Users/doe/Desktop/baldin/frontend/src/theme/status-colors.ts:10), [text.tsx](/Users/doe/Desktop/baldin/frontend/src/component/common/text.tsx:14), [empty-state.tsx](/Users/doe/Desktop/baldin/frontend/src/component/common/empty-state.tsx:5), [confirm-dialog.tsx](/Users/doe/Desktop/baldin/frontend/src/component/common/confirm-dialog.tsx:8), and [navigation.ts](/Users/doe/Desktop/baldin/frontend/src/route/navigation.ts:52).
- Shell behavior is already centralized through [app-layout.tsx](/Users/doe/Desktop/baldin/frontend/src/layout/app-layout.tsx:1), `usePageToolbarHeader`, and the secondary nav bar. This should remain the app-shell contract.
- Repeated high-value patterns are spread across route families: collection search/filter bars, status/count strips, interactive cards, create/edit dialogs, empty/error/loading states, and section headers with icon/count/action.
- Several feature areas already act like local micro-systems and should be mined for patterns instead of replaced wholesale: profile, applications, workflows/crawlers, documents, and auth.
- Drift is visible in duplicated local implementations: profile has a separate empty state, applications board has local empty/delete confirm patterns, settings pages repeat plan tables and snackbars, and auth has unused legacy component forms in `frontend/src/component/auth/*` alongside route pages.
- There are at least 32 dialog implementations. The older generic CRUD modals should be treated as debt, not as system primitives.
- `npm --prefix frontend run lint:theme` currently passes, which is useful, but [lint-theme.mjs](/Users/doe/Desktop/baldin/frontend/scripts/lint-theme.mjs:1) only guards raw hex outside allowlists; it does not yet prevent pattern-level drift.

## Target Architecture
- Keep MUI as the rendering and accessibility base. The design system should be a thin repo-native layer over MUI, not a replacement component framework.
- Standardize these layers:
  - Tokens: color roles, status/domain colors, typography roles, spacing, radius, elevation, motion, alpha/gradient helpers.
  - Theme contract: the single place that maps tokens into `createTheme` and MUI overrides.
  - Primitives: text, page/title helpers, card shell, section header, status badge/chip helpers, empty/error/loading surfaces, dialog shell, form field wrappers where needed.
  - Composite shared patterns: collection toolbar, metric strip, auth panel, list/detail header, section card, form-dialog layout.
  - Feature-owned components: domain composites such as `LeadModal`, applications board lanes, profile hero/builder, pipelines/crawlers detail cards, document workspace/editor surfaces.
- Proposed module shape:
```text
frontend/src/design-system/
  tokens/
  theme/
  primitives/
  patterns/
  index.ts
```
- Keep `frontend/src/theme/theme-provider.tsx` as the active entrypoint in phase 1, but make it compose the new `design-system/theme` modules.
- Freeze `frontend/src/component/common/*` as a compatibility layer after phase 1. New shared code goes into `frontend/src/design-system/*`; old `common/*` files either re-export or are retired gradually.
- Ownership boundary: design-system code may depend on MUI, neutral formatting helpers, and generic React state only. It must not import service modules, route-specific types, or domain-specific copy. Feature code composes system pieces and owns domain logic, service calls, and workflow-specific state.

## Documentation Model
- Canonical documentation surface: Docusaurus under `docs/docs/`. Do not add Storybook, token build tooling, or a separate docs app.
- Add a new sidebar group, `Frontend UI System`, under the existing docs site. Keep the current `last-verified` convention.
- Create these docs first:
  - `docs/docs/architecture/frontend-design-system.md`: layers, folder boundaries, import rules, what is shared vs feature-owned.
  - `docs/docs/reference/design-system-catalog.md`: token groups, primitives, shared patterns, usage APIs, known consumers.
  - `docs/docs/engineering/design-system-workflow.md`: contribution rules, migration checklist, validation commands, deprecation rules.
  - `docs/docs/engineering/design-system-migration-guide.md`: migration order, before/after examples, adoption status, deferred surfaces.
- Documentation format for each primitive/pattern page:
  - Purpose and scope.
  - When to use.
  - When not to use.
  - One real TSX example copied from an in-repo consumer.
  - Do/Don’t guidance.
  - Migration notes from existing components or pages.
- Keep code-local docs minimal: add `frontend/src/design-system/README.md` only for folder orientation and public export rules; Docusaurus remains the source of truth.

## Migration Phases
1. Phase 0: Freeze the boundary.
- Declare `design-system` as the destination for all new shared UI code.
- Mark `component/common/*`, `component/auth/*`, and the older CRUD modals as legacy or compatibility-only in docs.
- Document the initial shared/feature-owned boundary before moving code.

2. Phase 1: Build the foundation.
- Extract current token/theme logic from `theme/` into `design-system/tokens` and `design-system/theme` without changing the visual language.
- Promote existing good primitives first: text, empty state, confirm dialog, notification usage, section header, and card shell utilities.
- Add a shared dialog scaffold and a shared collection-toolbar pattern.
- Extend `lint-theme` to cover the system rules that matter immediately: raw hex, raw gradients outside token helpers, direct font-family overrides, and additions to legacy shared folders.

3. Phase 2: Pilot the system on three route families.
- Leads: normalize `LeadSearchBar`, `LeadExtractionBar`, `LeadCard`, and `LeadFormDialog`.
- Applications queue: adopt the same collection toolbar, stat strip, shared empty/error/confirm patterns, and card-shell helpers.
- Profile: lift the existing section-card/item-card/dialog patterns into shared system code and replace the local profile empty state with the common one.

4. Phase 3: Expand to adjacent surfaces.
- Migrate agents, companies, directory, connections, and conversations onto the shared collection/card/dialog patterns.
- Converge auth onto a shared auth-panel pattern and delete the unused legacy auth components.
- Unify settings feedback and plan-table patterns where reuse is proven.

5. Phase 4: Apply to complex/admin surfaces after primitives settle.
- Refactor pipelines and crawlers to consume the shared metric strip, card shell, dialog shell, and status helpers.
- Defer document editor, cell-doc, compare views, and other rich-editor surfaces until the general system is stable; they should consume tokens and basic primitives, not drive v1 architecture.

## Governance Rules
- A component becomes shared only if it is already used in two or more route families or it defines shell-wide behavior. Otherwise it stays feature-local.
- Shared components must be domain-neutral, MUI-backed, token-driven, and documented the same turn they are introduced.
- New shared patterns must ship with at least one migrated consumer and one targeted test when they contain state, keyboard behavior, or conditional layout logic.
- Feature teams extend primitives when the need is structural and repeatable. They create local components when the behavior depends on route-specific data, service types, or product copy.
- No new shared UI code goes into `component/common` after phase 1.
- No new raw hex, ad hoc gradients, or font stacks outside the design-system token/theme layer.
- Prefer global toasts for transient success/error feedback; use inline alerts only for persistent contextual warnings, permissions, or in-form validation.
- Deprecation rule: legacy shared components are marked in docs, migrated off, then removed. Do not maintain two equivalent primitives long-term.

## Validation And Acceptance Scenarios
- Foundation validation: `npm --prefix frontend run lint:theme`, `cd frontend && node ./node_modules/typescript/bin/tsc --noEmit`, and targeted Vitest coverage for any new primitives or patterns.
- Docs validation: `npm --prefix docs run build` whenever the design-system docs or sidebar change.
- Pilot acceptance for leads/applications/profile:
  - Existing route paths and navigation remain unchanged.
  - Search/filter/pagination still work.
  - Create/edit/delete flows still work.
  - Empty, loading, and error states render consistently.
  - Theme toggle still applies correctly across migrated surfaces.
  - Mobile toolbar and card layouts remain usable.
- Regression guard for governance: add or update tests around shared primitives that own keyboard interaction, dialog close behavior, or responsive layout branching.

## First Implementation Slices
1. Create `frontend/src/design-system/` with token, theme, primitive, and pattern export boundaries; keep current imports working via compatibility re-exports.
2. Replace `error-message.tsx` and `alert.tsx` with one documented inline-feedback primitive and standardize toast usage through `NotificationProvider`.
3. Introduce `CollectionToolbar` and migrate `LeadsPage`, `ApplicationsQueuePage`, and `ConversationsPage`.
4. Introduce `CardShell` plus status/meta helpers and migrate `AgentCard` and `LeadCard` first; keep applications board lanes feature-owned.
5. Introduce `FormDialogShell` and migrate `LeadFormDialog`, `AgentFormDialog`, and profile edit/delete dialogs.
6. Promote profile’s `ProfileSection` and `ItemCard` into shared section-shell patterns and remove the duplicate profile empty state.
7. Retire unused `component/auth/signin.tsx` and `component/auth/signup.tsx`; extract a shared auth panel from the route pages only if both pages still need it after pilot cleanup.
8. Second wave backlog: companies, connections, directory, messages detail, pipelines, crawlers, then settings duplication.

## Risks, Open Questions, And Defaults
- Default: preserve the current cyan/purple palette, typography pairing, route structure, and working interaction model in v1. This is a systemization effort, not a visual redesign.
- Default: Docusaurus is the only canonical design-system documentation surface for now.
- Default: rich-editor and cell-doc surfaces are deferred from first-slice abstraction work.
- Risk: over-abstracting too early will recreate the current duplication problem at a higher layer. The mitigation is “shared only after repeated use or shell-level need.”
- Risk: moving files too aggressively will create churn. The mitigation is compatibility re-exports and phased adoption rather than a big-bang rename.
- Open question to revisit after phase 2, not before: whether `component/common` should be deleted entirely or kept as a compatibility facade. The plan assumes compatibility-only, then removal once migration is complete.
