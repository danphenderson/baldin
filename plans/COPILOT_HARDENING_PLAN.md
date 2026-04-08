# Copilot Hardening Implementation Plan

Date: 2026-04-07
Source: `audit-hardening.md` (synthesized audit)
Owner: Baldin Project Manager

---

## Objective

Convert the audit findings into the smallest durable change set that delivers:
thinner control-layer architecture, least-privilege agent tool surfaces, ownership/review controls for `.github/**`, prompt-catalog rationalization, Copilot-asset validation in CI, and practical enforcement of generated-artifact and validation rules.

The plan preserves the four-agent model (Project Manager, Backend, Frontend, Lead Full-Stack Architect) and the existing instruction-layering convention. It does not add agents, personas, governance layers, or scope beyond what the audit identifies.

---

## Current State (from audit, verified against repo)

| Asset | Path | Lines | Status |
|---|---|---|---|
| Workspace baseline | `.github/copilot-instructions.md` | 34 | Exists; carries duplication |
| Delivery rules | `.github/instructions/baldin-project.instructions.md` | 17 | Exists; ~65% content already in baseline |
| Agent-config rules | `.github/instructions/baldin-agent-customization.instructions.md` | 22 | Exists; directionally correct |
| Project Manager agent | `.github/agents/baldin-project-manager.agent.md` | 180 | Overprivileged (~110 tools); restates baseline |
| Backend agent | `.github/agents/baldin-backend.agent.md` | 99 | Overprivileged (~110 tools); restates baseline |
| Frontend agent | `.github/agents/baldin-frontend-agent.agent.md` | 85 | Overprivileged (~110 tools); restates baseline |
| Lead Full-Stack agent | `.github/agents/baldin-lead-full-stack-architect.agent.md` | 86 | Tool list (~48) already smaller; still restates baseline |
| Prompts (14) | `.github/prompts/*.prompt.md` | 719 total | No decision table; no retirement rule |
| Skills (4) | `.github/skills/*/SKILL.md` | — | Stable |
| CODEOWNERS | — | — | **Does not exist** |
| `.github/README.md` | — | — | **Does not exist** |
| Hooks | `.github/hooks/` | — | **Does not exist** |
| Copilot-asset CI validation | — | — | **Does not exist** |

---

## Execution Phases

### Phase 1 — Control-Layer Cleanup (must land now)

**Goal:** Eliminate policy duplication between baseline, instructions, and agent bodies so that each layer owns its content once.

#### File-level changes

| File | Action | Detail |
|---|---|---|
| `.github/copilot-instructions.md` | **Trim** | Remove Repo Boundaries, Generated Artifacts, and Validation sections. Replace with single-line references to `baldin-project.instructions.md`. Keep only: Repo Posture (2 bullets), Reference Docs (5 links), and a one-line "scoped rules live in `.github/instructions/`" pointer. Target: ≤20 lines. |
| `.github/instructions/baldin-project.instructions.md` | **Preserve as-is** | Already the canonical delivery-rule surface. No changes needed—duplication is removed by trimming the baseline above it. |
| `.github/instructions/baldin-agent-customization.instructions.md` | **Preserve as-is** | Already correct. |
| `.github/agents/baldin-project-manager.agent.md` | **Rewrite body** | Remove restated repo-posture, repo-boundary, generated-artifact, and validation text. Replace with "Inherits repo posture, boundaries, artifacts, and validation rules from the workspace baseline and scoped instructions." Keep: Mission, Agent Team, Owner-Selection, Workflow, Operating Rules, Handoff Packet, Output Format. Target: ≤140 lines (from 180). |
| `.github/agents/baldin-backend.agent.md` | **Rewrite body** | Same deduplication pattern. Remove Baldin Backend Context block that restates baseline. Replace with inheritance line. Keep: role, allowed paths, constraints unique to backend, validation specifics. Target: ≤70 lines (from 99). |
| `.github/agents/baldin-frontend-agent.agent.md` | **Rewrite body** | Same pattern. Target: ≤65 lines (from 85). |
| `.github/agents/baldin-lead-full-stack-architect.agent.md` | **Rewrite body** | Same pattern. Target: ≤65 lines (from 86). |
| `.github/README.md` | **Create** | Copilot customization manifest: inventory of baseline, instructions, agents (4), prompts (14), skills (4). Include layer diagram and "how to add" rules. Target: ≤60 lines. |

#### Acceptance criteria

- [ ] `.github/copilot-instructions.md` is ≤20 lines and contains no delivery-rule detail that `baldin-project.instructions.md` already owns.
- [ ] Each agent body is ≥20% shorter with zero restated repo-posture, boundary, or generated-artifact text.
- [ ] `.github/README.md` exists and inventories all current Copilot assets.
- [ ] All four agents still function correctly when invoked (manual smoke test).

