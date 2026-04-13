---
slug: /engineering/design-system-governance
title: Design System Governance
description: Lightweight operating rules for promoting, reviewing, documenting, and keeping Baldin's frontend design-system layer coherent.
---

<!-- last-verified: 2026-04-13 -->

# Design System Governance

Use this page for the practical operating rules that keep Baldin's design-system layer coherent as adoption expands.

This governance stays intentionally lightweight. Baldin is still a local-first developer-preview repo, so the rules should prevent drift without adding mature-SaaS process overhead.

## Promotion Rules

### Promote a new primitive only when

- The UI is domain-neutral and reusable without service imports, generated backend types, or route-specific copy.
- The repeated need is about presentation, layout, feedback, or interaction behavior rather than business semantics.
- There are already two concrete consumers, or one current consumer plus an active migration wave that proves the second adopter immediately.
- The API can stay neutral through generic props, slots, or shell options.

### Promote a new pattern only when

- The pattern composes existing primitives, or a primitive extraction is justified first.
- At least two consumers need the same structural slots, not just a similar visual mood.
- The API can use neutral slot names such as `header`, `search`, `controls`, `actions`, `secondary`, or `footer`.
- The value comes from shared composition, not from centralizing feature semantics.

### Keep a pattern feature-owned when

- It needs domain props like `lead`, `application`, `agentKind`, or feature-specific stage and filter semantics.
- It owns workflow state, fetch timing, route copy, entity rendering, or unstable product behavior.
- The shape is only proven in one feature, or the second candidate would need materially different slots or behavior.

## Naming And Export Rules

The `frontend/src/design-system/` layout stays split across:

- `tokens/`
- `theme/`
- `primitives/`
- `patterns/`

Naming and export defaults:

- Use kebab-case file names.
- Use PascalCase exports for React components.
- Use camelCase exports for helpers, tokens, and utility functions.
- Export public surfaces through the nearest `index.ts`.
- Export from `frontend/src/design-system/index.ts` only when feature code should consume the surface broadly.
- Do not export compatibility wrappers or feature-local adapters through the root barrel.
- Keep internal helpers local to the primitive or pattern folder unless they are intentionally shared across multiple shared surfaces.

## Tests For Shared UI

Shared UI with behavior needs targeted tests.

- Add Vitest and React Testing Library coverage when shared UI has interaction, accessibility semantics, branching behavior, callback wiring, or wrapper compatibility behavior.
- Cover the behavior that makes the surface shared: keyboard and focus handling, variant branching, fallback behavior, wrapper passthrough, or slot orchestration.
- Pure token mapping, static composition, or styling-only changes can rely on the existing validation path unless new logic is introduced.
- Any new `lint-theme` rule must include a matching test in `frontend/test/design-system/theme/lint-theme.test.ts`.

## Documentation Requirements

When shared UI changes:

- Update this governance doc when the operating rules or review expectations change.
- Update [Design System Catalog](../reference/design-system-catalog.md) when the shared inventory, wrapper inventory, or canonical ownership boundary changes.
- Update [Design System Migration Guide](./design-system-migration-guide.md) when adopter status changes.
- Update [Frontend Design System](../architecture/frontend-design-system.md) when the layer contract, theme contract, or feature/shared boundary changes.

Treat these docs as part of the anti-drift surface, not optional follow-up.

## Compatibility Wrapper Lifecycle

### Lifecycle states

Every compatibility wrapper is in exactly one of these states:

| State | Meaning | Allowed operations | Sunset trigger |
| --- | --- | --- | --- |
| `translating` | The wrapper still adapts feature-specific copy or prop shapes around a canonical shared surface. | Keep thin; only feature-local composition or copy stays here. | The feature can express the same behavior directly through canonical design-system props or slots. |
| `re-export` | The wrapper is a pure passthrough re-export. | No logic changes allowed. Only import-path preservation. | Zero meaningful in-repo consumers remain or the import bridge is no longer needed. |
| `removable` | Zero meaningful in-repo consumers remain. | Delete the file. | Delete in the next PR that touches the surrounding area, or in a dedicated cleanup pass. |

