---
description: "Use when a Baldin code, workflow, plan, prompt, or agent change may have made docs stale and you need a targeted documentation impact audit before or after implementation."
name: "Documentation Impact Review"
argument-hint: "Describe the change, workflow, or docs area to audit"
agent: "agent"
model: "GPT-5 (copilot)"
---
Audit the documentation impact of this Baldin change.

Use [Baldin Docs Drift Auditor](../skills/baldin-docs-drift-auditor/SKILL.md), [Baldin Project Conventions](../instructions/baldin-project.instructions.md), [Contribute Safely](../../docs/docs/getting-started/contributing.md), [Run The Right Checks](../../docs/docs/engineering/testing.md), and [See Merge Gates](../../docs/docs/engineering/ci-pipeline.md).

Task:
- Determine which documentation surfaces are actually affected by the user's change or the active diff.
- Prefer a targeted audit tied to the changed workflow, feature, or repo surface instead of a generic repo-wide docs review unless the user explicitly asks for a broad audit.
- Compare documentation claims against the current source of truth in code, scripts, CI, plans being treated as current truth, contracts, and repo configuration.
- Audit docs source under [docs/docs](../../docs/docs), not [docs/build](../../docs/build).
- Include `.github/**` prompt, agent, instruction, workflow, and review docs when the change affects Copilot workflows or repo operating rules.
- Report only confirmed drift or clearly missing updates that would mislead contributors, reviewers, or operators.

Return:
- Executive summary.
- Ranked docs-impact findings.
- File-by-file affected areas.
- Items requiring engineering or product confirmation.
- Minimal update plan for the current slice.

If there is no meaningful documentation impact, say that explicitly and name the evidence checked.

Stop and hand off if:
- The request is actually asking you to edit docs now instead of auditing impact.
- The claimed documentation source of truth is contradicted by the implementation and needs deeper discovery first.
