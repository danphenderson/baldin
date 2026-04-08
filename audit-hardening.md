# Audit And Hardening Plan

Date: 2026-04-07

## Objective

Produce the final current-state audit and implementation-hardening plan for Baldin's Copilot customization surface as `audit-hardening.md`.

This document synthesizes the two independent audits into one execution plan that is grounded in the repository **as it exists now**, while preserving the strongest strategic conclusions from the earlier pass. The first report remains useful for architectural direction and target-state framing, but the second report supersedes it on inventory, sequencing, and immediate priorities where the repo has already moved. fileciteturn0file0 fileciteturn0file1

## Synthesis Summary

Both audits agree on the core judgment: Baldin's Copilot setup is no longer an ad hoc prototype, but it is still not enterprise-ready. The repo already has meaningful repo-specific prompts, skills, and docs, plus the correct four-agent ownership model. The first hardening slice also landed the most important structural correction: an always-on workspace baseline and a split between delivery rules and Copilot-asset rules. fileciteturn0file0 fileciteturn0file1

The key reconciliation is this:

- **Report 1 is right** about the target architecture: explicit layering, fewer stronger agents, repo-specific workflows, and a minimal durable governance model.
- **Report 2 is right** that the repo has already advanced past the original “missing baseline” phase, so the next plan must stop treating baseline creation as the primary blocker.

The final conclusion is therefore:

> Baldin now has a credible governed Copilot foundation, but the next hardening slice must focus on **least privilege, enforcement, ownership, and catalog control** rather than redoing baseline-layer work. fileciteturn0file0 fileciteturn0file1

## Final Verdict

### Current maturity

Verdict: **governed POC with a durable foundation, but not enterprise-ready**. fileciteturn0file0 fileciteturn0file1

### Why

What is already strong and should be preserved:

- a real always-on workspace baseline in `.github/copilot-instructions.md`
- explicit scoped instruction split between delivery rules and Copilot-asset rules
- the correct four-agent ownership model: Project Manager, Backend, Frontend, Lead Full-Stack Architect
- repo-specific prompts and skills tied to real Baldin workflows rather than generic prompt theater
- active engineering docs that explain usage and working model

These points are consistent across both audits. fileciteturn0file0 fileciteturn0file1

What still blocks enterprise-readiness:

- specialist agents remain overprivileged relative to their stated roles
- policy still duplicates across baseline, instructions, and agent bodies
- governance is largely advisory because enforcement artifacts are missing
- ownership and review controls for `.github/**` are missing
- prompt-catalog growth now needs explicit control and documentation
- customization assets still lack machine validation in CI

This is the shared end-state diagnosis once the two reports are reconciled. fileciteturn0file0 fileciteturn0file1

## Repo-Grounded Current State

The current Copilot customization surface includes:

- 1 workspace baseline: `.github/copilot-instructions.md`
- 2 scoped instructions: `.github/instructions/baldin-project.instructions.md` and `.github/instructions/baldin-agent-customization.instructions.md`
- 4 agents
- 14 prompts
- 4 skills
- active docs under `docs/docs/engineering/` covering cookbook, examples, testing, contract management, local development, and CI

The repo does **not** yet have:

- `.github/hooks/**`
- `CODEOWNERS`
- `.github/README.md` or equivalent customization manifest
- `scripts/validate_copilot_assets.py`
- dedicated CI validation for Copilot assets

That inventory makes Report 2 authoritative on immediate sequencing and eliminates any plan that still starts with “add the missing baseline.” fileciteturn0file1

## Planning Decisions

### Decision 1: Do not reopen the baseline phase as the main workstream

The baseline exists, the instruction split exists, and the docs have already been updated to reflect that model. The next plan should refine those layers, not rebuild them from scratch. fileciteturn0file0 fileciteturn0file1

### Decision 2: Keep the four-agent model

Do not add more long-lived specialist agents. Both reports conclude the current four-agent model is the right size for Baldin’s repo and maturity. The work is to harden the current four, not expand them. fileciteturn0file0 fileciteturn0file1