#### Validation steps

1. Verify no agent body contains the phrases "local-first developer-preview", "Never hand-edit", or "Validate the touched surface" (these belong to higher layers).
2. Invoke each agent with a trivial task and confirm it inherits baseline + scoped instructions correctly.
3. Confirm `.github/README.md` matches actual file inventory.

#### Owner: Baldin Lead Full-Stack Architect

---

### Phase 2 — Agent Least-Privilege Hardening (must land now)

**Goal:** Reduce tool surfaces to match actual role responsibilities.

#### File-level changes

| File | Action | Detail |
|---|---|---|
| `.github/agents/baldin-project-manager.agent.md` | **Trim tools** | Remove: `browser/*`, `ms-python.python/*`, `ms-azuretools.vscode-containers/*`, `ms-toolsai.jupyter/*`, `vscode/installExtension`, `vscode/newWorkspace`, `vscode/vscodeAPI`, `edit/createJupyterNotebook`, `edit/editNotebook`, `read/readNotebookCellOutput`, `execute/runNotebookCell`. Keep: `agent`, `agent/runSubagent`, `vscode/askQuestions`, `vscode/memory`, `vscode/resolveMemoryFileUri`, `vscode/switchAgent`, `vscode/getProjectSetupInfo`, `vscode/runCommand`, `search/*`, `read/readFile`, `read/viewImage`, `read/problems`, `read/terminalSelection`, `read/terminalLastCommand`, `read/getNotebookSummary`, `edit/createFile`, `edit/createDirectory`, `edit/editFiles`, `edit/rename`, `execute/runInTerminal`, `execute/getTerminalOutput`, `execute/awaitTerminal`, `execute/killTerminal`, `execute/createAndRunTask`, `execute/runTests`, `execute/testFailure`, `web/fetch`, `github.vscode-pull-request-github/*`, `github/*`, `vscode.mermaid-chat-features/renderMermaidDiagram`, `todo`. Rationale: PM is a coordinator; it delegates browser, container, Python, and notebook work to specialists. |
| `.github/agents/baldin-backend.agent.md` | **Trim tools** | Remove: `browser/*`, `github/*`, `vscode/installExtension`, `vscode/newWorkspace`, `vscode/vscodeAPI`, `vscode/extensions`, `agent/runSubagent` (Backend agent does not orchestrate sub-agents). Keep: `vscode/askQuestions`, `vscode/memory`, `vscode/resolveMemoryFileUri`, `vscode/getProjectSetupInfo`, `vscode/runCommand`, `search/*`, `read/*`, `edit/createFile`, `edit/createDirectory`, `edit/editFiles`, `edit/rename`, `execute/*`, `web/fetch`, `ms-python.python/*`, `ms-azuretools.vscode-containers/containerToolsConfig`, `ms-toolsai.jupyter/*` (notebooks used in backend/notebooks), `github.vscode-pull-request-github/*`, `vscode.mermaid-chat-features/renderMermaidDiagram`, `todo`. |
| `.github/agents/baldin-frontend-agent.agent.md` | **Trim tools** | Remove: `browser/*`, `github/*`, `ms-python.python/*`, `ms-azuretools.vscode-containers/*`, `ms-toolsai.jupyter/*`, `vscode/installExtension`, `vscode/newWorkspace`, `vscode/vscodeAPI`, `agent/runSubagent`. Keep: `vscode/askQuestions`, `vscode/memory`, `vscode/resolveMemoryFileUri`, `vscode/getProjectSetupInfo`, `vscode/runCommand`, `search/*`, `read/*`, `edit/createFile`, `edit/createDirectory`, `edit/editFiles`, `edit/rename`, `execute/*`, `web/fetch`, `github.vscode-pull-request-github/*`, `vscode.mermaid-chat-features/renderMermaidDiagram`, `todo`. |
| `.github/agents/baldin-lead-full-stack-architect.agent.md` | **Trim tools** | Remove: `browser/*`. Add: `github/*` (this agent needs repo mutation for contract regen and CI work). Keep everything else from current ~48-tool list. Verify `agent` alias is present if `agents:` is declared in frontmatter. |

#### Acceptance criteria

- [ ] PM tool list drops from ~110 to ≤55 entries.
- [ ] Backend agent tool list drops from ~110 to ≤45 entries.
- [ ] Frontend agent tool list drops from ~110 to ≤40 entries.
- [ ] Lead Full-Stack Architect tool list stays ≤50 entries; gains `github/*` if missing.
- [ ] No agent retains `browser/*` unless directly justified.
- [ ] Backend and Frontend agents do not retain `agent/runSubagent` (they do not orchestrate).

