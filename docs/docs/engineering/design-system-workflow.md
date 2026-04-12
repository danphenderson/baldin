---
slug: /engineering/design-system-workflow
title: Design System Workflow
description: Contribution flow, validation path, and practical handoff rules for Baldin's frontend design-system work.
---

<!-- last-verified: 2026-04-12 -->

# Design System Workflow

Use this workflow when adding, extending, or migrating shared frontend UI. The goal is to keep the shared layer small, documented, and aligned with what is already proven in Baldin.

Use [Design System Governance](./design-system-governance.md) for the durable operating rules, promotion criteria, wrapper lifecycle, reviewer checklist, and anti-drift guidance. Use this page for the day-to-day contribution flow.

## Start With The Ownership Decision

Add code to `frontend/src/design-system/*` only when all of these are true:

- The UI is domain-neutral.
- The need is structural or present in more than one route family, or it affects shell-wide behavior.
- The API can be expressed with neutral props or slots.
- The component does not need service imports, generated backend types, or route-specific copy to make sense.

Keep code feature-owned when any of these are true:

- The component owns workflow logic, stage semantics, entity-specific labels, or feature-only CTAs.
- The shape is still unstable or only proven in one surface.
- The simplest API would expose domain props like `application`, `lead`, `agentKind`, or feature-specific status rules.

For the full promotion and feature-owned boundary rules, see [Design System Governance](./design-system-governance.md).

## Shared-Layer Rules

- Put new raw tokens in `frontend/src/design-system/tokens/*`.
- Put new MUI mappings or theme extensions in `frontend/src/design-system/theme/*`.
- Put new neutral leaf UI in `frontend/src/design-system/primitives/*`.
- Put new structural composition in `frontend/src/design-system/patterns/*`.
- Re-export shared additions through the nearest `index.ts` and through `frontend/src/design-system/index.ts` when they are public.
- Document the new shared surface in the same change under `docs/docs/`.

## Theme Rules

Current theme usage rules:

- Use `theme.palette.*` for standard MUI semantic roles.
- Use `theme.baldin.*` for Baldin-only token groups such as `status`, `alpha`, `radius`, `elevation`, `motion`, and `fontFamily`.
- Use `spacingTokens` and `toSpacingPx(...)` for new shared layout spacing.
- Do not assume `theme.spacing()` matches Baldin's shared spacing tokens. It still uses MUI's default 8px scale for compatibility.

If a value does not need runtime theme access, prefer the token file directly instead of widening `theme.baldin`.

## Compatibility Policy

`frontend/src/component/common/*`, `frontend/src/component/auth/*`, and the re-export shims under `frontend/src/theme/*` are compatibility-only.

In workflow terms:

- Repoint wrappers to the canonical design-system source when that lowers migration risk.
- Keep surviving wrappers thin.
- Document the backing source in [Design System Catalog](../reference/design-system-catalog.md).

For deprecation and removal rules, use [Design System Governance](./design-system-governance.md).

## Migration Checklist

1. Confirm the target UI should be shared instead of staying feature-owned.
2. Reuse an existing primitive or pattern first.
3. If no shipped primitive fits, add the smallest neutral shared surface that solves the repeated structure.
4. Keep feature-specific copy, service calls, route state, and entity rendering in the feature module.
5. If the feature already depends on a legacy wrapper, either keep the wrapper thin or migrate the consumer directly to `frontend/src/design-system`.
6. Update the catalog or migration guide when the adoption status changes.
7. Validate the touched surfaces before handoff.

## Current Validation Path

Start with the smallest relevant check.

| Change type | Minimum useful validation |
| --- | --- |
| Docs-only design-system change | `npm --prefix docs run build` |
| Shared frontend code | `cd frontend && npm run test` when tests exist for the touched surface |
| Shared frontend typing or exports | `cd frontend && node ./node_modules/typescript/bin/tsc --noEmit` |
| Shared frontend behavior or bundling assumptions | `cd frontend && VITE_API_URL=https://api.preview.invalid npm run build` |
| Theme or token rule changes | `cd frontend && npm run lint:theme` |

For this repo, docs build is mandatory when these design-system docs or the sidebar change.

## Required Docs And Test Expectations

When adding or widening shared UI:

- Update the canonical docs in the same change.
- Update [Design System Governance](./design-system-governance.md) when the operating rules or reviewer expectations change.
- Update [Design System Catalog](../reference/design-system-catalog.md) when a shared surface, wrapper, or adopter inventory changes.
- Update [Design System Migration Guide](./design-system-migration-guide.md) when rollout status or migrated surfaces change.
- Update [Frontend Design System](../architecture/frontend-design-system.md) when the layer contract, theme contract, or ownership boundary changes.
- Run the smallest relevant frontend validation for the touched shared surface, then widen to `tsc`, `build`, or `lint:theme` when the change affects public exports, bundling assumptions, or token and theme rules.

This repo does not require a full frontend suite by default for every shared UI edit, but shared UI should not hand off without at least the smallest relevant proof.

## Do And Don't

| Do | Don't |
| --- | --- |
| Add neutral slots like `search`, `controls`, or `actions` | Add domain props like `leadFilters` or `applicationColumns` to shared patterns |
| Compose MUI and shipped tokens | Hardcode new color, radius, or spacing rules in shared files |
| Leave unstable product behavior in feature code | Abstract a component just because two pages both use a `Card` |
| Preserve legacy call sites with thin wrappers when migration risk is high | Let wrappers become the primary implementation surface |
| Update docs in the same change | Treat the closeout note as the only current source of truth |
| Keep new shared-source files out of `component/common/*` and `component/auth/*` | Use those folders as a second design-system home |

## Current Defaults

- Prefer the exported `frontend/src/design-system` barrel in feature code unless a narrower import is materially clearer.
- Prefer global toasts for transient success and error feedback and `InlineFeedback` for persistent contextual feedback.
- Prefer `SectionHeader` plus `SectionCard` for reusable section framing instead of feature-local section chrome.
- Keep `MetricStrip` local until a second route family proves the same structure.

## When To Stop Sharing

Do not widen the shared layer if the proposed API starts to require entity-specific terminology, route-specific filtering semantics, local data-fetch timing, service-layer error normalization, or feature-owned animation and editor behavior.

At that point the design system has reached its current boundary, and the code should stay in the feature folder.
