# Baldin Agentic Customization Surface

This document inventories Baldin's shared agentic customization surface across Copilot and Codex without overriding the repository README on GitHub.

## Layer Model

| Layer | Path | Scope |
|-------|------|-------|
| 1. Shared canonical instruction tree | root/scoped `AGENTS.md` | Canonical repo posture, owner model, scoped local rules, and validation expectations |
| 2. Copilot compatibility baseline | `.github/copilot-instructions.md` | Thin Copilot-specific always-on wrapper around the shared canonical instruction tree; not the canonical policy source |
| 3. Copilot scoped instructions | `.github/instructions/*.instructions.md` | Copilot edit-time mechanics and agentic-surface alignment |
| 4. Copilot execution layer | `.github/agents/*.agent.md`, `.github/prompts/*.prompt.md`, `.github/skills/*/SKILL.md` | Copilot specialist owners, slash prompts, and repeatable workflows |
| 5. Workspace MCP contract | `.vscode/mcp.json` | Repo-owned workspace MCP definition for `figma` |
| 6. Codex execution layer | `.codex/config.toml`, `.codex/agents/*.toml` | Codex custom-agent defaults and project-scoped specialist agents |

## Inventory

### Shared Canonical Instruction Tree (1)
| File | Purpose |
|------|---------|
| `AGENTS.md` | Repo-wide baseline, directory instruction map, and durable policy source consumed by Codex and mirrored by Copilot assets |
| `**/AGENTS.md` | Scoped local-delta instructions for the nearest owning directory listed in root `AGENTS.md` |

Codex and compatible tooling should apply root `AGENTS.md` plus the applicable scoped chain for the target files. Do not load every scoped `AGENTS.md` file globally. Tracked `AGENTS.override.md` files are not part of Baldin's current instruction model.

`.github/copilot-instructions.md` is intentionally a thin compatibility layer rather than a second canonical policy file. Keep it at or below 3,900 characters so GitHub Copilot code review remains below its 4,000-character repository custom-instruction read limit.

## Worktree Env Contract

- `backend/.env` and `frontend/.env` are repo-tracked safe local defaults so fresh Codex worktrees can boot without copying ignored files.
- Real secrets belong in ignored `backend/.env.local` / `frontend/.env.local` overrides for persistent local work, or Codex UI environment variables for one-off launches.
- `scripts/check_codex_worktree_env.sh` is the supported Codex setup hook for validating env readiness inside a new worktree.
- Compose-backed backend services load `backend/.env`, then optional `backend/.env.local`, with explicit shell exports reserved for one-off override launches.
- `.vscode/mcp.json` is the primary repo-owned workspace MCP contract. This slice tracks `figma` as the HTTP MCP endpoint.
- `.codex/config.toml` contains Codex custom-agent defaults only. It no longer mirrors a repo-owned `webdev` MCP server because browser capture should use the frontend Playwright runtime, configured host browser tooling, or direct Figma MCP inspection.
- User-scoped or globally configured Codex MCP servers can still appear on an individual machine. They are outside this repo-owned contract.
- Baldin's repo baseline assumes a Professional-plan Figma workflow without a Dev-seat dependency. Use `figma` for Figma MCP design context and Figma-side tools when user auth is available, and use the local browser harness plus frontend Playwright or host browser tooling for browser-driven review.
- Figma auth, account linkage, and desktop enablement remain user-scoped prerequisites rather than repo-managed setup logic.
- Privileged admin app capture auth is repo-managed through `/browser-harness/admin-session.html?next=/admin/...`, which attaches the configured local superuser session before `/admin/*` review.
- `frontend/figma.config.json` and `frontend/src/design-system/**/*.figma.ts` are optional local Figma metadata for future reuse. They must not become a required Code Connect publish gate for routine repo work.

### Copilot Instructions (3)
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
| Baldin Design Lead Agent | Archived-design reference work, browser-harness capture, and design-system mapping maintenance |
| Baldin Lead Full-Stack Architect | Cross-stack architecture and integration |

### Copilot Prompts (14)
`api-contract-change-orchestrator` · `backend-runtime-slice` · `change-aware-validation-sequence` · `cross-stack-workstream-router` · `deep-think-epic-planner` · `deep-think-spike` · `documentation-impact-review` · `frontend-product-slice` · `hard-gate-pr-review` · `issue-cleanup-orchestrator` · `issue-dispatch-kickoff` · `local-preview-integration-fix` · `multi-agent-handoff-synthesizer` · `plan-slice-kickoff`

Prompts are classified as **core** (9), **advanced** (4), or **maintenance** (1) per the [cookbook decision table](../docs/docs/engineering/copilot-prompt-cookbook.md#prompt-decision-table).

### Skills (5)
`baldin-agent-prompt-tuner` · `baldin-backend-test-gap-planner` · `baldin-contract-regen-resolver` · `baldin-docs-drift-auditor` · `baldin-local-stack-doctor`

### Codex Custom Agents (5)
`baldin_project_manager` · `baldin_backend` · `baldin_frontend` · `baldin_design_lead` · `baldin_full_stack_architect`

Codex uses root/scoped `AGENTS.md` plus `.codex/agents/*.toml` rather than a mirrored prompt-file catalog. Do not force a one-to-one Codex equivalent for every Copilot slash prompt.

## How To Add

- **Shared rule**: prefer root `AGENTS.md` for durable repo-wide guidance that both Copilot and Codex should follow; prefer scoped `AGENTS.md` only for meaningful local deltas.
- **New scoped AGENTS file**: add it only if root inheritance is insufficient, update root `AGENTS.md`, and update `scripts/validate_agentic_assets.py` inventory in the same patch.
- **New Copilot prompt**: create under `prompts/`, keep it single-purpose, and add a cookbook entry in `docs/docs/engineering/copilot-prompt-cookbook.md`.
- **New Copilot agent**: only if the current owner split cannot own the work cleanly. Requires CODEOWNERS review.
- **New Codex custom agent**: create under `.codex/agents/` only when the current owner model cannot be expressed cleanly through the existing custom agents plus Codex planning.
- **New skill**: for repeatable multi-step workflows that benefit from tested instructions.
- **New instruction**: only for a genuinely new scoping dimension not covered by existing files.

## Ownership

Changes to agentic files require review per CODEOWNERS. Required review enforcement also depends on repository branch protection requiring code owner review.

## Enforcement Controls

### Active
- `CODEOWNERS` gates review on root/scoped `AGENTS.md`, `.codex/**`, `.vscode/mcp.json`, `.github/**`, generated artifacts, CI, and scripts when branch protection requires code owner review.
- `scripts/validate_agentic_assets.py` validates Copilot asset frontmatter, inventory, links, root/scoped `AGENTS.md`, forbidden instruction locations, no tracked `AGENTS.override.md`, the 3,900-character cap for `.github/copilot-instructions.md`, and the Codex surface. `.github/workflows/copilot-assets.yml` runs it in CI.
- `scripts/validate_copilot_assets.py` and `scripts/validate_copilot_assets.sh` remain thin compatibility wrappers for one transition cycle.

### Desired-State
- Add deterministic Codex hooks or equivalent Copilot hooks only when a specific policy needs enforcement beyond the validator.
