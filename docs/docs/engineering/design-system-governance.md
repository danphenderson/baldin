---
slug: /engineering/design-system-governance
title: Design System Governance
description: Lightweight operating rules for promoting, reviewing, documenting, and keeping Baldin's frontend design-system layer coherent.
---

<!-- last-verified: 2026-04-12 -->

# Design System Governance

Use this page for the practical operating rules that keep Baldin's post-Phase-2 design-system layer coherent as adoption expands.

This governance is intentionally lightweight. Baldin is still a local-first developer-preview repo, so the rules should prevent drift without adding mature-SaaS process overhead.

## Promotion Rules

### Promote a new primitive only when

- The UI is domain-neutral and reusable without service imports, generated backend types, or route-specific copy.
- The repeated need is about presentation, layout, feedback, or interaction behavior rather than business semantics.
- There are already two concrete consumers, or one current consumer plus a compatibility-backed or app-shell need with a near-term second adopter in the active migration wave.
- The API can stay neutral through generic props, slots, or shell options.

### Promote a new pattern only when

- The pattern composes existing primitives, or a primitive extraction is justified first.
- At least two consumers need the same structural slots, not just a similar visual mood.
- The API can use neutral slot names such as `header`, `search`, `controls`, `actions`, or `secondary`.
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

- Add Vitest and React Testing Library coverage when shared UI has interaction, accessibility semantics, branching behavior, or callback wiring.
- Cover the behavior that makes the surface shared: keyboard and focus handling, variant branching, fallback behavior, wrapper prop translation, or slot orchestration.
- Pure token mapping, static composition, or styling-only changes can rely on the existing validation path unless new logic is introduced.
- Any new `lint-theme` rule must include a matching test in `frontend/src/design-system/theme/lint-theme.test.ts`.

## Documentation Requirements

When shared UI changes:

- Update this governance doc when the operating rules or review expectations change.
- Update [Design System Catalog](../reference/design-system-catalog.md) when the shared inventory, wrapper inventory, or canonical ownership boundary changes.
- Update [Design System Migration Guide](./design-system-migration-guide.md) when adopter status changes.
- Update [Frontend Design System](../architecture/frontend-design-system.md) when the layer contract, theme contract, or feature/shared boundary changes.

Treat these docs as part of the anti-drift surface, not optional follow-up.

## Compatibility Wrapper Lifecycle

Legacy-folder wrappers may remain only to preserve imports or translate old prop shapes.

Current rules:

- Do not add new call sites into `frontend/src/component/common/*` or `frontend/src/component/auth/*`.
- Prefer pure re-export shims once prop translation is no longer needed.
- If translation is still required, keep the adapter thin and make the backing design-system source obvious.
- Remove a wrapper once no in-repo imports remain and the backing shared surface is documented and stable.
- Do not invent time-based deprecation windows or release-train policy here. Baldin should use actual in-repo usage, not ceremony.
- If a wrapper survives, the catalog must document both the backing source and the reason it still exists.

## Reviewer Checklist

For design-system PRs, reviewers should check:

- Is this actually shared, or should it stay feature-owned?
- Is the code in the correct layer: token, theme, primitive, or pattern?
- Does the API stay domain-neutral and slot-based?
- Does it use `theme.palette.*`, `theme.baldin.*`, and spacing or token helpers correctly?
- Does it avoid raw hex, raw gradients, raw font-family overrides, and new legacy-folder growth?
- Are compatibility wrappers thinner after the change, not broader?
- Are the required docs updated in the same PR?
- Are the smallest relevant tests and checks present?

## Anti-Drift Enforcement

Keep enforcement lightweight and practical.

- `frontend/scripts/lint-theme.mjs` remains the primary design-system drift guard.
- `npm run lint:theme` should be treated as an expected check for design-system-affecting PRs.
- CI should run `frontend` `lint:theme` as a small dedicated gate.
- Keep the existing rule that blocks new shared-source files in legacy folders unless they are pure re-export shims.
- Add new lint rules only after a real drift pattern shows up in the repo. Do not build speculative policy automation.
- Keep docs build mandatory when design-system docs or sidebar wiring changes.

## Defaults

- Prefer reusing a shipped primitive or pattern before proposing a new one.
- Prefer documenting a narrow shared abstraction over introducing a broad reusable API with unstable semantics.
- Prefer real consumption proof over aspirational design-system inventory growth.