### Decision 3: Make least privilege the first hardening priority

The most important unresolved governance failure is tool sprawl in Project Manager, Backend, and Frontend agents, with Lead Full-Stack Architect also needing trimming and deduplication. This becomes the first implementation priority. fileciteturn0file0 fileciteturn0file1

### Decision 4: Add controls before adding more surface area

Do not add more prompts, more long-lived personas, or more governance docs until the repo has ownership controls, validation, and a customization manifest. fileciteturn0file0 fileciteturn0file1

### Decision 5: Govern the prompt catalog as infrastructure

With 14 prompts, Baldin now needs a manifest, a decision table, advanced-prompt classification, and a retirement rule for overlapping prompts. Prompt count is not yet excessive, but it is no longer self-governing. fileciteturn0file1

## Target Architecture

The durable target architecture remains the one implied by Report 1, updated with Report 2’s current-state corrections:

### Layer 1: Always-on workspace baseline

**File:** `.github/copilot-instructions.md`

Own only:

- repo posture
- core repo boundaries
- generated-artifact source-of-truth rules
- high-level validation defaults
- links to authoritative docs

The baseline should be thinner than it is now and should stop duplicating delivery rules. fileciteturn0file0 fileciteturn0file1

### Layer 2: Scoped instructions

**Files:**

- `.github/instructions/baldin-project.instructions.md`
- `.github/instructions/baldin-agent-customization.instructions.md`

These remain the main rule surfaces for:

- product-delivery behavior
- Copilot-asset behavior
- least-privilege guidance
- drift-resistance rules

These layers are directionally correct and should be preserved, with duplication reduced above and below them. fileciteturn0file0 fileciteturn0file1

### Layer 3: Prompt entry points

**Location:** `.github/prompts/`

Rules:

- one prompt, one job
- prompts should route or initiate work, not become policy manuals
- advanced prompts should be explicitly classified as such
- overlapping prompts need a decision table and retirement rule

This is where Report 2 materially extends Report 1. fileciteturn0file1

### Layer 4: Specialist agents

**Location:** `.github/agents/`

Rules:

- preserve the current four-agent owner model
- reduce tools to least privilege
- keep PM as coordinator rather than default operator
- link to higher-order policy/docs instead of restating them
- keep explicit handback/stop conditions

This is the main hardening target. fileciteturn0file0 fileciteturn0file1

### Layer 5: Skills, docs, and controls

**Locations:** `.github/skills/`, `docs/docs/engineering/`, `.github/hooks/`, `scripts/`, CI

Skills and docs remain useful. The missing piece is the control layer:

- hooks where supported
- CI validation of Copilot assets
- ownership controls
- operator-facing manifest/index

That is the smallest enterprise-style control model that fits Baldin’s maturity. fileciteturn0file0 fileciteturn0file1

## Final Hardening Plan

## Phase 1 — Control-Layer Cleanup

**Goal:** make the current instruction architecture genuinely thin and durable.

### Actions

1. Trim `.github/copilot-instructions.md` into a true always-on baseline.
2. Keep `.github/instructions/baldin-project.instructions.md` as the main delivery-rule source of truth.
3. Keep `.github/instructions/baldin-agent-customization.instructions.md` as the main Copilot-asset rule surface.
4. Rewrite all four agent bodies to remove repeated repo posture, generated-artifact policy, and validation text that already belongs to the baseline or scoped instructions.
5. Add `.github/README.md` as the Copilot customization manifest and operator entry point.

### Why first

This phase reduces drift before adding mechanical enforcement. It also reconciles the main difference between the two audits: Report 1 wanted stronger layering, while Report 2 shows the layers exist but still carry too much duplicated content. fileciteturn0file0 fileciteturn0file1

### Acceptance criteria

