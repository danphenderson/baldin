---
sidebar_position: 2
slug: /reference/v2-1-hard-fork
title: v2.1 Hard Fork
description: Active code-first product direction for Baldin after deprecating active Figma design work.
---

<!-- last-verified: 2026-04-17 -->

# v2.1 Hard Fork

As of `2026-04-17`, Baldin's active product direction is a hard fork away from active Figma redesign work.

The implementation contract is now code-first and repo-backed.

## Active Sources Of Truth

Use these as the current delivery surfaces:

- `frontend/src/design-system/*` for tokens, theme, primitives, patterns, and shared UI rules
- `operator-design/` for the standalone `v2.1` visual reference bundle
- `plans/v2.1/*` for execution briefs, wave packets, and slice sequencing
- [Frontend Design System](../architecture/frontend-design-system.md), [Design System Workflow](../engineering/design-system-workflow.md), and [v2.1 Implementation Program](../engineering/v2-1-implementation-program.md) for the durable operating contract

## Archived Reference Surfaces

These are no longer active delivery gates:

- `Baldin-Library`
- `Baldin Product Redesign — Command Center`
- [Baldin Redesign Handoff](./baldin-redesign-handoff.md)
- [Redesign Implementation Program](../engineering/redesign-implementation-program.md)

Use them only when historical context is genuinely useful. No implementation slice should block on new Figma screens, Figma node approvals, or design-handoff-only artifacts.

## Working Rules

- Treat `frontend/src/design-system/*` as the canonical product design system.
- Treat `.figma.ts` files and `frontend/figma.config.json` as optional metadata, not required delivery dependencies.
- Treat targeted shared-surface tests and `lint:theme` as the primary drift guards for shared UI.
- Treat `operator-design/` as a visual reference surface, not a source of Tailwind, shadcn, or `cva` contracts to port into the product app.
- Prefer the smallest code-backed change that improves product coherence, shared-surface consistency, or launch-path readiness.

## Immediate Priorities

1. Replace Figma-gated planning and docs with the `v2.1` code-first program.
2. Restore a green shared-UI baseline by fixing the current `lint:theme` drift.
3. Reduce legacy shell debt by migrating remaining raw `Alert` and `Dialog` usage when those files are touched.
4. Resume route-family slices only after the shared baseline and active planning contract are stable.

## Entry Point

Start implementation work from [v2.1 Implementation Program](../engineering/v2-1-implementation-program.md), then fill `plans/v2.1/implementation-brief-template.md` before opening a substantial slice.