#### Validation steps

1. Review each agent's `tools:` frontmatter against the target list above.
2. Invoke each agent with a representative task and confirm no tool-not-found errors on routine operations.
3. Confirm PM can still dispatch sub-agents, Backend can still run pytest and notebooks, Frontend can still run npm/tsc, and Lead can still run schema regen.

#### Owner: Baldin Lead Full-Stack Architect

---

### Phase 3 — Ownership And Enforcement Controls (must land now)

**Goal:** Add CODEOWNERS and mechanical enforcement for `.github/**` and generated artifacts.

#### File-level changes

| File | Action | Detail |
|---|---|---|
| `CODEOWNERS` | **Create** | At repo root. Entries: `.github/copilot-instructions.md`, `.github/instructions/**`, `.github/agents/**`, `.github/prompts/**`, `.github/skills/**`, `docs/docs/engineering/copilot-*.md` → `@danphenderson`. Also: `openapi.json`, `frontend/src/schema.d.ts`, `docs/build/**` → `@danphenderson` (generated artifacts require review). |
| `.github/hooks/block-generated-artifact-edits.json` | **Create (best-effort)** | Hook definition that warns/blocks direct edits to `openapi.json`, `frontend/src/schema.d.ts`, `docs/build/**`. |
| `.github/hooks/require-validation-reminder.json` | **Create (best-effort)** | Hook definition that reminds agents to validate touched surfaces. |

#### Fallback path for hooks

VS Code Copilot hooks support is evolving. If `.github/hooks/*.json` is not reliably consumed by the current Copilot version:

1. Skip hook file creation.
2. Instead add a `copilot-assets` job to `.github/workflows/ci.yml` that runs `scripts/validate_copilot_assets.sh` (a thin shell wrapper, created alongside the Python validator in Phase 5) to enforce the same rules.
3. Document the hook definitions in `.github/README.md` as "desired-state" controls to be enabled when hooks stabilize.

#### Acceptance criteria

- [ ] `CODEOWNERS` exists and covers `.github/**`, `openapi.json`, `frontend/src/schema.d.ts`, `docs/build/**`.
- [ ] Hook files exist (or: the fallback CI path is in place and documented).
- [ ] A PR that touches `.github/agents/*.agent.md` triggers a CODEOWNERS review requirement (verify via GitHub branch protection settings or PR test).

#### Validation steps

1. Open a test PR touching `.github/agents/baldin-backend.agent.md` and confirm review is required.
2. If hooks are created, test that editing `openapi.json` directly triggers the block/warning.
3. If fallback CI path is used, confirm the CI job runs and fails on a simulated generated-artifact edit.

#### Owner: Baldin Lead Full-Stack Architect

---

### Phase 4 — Prompt Catalog Rationalization (follow-on hardening)

**Goal:** Document the 14-prompt catalog with a decision table, classify advanced prompts, and set a retirement rule.

#### File-level changes

| File | Action | Detail |
|---|---|---|
| `docs/docs/engineering/copilot-prompt-cookbook.md` | **Extend** | Add a "Prompt Decision Table" section with columns: Prompt Name, Purpose, When to Use, Complexity (core / advanced / maintenance). Classify `deep-think-spike` and `deep-think-epic-planner` as advanced. Classify `issue-cleanup-orchestrator` as maintenance. |
| `docs/docs/engineering/copilot-prompt-cookbook.md` | **Extend** | Add a "Prompt Lifecycle Rules" subsection: (1) new prompts require a one-line entry in the decision table; (2) prompts with >80% overlap in purpose must be merged or one retired; (3) maintenance prompts should be reviewed for skill conversion quarterly. |
| `.github/prompts/issue-cleanup-orchestrator.prompt.md` | **Evaluate for skill conversion** | If the prompt body exceeds 50 lines of procedural logic (currently 68 lines), convert the procedural core into `.github/skills/baldin-issue-cleanup/SKILL.md` and replace the prompt with a thin routing entry that invokes the skill. If the conversion is not clean, keep as a prompt but add `<!-- classification: maintenance -->` metadata. |
| `.github/README.md` | **Update** | Add prompt-catalog summary table reflecting the decision table. |

#### Acceptance criteria

- [ ] `docs/docs/engineering/copilot-prompt-cookbook.md` contains a decision table covering all 14 prompts.
- [ ] `deep-think-spike` and `deep-think-epic-planner` are classified as advanced.
- [ ] `issue-cleanup-orchestrator` is either converted to a skill or explicitly classified as maintenance.
- [ ] A retirement/merge rule exists in the cookbook.

