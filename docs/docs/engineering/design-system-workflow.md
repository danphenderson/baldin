---
slug: /engineering/design-system-workflow
title: Design System Workflow
description: Contribution rules, compatibility-wrapper policy, validation path, and decision criteria for Baldin's frontend design-system work.
---

<!-- last-verified: 2026-04-12 -->

# Design System Workflow

Use this workflow when adding, extending, or migrating shared frontend UI. The goal is to keep the shared layer small, documented, and aligned with what is already proven in Baldin.

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

## Shared-Layer Rules

- Put new tokens in `frontend/src/design-system/tokens/*`.
- Put new MUI mappings or theme extensions in `frontend/src/design-system/theme/*`.
- Put new neutral leaf UI in `frontend/src/design-system/primitives/*`.
- Put new structural composition in `frontend/src/design-system/patterns/*`.
- Re-export shared additions through the nearest `index.ts` and through `frontend/src/design-system/index.ts` when they are public.
- Document the new shared surface in the same change under `docs/docs/`.

## Compatibility-Wrapper Policy

`frontend/src/component/common/*` is frozen as compatibility-only.

Allowed changes there:

- Repoint a wrapper to a design-system primitive.
- Translate legacy props into the canonical shared API.
- Preserve stable imports while a migration remains in flight.

Disallowed changes there:

- Adding a brand-new shared abstraction.
- Expanding wrapper logic into a second source of truth.
- Introducing new styling rules that should live in the shared primitive.

If a wrapper must survive, keep it thin and document the backing primitive in [Design System Catalog](./design-system-catalog.md).

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

## Do And Don't

| Do | Don't |
| --- | --- |
| Add neutral slots like `search`, `controls`, or `actions` | Add domain props like `leadFilters` or `applicationColumns` to shared patterns |
| Compose MUI and shipped tokens | Hardcode new color, radius, or spacing rules in shared files |
| Leave unstable product behavior in feature code | Abstract a component just because two pages both use a `Card` |
| Preserve legacy call sites with thin wrappers when migration risk is high | Let wrappers become the primary implementation surface |
| Update docs in the same change | Treat the closeout note as the only current source of truth |

## Current Defaults

- Prefer the exported `frontend/src/design-system` barrel in feature code unless a narrower import is materially clearer.
- Prefer global toasts for transient success/error feedback and `InlineFeedback` for persistent contextual feedback.
- Prefer `SectionHeader` plus `SectionCard` for reusable section framing instead of feature-local section chrome.
- Keep `MetricStrip` local until a second route family proves the same structure.

## When To Stop Sharing

Do not widen the shared layer if the proposed API starts to require:

- Entity-specific terminology
- Route-specific filtering semantics
- Local data-fetch timing
- Service-layer error normalization
- Feature-owned animation or editor behavior

At that point the design system has reached its current boundary, and the code should stay in the feature folder.