- baseline no longer duplicates delivery-rule detail already owned elsewhere
- agent files are materially shorter and link upward instead of restating policy
- `.github/README.md` exists and inventories instructions, agents, prompts, skills, hooks, and validation

## Phase 2 — Agent Least-Privilege Hardening

**Goal:** align actual allowed powers with stated role boundaries.

### Actions

1. Reduce tool surfaces in:
   - `.github/agents/baldin-project-manager.agent.md`
   - `.github/agents/baldin-backend.agent.md`
   - `.github/agents/baldin-frontend-agent.agent.md`
   - `.github/agents/baldin-lead-full-stack-architect.agent.md`
2. Keep the PM’s `agent` alias because the environment requires it when subagents are declared.
3. Remove broad GitHub mutation, repository-management, browser, workspace, and extension-management tools from specialist agents unless directly justified by their routine responsibilities.
4. Preserve broader cross-stack authority for Lead Full-Stack Architect, but still trim unused generic tooling.

### Why second

Both audits agree this is now the largest remaining governance defect. It is the most direct move from “documented governance” to “credible governance.” fileciteturn0file0 fileciteturn0file1

### Acceptance criteria

- PM behaves as a coordinator by default, not a near-omnipotent operator
- Backend and Frontend agents expose only role-appropriate implementation and validation tools
- Lead Full-Stack Architect remains broader than the specialists but is no longer generic-maximal

## Phase 3 — Ownership And Enforcement Controls

**Goal:** treat `.github/**` as operational infrastructure rather than informal configuration.

### Actions

1. Add `CODEOWNERS` covering:
   - `.github/copilot-instructions.md`
   - `.github/instructions/**`
   - `.github/agents/**`
   - `.github/prompts/**`
   - `.github/skills/**`
   - `docs/docs/engineering/copilot-*.md`
2. Add `.github/hooks/block-generated-artifact-edits.json`.
3. Add `.github/hooks/require-validation-reminder.json`.
4. If hooks are not sufficiently supported or stable in the current environment, keep them as desired-state artifacts and enforce the same rules through CI/script checks instead.

### Why third

This phase converts rules that are currently advisory into explicit operational controls without introducing heavy process bureaucracy. That matches the desired “minimal enterprise-grade” posture from Report 1 and the missing-control diagnosis from Report 2. fileciteturn0file0 fileciteturn0file1

### Acceptance criteria

- Copilot asset changes require explicit review ownership
- generated-artifact edit rules have a mechanical enforcement path
- validation reminder/gating exists for touched repo surfaces

## Phase 4 — Prompt Catalog Rationalization

**Goal:** keep the 14-prompt catalog legible, bounded, and low-drift.

### Actions

1. Add a decision table to `docs/docs/engineering/copilot-prompt-cookbook.md` explaining when to use:
   - `Cross-Stack Workstream Router`
   - `Plan Slice Kickoff`
   - `Issue Dispatch Kickoff`
   - `Deep Think Spike`
   - `Deep Think Epic Planner`
2. Classify `Deep Think Spike` and `Deep Think Epic Planner` as advanced prompts.
3. Keep stable core prompts for routing, validation, contract change orchestration, docs impact review, frontend/backend slices, local preview fixes, and hard-gate review.
4. Convert `Issue Cleanup Orchestrator` into a skill, or substantially shorten it and explicitly classify it as a specialized maintenance workflow.
5. Add a prompt retirement/merge rule to the manifest or cookbook so new prompts do not accumulate without justification.

### Why fourth

Report 1 emphasized durable prompt layering; Report 2 correctly upgrades prompt-count governance into a first-class concern. This phase resolves that tension without flattening Baldin’s repo-specific workflows into generic templates. fileciteturn0file0 fileciteturn0file1

### Acceptance criteria

- prompt catalog is documented and grouped by purpose
- advanced prompts are clearly labeled
- overlapping entry points have a documented decision rule
- heavy operational workflows are represented as skills where appropriate

## Phase 5 — Customization Asset Validation In CI