#### Validation steps

1. `npm --prefix docs run build` succeeds.
2. Decision table accounts for all 14 files in `.github/prompts/`.
3. No prompt is left unclassified.

#### Owner: Baldin Lead Full-Stack Architect (prompt catalog spans agent config and docs)

---

### Phase 5 — Copilot-Asset Validation In CI (follow-on hardening)

**Goal:** Add machine-checkable validation for Copilot customization assets.

#### File-level changes

| File | Action | Detail |
|---|---|---|
| `scripts/validate_copilot_assets.py` | **Create** | Python script (stdlib only, no third-party deps) that checks: (1) all `.agent.md`, `.prompt.md`, `.instructions.md` files have valid YAML frontmatter; (2) `applyTo` globs in instructions resolve to at least one existing path; (3) agent files declaring `agents:` also include `agent` in `tools:`; (4) local markdown links in agent/prompt/instruction bodies resolve to existing files; (5) `.github/README.md` inventory matches actual file list. Exit 0 on pass, exit 1 with diagnostics on failure. |
| `.github/workflows/ci.yml` | **Extend** | Add a `copilot-assets` job after `lint`. Runs `python scripts/validate_copilot_assets.py`. Triggers on changes to `.github/**` and `scripts/validate_copilot_assets.py`. Uses `paths:` filter so it only runs when relevant files change. |
| `scripts/validate_copilot_assets.sh` | **Create (optional)** | Thin shell wrapper around `validate_copilot_assets.py` for local use: `#!/bin/bash` + `python3 "$(dirname "$0")/validate_copilot_assets.py" "$@"`. |

#### Acceptance criteria

- [ ] `python scripts/validate_copilot_assets.py` passes against the post-Phase-1-through-4 repo state.
- [ ] CI fails if a `.agent.md` file has broken frontmatter or missing `agent` tool when `agents:` is declared.
- [ ] CI fails if `.github/README.md` inventory drifts from actual file list.
- [ ] Script runs in <5s on CI with no external dependencies.

#### Validation steps

1. Introduce a deliberate frontmatter error in a test branch and confirm CI catches it.
2. Remove `agent` from PM tools in a test branch and confirm CI catches it.
3. Add a fake prompt to `.github/prompts/` without updating `.github/README.md` and confirm CI catches it.

#### Owner: Baldin Lead Full-Stack Architect

---

## Recommended Execution Order

```
Phase 1  Control-Layer Cleanup           ──── must land now
Phase 2  Agent Least-Privilege Hardening ──── must land now (can parallel with Phase 1)
Phase 3  Ownership & Enforcement         ──── must land now (after Phase 1+2 merge)
Phase 4  Prompt Catalog Rationalization  ──── follow-on hardening
Phase 5  Copilot-Asset CI Validation     ──── follow-on hardening (after Phase 4)
```

Phases 1 and 2 edit the same agent files but target different sections (body text vs. frontmatter tools). They can be done in a single slice by the same owner to avoid merge conflicts, or sequenced 1→2 if done by different contributors.

Phase 3 depends on Phases 1+2 being merged so CODEOWNERS protects the cleaned-up state.

Phases 4 and 5 are lower urgency. Phase 5 should validate the catalog state established by Phase 4.

---

## Risks And Blockers

| Risk | Impact | Mitigation |
|---|---|---|
| Tool trimming removes a tool an agent actually needs at runtime | Agent fails on a routine task | Smoke-test each agent after Phase 2; keep a "tools restored" follow-up path |
| `.github/hooks/` not consumed by current VS Code Copilot version | Hooks are inert | Fallback: enforce the same rules via CI job (documented in Phase 3) |
| CODEOWNERS enforcement requires branch protection rule on `feat-sprint` | Reviews not gated until protection is enabled | Enable branch protection after Phase 3 merge; document as a manual post-merge step |
| Baseline trimming removes context that agents relied on implicitly | Agent behavior degrades subtly | Phase 1 acceptance criteria requires smoke-testing all four agents |
| `validate_copilot_assets.py` needs Python 3.11+ for modern YAML/glob handling | CI already uses Python 3.11.2 | No risk for CI; local use requires Python 3.11+ (document in script header) |
| `applyTo` glob validation may have edge cases with comma-separated patterns | False positives in CI | Use glob per comma-split segment; add `--warn-only` flag for first CI deployment |

---

## What This Plan Does Not Do

Per audit instructions, the following are explicitly out of scope:

- Adding new agents beyond the current four
- Introducing governance documents, approval processes, or compliance layers
- Reopening the baseline-creation phase
- Re-auditing the repo
- Expanding into SaaS-platform architecture
- Changing runtime application behavior
