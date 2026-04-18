---
slug: /engineering/design-system-workflow
title: Design System Workflow
description: Contribution flow, validation path, and practical handoff rules for Baldin's frontend design-system work.
---

<!-- last-verified: 2026-04-14 -->

# Design System Workflow

Use this workflow when adding, extending, or migrating shared frontend UI. The goal is to keep the shipped `frontend/src/design-system/*` layer coherent, well-documented, and ready to carry the active `v2.1` product direction.

Use [Design System Governance](./design-system-governance.md) for durable operating rules, promotion criteria, wrapper lifecycle, reviewer checklist, and anti-drift guidance. Use this page for the day-to-day contribution flow.

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

- Put new raw tokens in `frontend/src/design-system/tokens/*`.
- Put new MUI mappings or theme extensions in `frontend/src/design-system/theme/*`.
- Put new neutral leaf UI in `frontend/src/design-system/primitives/*`.
- Put new structural composition in `frontend/src/design-system/patterns/*`.
- Re-export shared additions through the nearest `index.ts` and through `frontend/src/design-system/index.ts` when they are public.
- Document the new shared surface in the same change under `docs/docs/`.

## Verification And Optional Mapping Lane

For exported shared React surfaces, Baldin now uses a single code-first review loop grounded in tests and shipped routes:

1. Keep the shared React contract in `frontend/src/design-system/*`.
2. Add or update targeted Vitest coverage when the shared surface has reusable behavior, slot orchestration, branching, or accessibility semantics.
3. Keep the colocated `*.figma.ts` file only when optional mapping metadata still adds value.
4. Use real route consumers or the browser harness for manual review only when a visual check is actually needed.
5. Do not create a separate sandbox or publish lane as a prerequisite for shipping shared UI.

Archived Figma files can still provide historical context, but no shared-surface change should block on new Figma screens or node-level approval.

## Theme Rules

Current theme usage rules:

- Use `theme.palette.*` for standard MUI semantic roles.
- Use `theme.baldin.*` for Baldin-only token groups such as `status`, `alpha`, `radius`, `elevation`, `motion`, and `fontFamily`.
- Use `spacingTokens` and `toSpacingPx(...)` for new shared layout spacing.
- Do not assume `theme.spacing()` matches Baldin's shared spacing tokens. It still uses MUI's default 8px scale for compatibility.

If a value does not need runtime theme access, prefer the token file directly instead of widening `theme.baldin`.

## Compatibility Policy

`frontend/src/component/common/*` is compatibility-only. `frontend/src/component/auth/*` is retired for shared UI.

In workflow terms:

- Repoint old wrappers to the canonical design-system source when that lowers migration risk.
- Prefer pure re-export shims over translation wrappers once the canonical source can absorb the compatibility behavior.
- Delete dead wrappers and theme shims instead of keeping them around once in-repo consumers are gone.
- Document any surviving wrapper in [Design System Catalog](../reference/design-system-catalog.md).

## Migration Checklist

1. Confirm the target UI should be shared instead of staying feature-owned.
2. Reuse an existing primitive or pattern first.
3. If no shipped primitive fits, add the smallest neutral shared surface that solves the repeated structure.
4. Keep feature-specific copy, service calls, route state, and entity rendering in the feature module.
5. Replace any shared-eligible direct MUI shell import with the canonical design-system surface.
6. Remove dead compatibility wrappers or convert them to pure re-export shims.
7. Update the catalog or migration guide when the adoption status changes.
8. Validate the touched surfaces before handoff.

## Current Validation Path

Start with the smallest relevant check, then widen when the change affects public exports or enforcement rules.

| Change type | Minimum useful validation |
| --- | --- |
| Docs-only design-system change | `npm --prefix docs run build` |
| Shared frontend code | `cd frontend && npm run test` when tests exist for the touched surface |
| Shared frontend React surface | `cd frontend && npm run test -- <targeted shared-surface tests>` |
| Shared frontend typing or exports | `cd frontend && node ./node_modules/typescript/bin/tsc --noEmit` |
| Shared frontend behavior or bundling assumptions | `cd frontend && VITE_API_URL=https://api.preview.invalid npm run build` |
| Theme, token, or import-boundary rules | `cd frontend && npm run lint:theme` |

For this repo, docs build is mandatory when these design-system docs or the sidebar change.

## Required Docs And Test Expectations

When adding or widening shared UI:

- Update the canonical docs in the same change.
- Add or update targeted tests when the surface is a public shared React export with reusable behavior.
- Update [Design System Governance](./design-system-governance.md) when operating rules or reviewer expectations change.
- Update [Design System Catalog](../reference/design-system-catalog.md) when a shared surface, wrapper, or adopter inventory changes.
- Update [Design System Migration Guide](./design-system-migration-guide.md) when rollout status or migrated surfaces change.
- Update [Frontend Design System](../architecture/frontend-design-system.md) when the layer contract, theme contract, or ownership boundary changes.
- Run the smallest relevant frontend validation for the touched shared surface, then widen to `tsc`, `build`, or `lint:theme` when the change affects public exports, bundling assumptions, or enforcement rules.

## Do And Don't

| Do | Don't |
| --- | --- |
| Add neutral slots like `search`, `controls`, `actions`, or `footer` | Add domain props like `leadFilters` or `applicationColumns` to shared patterns |
| Compose MUI and shipped tokens inside `design-system/*` | Import overlapping MUI shell primitives directly in feature code |
| Leave unstable product behavior in feature code | Abstract a component just because two pages both use a `Card` |
| Preserve legacy call sites with thin re-export shims only when needed | Let legacy wrappers become the primary implementation surface |
| Update docs in the same change | Treat migration notes as the only source of truth |
| Keep optional `.figma.ts` metadata close to the shared surface when historical design context adds value | Turn mapping metadata into a build or review gate |
| Delete dead compatibility files promptly | Keep inert shims after in-repo consumers are gone |

## Current Defaults

- Prefer the exported `frontend/src/design-system` barrel in feature code unless a narrower canonical path is materially clearer.
- Prefer `AuthPanel` for auth shells and `SurfaceDialog` or `SurfaceCard` when a feature still owns the dialog or card body.
- Prefer `SectionHeader` plus `SectionCard` for reusable section framing instead of feature-local section chrome.
- Prefer `MetricStrip` for read-only stat rows across route families. Use the `inline` variant for flush layouts and the `card` variant for sections that need a card frame.

## When To Stop Sharing

Do not widen the shared layer if the proposed API starts to require entity-specific terminology, route-specific filtering semantics, local data-fetch timing, service-layer error normalization, or feature-owned editor behavior.

At that point the design system has reached its boundary, and the code should stay in the feature folder.