### Current wrapper ledger

| Wrapper | Backing source | State | Sunset trigger |
| --- | --- | --- | --- |
| `page/profile/components/EmptyState.tsx` | `EmptyState` | `translating` | Profile-specific copy stabilises into canonical props or is intentionally kept feature-local |
| `component/lead-search-bar.tsx` | `CollectionToolbar` | `translating` | Leads search composition either stabilises enough to inline canonical slots directly or remains intentionally feature-owned |

### Retired wrappers and shims

These compatibility files have already been removed and must not be reintroduced as shared sources:

- `component/common/text.tsx`
- `component/common/empty-state.tsx`
- `component/common/confirm-dialog.tsx`
- `component/common/alert.tsx`
- `component/common/error-message.tsx`
- `theme/effects.ts`
- `theme/status-colors.ts`
- `component/auth/signin.tsx`
- `component/auth/signup.tsx`

### Operating rules

Current rules:

- Do not add new call sites into `frontend/src/component/common/*` or `frontend/src/component/auth/*`.
- Delete dead wrappers once no meaningful in-repo consumers remain.
- If translation is still required, keep the adapter thin and make the backing design-system source obvious.
- If a wrapper survives, the catalog must document both the backing source and the reason it still exists.
- When a wrapper transitions between lifecycle states, update both this ledger and the [Design System Catalog](../reference/design-system-catalog.md) in the same PR.

## Reviewer Checklist

For design-system PRs, reviewers should check:

- Is this actually shared, or should it stay feature-owned?
- Is the code in the correct layer: token, theme, primitive, or pattern?
- Does the API stay domain-neutral and slot-based?
- Does it use `theme.palette.*`, `theme.baldin.*`, and token helpers correctly?
- Does it use `styled()` or theme variants for reusable structure, and keep `sx` for local composition only?
- Does it avoid raw hex, raw gradients, raw font-family overrides, legacy wrapper imports, and direct MUI shell imports outside the allowed paths?
- Does it keep `style=` limited to runtime-computed escapes or legacy compatibility shims, instead of static object literals?
- Are compatibility wrappers thinner or fewer after the change, not broader?
- Are the required docs updated in the same PR?
- Are the smallest relevant tests and checks present?

## Anti-Drift Enforcement

Keep enforcement lightweight and practical.

- `frontend/scripts/lint-theme.mjs` remains the primary design-system drift guard.
- `npm run lint:theme` should be treated as a normal check for design-system-affecting PRs.
- CI should keep running `frontend` `lint:theme` as a dedicated gate.
- `lint:theme` blocks new shared-source files in legacy folders unless they are pure re-export shims.
- `lint:theme` blocks imports from retired shared paths such as `component/common/text`, `component/common/empty-state`, `component/common/confirm-dialog`, `theme/effects`, `theme/status-colors`, and any `component/auth/*` path.
- `lint:theme` blocks direct imports of `Card`, `CardContent`, `CardHeader`, `CardActions`, `Chip`, `Dialog`, `DialogTitle`, `DialogContent`, and `DialogActions` outside `frontend/src/design-system/*`, tests, and `context/notification-context.tsx`.
- `lint:theme` flags static JSX `style={{...}}` usage outside the legacy compatibility shims, so runtime-computed style escapes stay explicit.
- `lint:theme` requires shared design-system wrappers to type `sx` as `SxProps<Theme>` instead of `object`.
- `lint:theme` flags new shared-surface uses of `InputProps` and `PaperProps`; the current `surface-dialog` and `form-dialog-shell` files remain documented exceptions until their slots-based refactor lands.
- Keep docs build mandatory when design-system docs or sidebar wiring changes.

## Defaults

- Prefer reusing a shipped primitive or pattern before proposing a new one.
- Prefer documenting a narrow shared abstraction over introducing a broad reusable API with unstable semantics.
- Prefer deleting dead wrappers over keeping inert compatibility files around.
- Prefer real consumption proof over aspirational design-system inventory growth.