**Goal:** make Copilot-surface changes machine-checkable and safe to evolve.

### Actions

1. Add `scripts/validate_copilot_assets.py`.
2. Extend CI with a Copilot-assets validation job or step.
3. Validate at minimum:
   - frontmatter presence and parseability
   - broken local links
   - missing referenced files
   - invalid `applyTo` paths
   - agent-file invariants such as `agent` tool alias presence when `agents:` is declared
4. Optionally add “last verified” metadata/comments once the validation path exists and is stable.

### Why fifth

This phase should validate the cleaned-up architecture, not the pre-cleanup state. That sequencing comes directly from Report 2 and refines Report 1’s earlier drift-control recommendation into a concrete implementation plan. fileciteturn0file1

### Acceptance criteria

- CI fails on broken or inconsistent Copilot assets
- local validation script is usable during review and development
- customization drift becomes detectable before merge

## Required Artifact Changes

### Create

- `.github/README.md`
- `CODEOWNERS`
- `.github/hooks/block-generated-artifact-edits.json`
- `.github/hooks/require-validation-reminder.json`
- `scripts/validate_copilot_assets.py`

These are explicit missing-control artifacts identified in Report 2 and consistent with the governance direction in Report 1. fileciteturn0file1 fileciteturn0file0

### Rewrite first

- `.github/copilot-instructions.md`
- `.github/agents/baldin-project-manager.agent.md`
- `.github/agents/baldin-backend.agent.md`
- `.github/agents/baldin-frontend-agent.agent.md`

These are the highest-value rewrites because they address the current top risk: duplicated policy plus overprivileged roles. fileciteturn0file0 fileciteturn0file1

### Rewrite second

- `.github/agents/baldin-lead-full-stack-architect.agent.md`
- `.github/prompts/issue-cleanup-orchestrator.prompt.md`
- `docs/docs/engineering/copilot-prompt-cookbook.md`
- `docs/docs/engineering/copilot-prompt-examples.md` as needed to reflect the final catalog model

These changes tighten maintainability and documentation after the control layer is stabilized. fileciteturn0file0 fileciteturn0file1

## Recommended Execution Order

1. Trim `.github/copilot-instructions.md`.
2. Rewrite PM, Backend, and Frontend agents for least privilege and reduced duplication.
3. Add `.github/README.md`.
4. Add `CODEOWNERS`.
5. Add hooks if environment support is reliable enough; otherwise implement the same checks in CI/script form first.
6. Add `scripts/validate_copilot_assets.py` and wire it into CI.
7. Rationalize the prompt catalog and docs.
8. Revisit any remaining duplication in Lead Full-Stack Architect and cookbook/examples docs.

This order is the clean synthesis of both reports: it preserves the architectural direction from Report 1 but uses the current-state sequencing corrections from Report 2. fileciteturn0file0 fileciteturn0file1

## What Not To Do

Do not spend the next slice on:

- adding more long-lived specialist agents
- introducing heavy approval or compliance bureaucracy
- inventing large governance documents outside the current docs system
- pretending Baldin already needs mature SaaS operations architecture
- adding more prompt surface area before ownership, validation, and catalog rules exist

Both audits are aligned on keeping the hardening plan proportionate to Baldin’s actual maturity. fileciteturn0file0 fileciteturn0file1

## Final Recommendation

The final, combined implementation plan is:

1. **clean the control layer** so baseline, scoped instructions, and agent bodies have crisp boundaries
2. **harden the four existing agents** through least-privilege tool reduction
3. **add ownership and enforcement controls** for `.github/**`
4. **govern the prompt catalog** as shared operational infrastructure
5. **validate Copilot assets in CI** so drift becomes visible and enforceable

That is the minimal durable path from today’s governed POC to a credible enterprise-ready Copilot customization surface for Baldin. It avoids redoing already-landed baseline work, preserves the repo-specific strengths highlighted in both audits, and focuses effort on the current blockers that still matter. fileciteturn0file0 fileciteturn0file1
