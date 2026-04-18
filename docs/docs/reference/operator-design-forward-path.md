---
slug: /reference/operator-design-forward-path
title: Operator Design Forward Path
description: Active source bundle and working contract for operator-design-first Baldin UI work.
---

<!-- last-verified: 2026-04-17 -->

# Operator Design Forward Path

Use this page as the active forward contract for Baldin UI work. It replaces the retired `v2.1` hard-fork, redesign handoff, design-system catalog, and implementation-program pages as the single surviving docs entry point for design-direction questions.

`operator-design/` is the active reference bundle. Shipped implementation still lives in `frontend/src/design-system/*` and the current route code.

## Active Source Bundle

- `operator-design/` for forward-looking reference layouts, states, and route-family buildout direction
- `frontend/src/design-system/*` for implemented tokens, theme, primitives, patterns, and shared React boundaries
- `frontend/src/page/**`, `frontend/src/layout/**`, and `frontend/src/component/**` for route-owned behavior and composition
- `plans/v2.1/*` and `plans/v2.1/implementation-brief-template.md` for active execution packets
- [Frontend Design System](../architecture/frontend-design-system.md) for shared-layer ownership and compatibility rules
- [Work Locally](../engineering/local-development.md) for the supported local stack, browser-harness loop, and validation defaults

## How To Use This Contract

1. Start here when a prompt asks for the active design, redesign, or shared-UI contract.
2. Pair `operator-design/` with shipped code when comparing target direction against what is already implemented.
3. Use `plans/v2.1/*` for active route-family sequencing and implementation briefs.
4. Use archived Figma material and `plans/redesign/*` only when a task explicitly asks for historical comparison.
5. Do not treat deleted redesign docs, the reviewed Figma Make sandbox, or Code Connect setup as delivery gates.

## Validation Defaults

- Start with the smallest useful frontend, docs, or browser-harness check for the touched surface.
- Run `npm --prefix docs run build` when docs navigation or agent guidance changes.
- Run targeted frontend tests, `cd frontend && ./node_modules/typescript/bin/tsc --noEmit`, and `cd frontend && npm run build` only when shared React behavior or route code changed.
