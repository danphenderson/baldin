# Baldin Copilot Customization Surface

This document inventories Baldin's Copilot customization surface without overriding the repository README on GitHub.

## Layer Model

| Layer | Path | Scope |
|-------|------|-------|
| 1. Baseline | `copilot-instructions.md` | Always-on repo posture and reference links |
| 2. Scoped instructions | `instructions/*.instructions.md` | Edit-time rules by file pattern |
| 3. Agents | `agents/*.agent.md` | Specialist owners and orchestrators |
| 4. Prompts | `prompts/*.prompt.md` | Single-purpose workflow entry points |
| 5. Skills | `skills/*/SKILL.md` | Repeatable multi-step workflows |

## Inventory

### Instructions (2)
| File | Scope |
|------|-------|
| `baldin-project.instructions.md` | Runtime, delivery, docs, contracts, release-path |
| `baldin-agent-customization.instructions.md` | Copilot agents, prompts, skills, instructions |

### Agents (4)
| Agent | Role |
|-------|------|
| Baldin Project Manager | Coordination, delegation, workstream planning |
| Baldin Backend Agent | Backend implementation in `./backend` |
| Baldin Frontend Agent | Frontend implementation in `./frontend` |
| Baldin Lead Full-Stack Architect | Cross-stack architecture and integration |

### Prompts (14)
`api-contract-change-orchestrator` · `backend-runtime-slice` · `change-aware-validation-sequence` · `cross-stack-workstream-router` · `deep-think-epic-planner` · `deep-think-spike` · `documentation-impact-review` · `frontend-product-slice` · `hard-gate-pr-review` · `issue-cleanup-orchestrator` · `issue-dispatch-kickoff` · `local-preview-integration-fix` · `multi-agent-handoff-synthesizer` · `plan-slice-kickoff`

Prompts are classified as **core** (9), **advanced** (4), or **maintenance** (1) per the [cookbook decision table](../docs/docs/engineering/copilot-prompt-cookbook.md#prompt-decision-table).

### Skills (6)
`baldin-agent-prompt-tuner` · `baldin-ai-slop-audit` · `baldin-backend-test-gap-planner` · `baldin-contract-regen-resolver` · `baldin-docs-drift-auditor` · `baldin-local-stack-doctor`

## How To Add

- **New prompt**: create under `prompts/`, add a cookbook entry in `docs/docs/engineering/copilot-prompt-cookbook.md`.
- **New agent**: only if the four-agent split cannot own the work. Requires CODEOWNERS review.
- **New skill**: for repeatable multi-step workflows that benefit from tested instructions.
- **New instruction**: only for a genuinely new scoping dimension not covered by existing files.

## Ownership
Changes to `.github/**` require review per CODEOWNERS.

## Enforcement Controls

### Active
- `CODEOWNERS` gates review on `.github/**`, generated artifacts, CI, and scripts.
- `scripts/validate_copilot_assets.py` validates frontmatter, inventory, and link integrity (CI job: `copilot-assets`).

### Desired-State (enable when VS Code Copilot hooks stabilize)
- **block-generated-artifact-edits**: warn or block direct edits to `openapi.json`, `frontend/src/schema.d.ts`, `docs/build/**`.
- **require-validation-reminder**: remind agents to validate the touched surface before reporting completion.
