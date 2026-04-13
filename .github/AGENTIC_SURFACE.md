# Baldin Agentic Customization Surface

This document inventories Baldin's shared agentic customization surface across Copilot and Codex without overriding the repository README on GitHub.

## Layer Model

| Layer | Path | Scope |
|-------|------|-------|
| 1. Shared baseline | `AGENTS.md` | Canonical repo posture, owner model, and validation expectations |
| 2. Copilot compatibility baseline | `.github/copilot-instructions.md` | Copilot-specific always-on wrapper around the shared baseline |
| 3. Scoped instructions | `.github/instructions/*.instructions.md` | Edit-time rules and agentic-surface alignment |
| 4. Copilot execution layer | `.github/agents/*.agent.md`, `.github/prompts/*.prompt.md`, `.github/skills/*/SKILL.md` | Copilot specialist owners, slash prompts, and repeatable workflows |
| 5. Codex execution layer | `.codex/config.toml`, `.codex/agents/*.toml` | Codex custom-agent defaults and project-scoped specialist agents |

## Inventory

### Shared Baseline (1)
| File | Purpose |
|------|---------|
| `AGENTS.md` | Provider-neutral repo baseline consumed directly by Codex and mirrored by Copilot assets |

## Worktree Env Contract

- `backend/.env` and `frontend/.env` are repo-tracked safe local defaults so fresh Codex worktrees can boot without copying ignored files.
- Real secrets belong in Codex UI environment variables or ignored `backend/.env.local` / `frontend/.env.local` overrides.
- `scripts/check_codex_worktree_env.sh` is the supported Codex setup hook for validating env readiness inside a new worktree.
- Baldin standardizes the Playwright MCP server as `webdev` for repo-level browser automation and Figma capture work. The repo-owned contract lives in `.codex/config.toml` as `mcp_servers.webdev`, and the setup hook validates that it still points at `@playwright/mcp`.
- Baldin's repo baseline assumes a Professional-plan Figma workflow without a Dev-seat dependency. The supported path is `webdev` plus the local browser harness, then Figma MCP or basic inspection as seat access allows.
- `frontend/figma.config.json` and `frontend/src/design-system/**/*.figma.ts` are optional local Figma metadata for future reuse. They must not become a required Code Connect publish gate for routine repo work.

### Instructions (2)
| File | Scope |
|------|-------|
| `baldin-project.instructions.md` | Runtime, delivery, docs, contracts, release-path |
| `baldin-agent-customization.instructions.md` | Agentic instructions, prompts, agents, skills, `AGENTS.md`, and Codex custom-agent alignment |

### Copilot Agents (4)
| Agent | Role |
|-------|------|
| Baldin Project Manager | Coordination, delegation, workstream planning |
| Baldin Backend Agent | Backend implementation in `./backend` |
| Baldin Frontend Agent | Frontend implementation in `./frontend` |
| Baldin Lead Full-Stack Architect | Cross-stack architecture and integration |

### Copilot Prompts (14)
`api-contract-change-orchestrator` · `backend-runtime-slice` · `change-aware-validation-sequence` · `cross-stack-workstream-router` · `deep-think-epic-planner` · `deep-think-spike` · `documentation-impact-review` · `frontend-product-slice` · `hard-gate-pr-review` · `issue-cleanup-orchestrator` · `issue-dispatch-kickoff` · `local-preview-integration-fix` · `multi-agent-handoff-synthesizer` · `plan-slice-kickoff`

Prompts are classified as **core** (9), **advanced** (4), or **maintenance** (1) per the [cookbook decision table](../docs/docs/engineering/copilot-prompt-cookbook.md#prompt-decision-table).

### Skills (5)
`baldin-agent-prompt-tuner` · `baldin-backend-test-gap-planner` · `baldin-contract-regen-resolver` · `baldin-docs-drift-auditor` · `baldin-local-stack-doctor`

### Codex Custom Agents (4)
`baldin_project_manager` · `baldin_backend` · `baldin_frontend` · `baldin_full_stack_architect`

Codex uses `AGENTS.md` plus `.codex/agents/*.toml` rather than a mirrored prompt-file catalog. Do not force a one-to-one Codex equivalent for every Copilot slash prompt.

## How To Add

- **Shared rule**: prefer `AGENTS.md` for durable repo-wide guidance that both Copilot and Codex should follow.
- **New Copilot prompt**: create under `prompts/`, keep it single-purpose, and add a cookbook entry in `docs/docs/engineering/copilot-prompt-cookbook.md`.
- **New Copilot agent**: only if the current four-agent split cannot own the work cleanly. Requires CODEOWNERS review.
- **New Codex custom agent**: create under `.codex/agents/` only when the current owner model cannot be expressed cleanly through the existing custom agents plus Codex planning.
- **New skill**: for repeatable multi-step workflows that benefit from tested instructions.
- **New instruction**: only for a genuinely new scoping dimension not covered by existing files.

## Ownership

Changes to agentic files require review per CODEOWNERS.

## Enforcement Controls

### Active
- `CODEOWNERS` gates review on `AGENTS.md`, `.codex/**`, `.github/**`, generated artifacts, CI, and scripts.
- `scripts/validate_agentic_assets.py` validates Copilot asset frontmatter, inventory, links, and the Codex surface. `.github/workflows/copilot-assets.yml` runs it in CI.
- `scripts/validate_copilot_assets.py` and `scripts/validate_copilot_assets.sh` remain thin compatibility wrappers for one transition cycle.

### Desired-State
- Add deterministic Codex hooks or equivalent Copilot hooks only when a specific policy needs enforcement beyond the validator.
