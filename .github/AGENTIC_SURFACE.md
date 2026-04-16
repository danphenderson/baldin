# Baldin Agentic Customization Surface

This document inventories Baldin's shared agentic customization surface across Copilot and Codex without overriding the repository README on GitHub.

## Layer Model

| Layer | Path | Scope |
|-------|------|-------|
| 1. Shared baseline | `AGENTS.md` | Canonical repo posture, owner model, and validation expectations |
| 2. Copilot compatibility baseline | `.github/copilot-instructions.md` | Copilot-specific always-on wrapper around the shared baseline |
| 3. Scoped instructions | `.github/instructions/*.instructions.md` | Edit-time rules and agentic-surface alignment |
| 4. Copilot execution layer | `.github/agents/*.agent.md`, `.github/prompts/*.prompt.md`, `.github/skills/*/SKILL.md` | Copilot specialist owners, slash prompts, and repeatable workflows |
| 5. Workspace MCP contract | `.vscode/mcp.json` | Primary repo-owned workspace MCP definition for `figma` and `webdev` |
| 6. Codex execution layer | `.codex/config.toml`, `.codex/agents/*.toml` | Codex custom-agent defaults, project-scoped specialist agents, and the repo-local `webdev` mirror |

## Inventory

### Shared Baseline (1)
| File | Purpose |
|------|---------|
| `AGENTS.md` | Provider-neutral repo baseline consumed directly by Codex and mirrored by Copilot assets |

## Worktree Env Contract

- `backend/.env` and `frontend/.env` are repo-tracked safe local defaults so fresh Codex worktrees can boot without copying ignored files.
- Real secrets belong in Codex UI environment variables or ignored `backend/.env.local` / `frontend/.env.local` overrides.
- `scripts/check_codex_worktree_env.sh` is the supported Codex setup hook for validating env readiness inside a new worktree.
- `.vscode/mcp.json` is the primary repo-owned workspace MCP contract. This slice tracks exactly two workspace-managed servers there: `figma` as the HTTP MCP endpoint and `webdev` as the stdio Playwright MCP server.
- `.codex/config.toml` is a Codex-specific mirror for `mcp_servers.webdev` only. It mirrors the same `npx -y @playwright/mcp@0.0.70` launch contract but uses Codex's repo-local `cwd = "."` instead of VS Code's `${workspaceFolder}` interpolation. Codex does not consume `.vscode/mcp.json` directly in this patch, and this repo contract does not manage a Codex-side `figma` entry.
- User-scoped or globally configured Codex MCP servers can still appear alongside the repo-local mirror on an individual machine. They are outside this repo-owned contract.
- Baldin's repo baseline assumes a Professional-plan Figma workflow without a Dev-seat dependency. Use `figma` for Figma MCP design context and Figma-side tools when user auth is available, and use `webdev` plus the local browser harness for Playwright automation and harness-driven review.
- Figma auth, account linkage, and desktop enablement remain user-scoped prerequisites rather than repo-managed setup logic.
- Privileged admin app capture auth is repo-managed through `/browser-harness/admin-session.html?next=/admin/...`, which attaches the configured local superuser session before `/admin/*` review.
- `frontend/figma.config.json` and `frontend/src/design-system/**/*.figma.ts` are optional local Figma metadata for future reuse. They must not become a required Code Connect publish gate for routine repo work.

### Instructions (2)
| File | Scope |
|------|-------|
| `baldin-project.instructions.md` | Runtime, delivery, docs, contracts, release-path |
| `baldin-agent-customization.instructions.md` | Agentic instructions, prompts, agents, skills, `AGENTS.md`, and Codex custom-agent alignment |

### Copilot Agents (5)
| Agent | Role |
|-------|------|
| Baldin Project Manager | Coordination, delegation, workstream planning |
| Baldin Backend Agent | Backend implementation in `./backend` |
| Baldin Frontend Agent | Frontend implementation in `./frontend` |
| Baldin Design Lead Agent | Figma-first design work, browser-harness capture, and design-to-code handoff |
| Baldin Lead Full-Stack Architect | Cross-stack architecture and integration |

### Copilot Prompts (14)
`api-contract-change-orchestrator` · `backend-runtime-slice` · `change-aware-validation-sequence` · `cross-stack-workstream-router` · `deep-think-epic-planner` · `deep-think-spike` · `documentation-impact-review` · `frontend-product-slice` · `hard-gate-pr-review` · `issue-cleanup-orchestrator` · `issue-dispatch-kickoff` · `local-preview-integration-fix` · `multi-agent-handoff-synthesizer` · `plan-slice-kickoff`

Prompts are classified as **core** (9), **advanced** (4), or **maintenance** (1) per the [cookbook decision table](../docs/docs/engineering/copilot-prompt-cookbook.md#prompt-decision-table).

### Skills (5)
`baldin-agent-prompt-tuner` · `baldin-backend-test-gap-planner` · `baldin-contract-regen-resolver` · `baldin-docs-drift-auditor` · `baldin-local-stack-doctor`

### Codex Custom Agents (5)
`baldin_project_manager` · `baldin_backend` · `baldin_frontend` · `baldin_design_lead` · `baldin_full_stack_architect`

Codex uses `AGENTS.md` plus `.codex/agents/*.toml` rather than a mirrored prompt-file catalog. Do not force a one-to-one Codex equivalent for every Copilot slash prompt.

## How To Add

- **Shared rule**: prefer `AGENTS.md` for durable repo-wide guidance that both Copilot and Codex should follow.
- **New Copilot prompt**: create under `prompts/`, keep it single-purpose, and add a cookbook entry in `docs/docs/engineering/copilot-prompt-cookbook.md`.
- **New Copilot agent**: only if the current owner split cannot own the work cleanly. Requires CODEOWNERS review.
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
