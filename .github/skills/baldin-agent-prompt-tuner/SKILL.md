---
name: baldin-agent-prompt-tuner
description: "Tune Baldin prompt files against the prompt cookbook, prompt examples, and Copilot asset rules. Use when a .github/prompts/*.prompt.md file is weak, overlaps another prompt, lacks a clear owner or stop conditions, or needs a tighter rewrite before merge."
argument-hint: "Optional: prompt file, draft prompt text, or workflow you want tuned"
---

# Baldin Agent Prompt Tuner

Use this skill to tighten Baldin prompt files so they match the repo's prompt cookbook, prompt examples, and Copilot asset rules. Default to producing a tuned replacement prompt, not a generic critique.

## Scope

- This is a Baldin-only workspace skill and should stay in `.github/skills/` for this repo.
- Keep the focus on prompt files under `.github/prompts/` and prompt-like draft text intended for Baldin's workspace agents.
- If the real need is an instruction, skill, or agent, say so explicitly and stop treating it as a prompt-tuning task.

## Source-Of-Truth Inputs

- `.github/instructions/baldin-agent-customization.instructions.md`
- `.github/README.md`
- `docs/docs/engineering/copilot-prompt-cookbook.md`
- `docs/docs/engineering/copilot-prompt-examples.md`
- `.github/prompts/*.prompt.md`

## Default Assumptions

- The correct output is usually a tuned replacement prompt body, not a long review memo.
- Baldin prompts should stay single-purpose and route to the smallest correct owner.
- Prompt files should link back to docs and instructions instead of restating repo-wide policy blocks.
- New prompts require cookbook registration and manifest updates so the catalog does not drift.
- If a prompt has more than one major job, the fix is usually scope reduction, not more prompt text.

## Procedure

1. Confirm the target and the primitive.
   - Identify whether the input is an existing prompt file, a draft prompt, or a weak natural-language request that should become a prompt.
   - Decide whether the work really belongs in a prompt. If it is a repeatable multi-step workflow, recommend a skill. If it needs a specialist owner with context isolation or tool restrictions, recommend an agent. If it is always-on policy, recommend an instruction instead.
2. Build the comparison set.
   - Load the prompt cookbook, prompt examples, Baldin agent customization rules, and the nearest existing prompts in `.github/prompts/`.
   - Check whether the target overlaps an existing prompt by purpose, not just keywords.
3. Diagnose the current prompt.
   - Check for weak or generic `description` text.
   - Check for owner mismatch or missing agent.
   - Check whether the prompt is mixing routing, implementation, validation, and review in one file.
   - Check whether `Task`, `Return`, and `Stop and hand off if` are missing or underspecified.
   - Check whether the prompt repeats repo posture, generated-artifact rules, or validation rules that higher layers already own.
4. Rewrite the prompt.
   - Keep the prompt single-purpose.
   - Make the `description` keyword-rich and discovery-friendly with `Use when...` phrasing.
   - Route to the smallest correct Baldin owner.
   - Add or tighten the task list, validation expectations, and handoff boundaries.
   - Prefer links to the cookbook, testing doc, and contract doc instead of copying policy into the prompt body.
   - Default to the Standard Handback reference for non-trivial work.
5. Register catalog changes when needed.
   - If this is a new prompt, update the cookbook decision table, prompt catalog references, slash examples, and `.github/README`.
   - If the prompt replaces or merges another prompt, update docs and inventory so stale entries do not remain discoverable.
6. Produce the required handback.
   - Return the tuned prompt text or file diff.
   - Summarize the key problems fixed.
   - State whether the prompt should stay a prompt or be converted into a different customization primitive.
   - Call out any cookbook, inventory, or overlap follow-up still required.

## Prompt Tuning Checklist

- The prompt has one clear job.
- The owner is explicit and minimal.
- The description contains real trigger phrases.
- The prompt does not restate baseline or instruction-layer policy.
- Validation asks for the smallest relevant checks.
- `Return` uses the Standard Handback or a justified equivalent.
- `Stop and hand off if` prevents silent scope creep.
- New or renamed prompts are registered in docs and manifest.

## Required Output

`Fit assessment`
- whether this should remain a prompt, or become an agent, skill, or instruction
- overlap with existing prompt files, if any

`Prompt diagnosis`
- the concrete weaknesses in the current prompt
- the smallest important fixes

`Tuned prompt`
- the revised frontmatter and body, or the updated file path if edited in place

`Catalog updates`
- cookbook entries to add, update, merge, or retire
- `.github/README` inventory changes, if applicable

`Final status`
- Status: complete, partial, or blocked
- Risks, blockers, or assumptions
- Recommended next owner, if any

## Common Failure Modes To Fix

- The description says what the prompt is, but not when to use it.
- The prompt asks one owner to plan, implement, review, and document everything.
- The prompt duplicates repo rules from `.github/copilot-instructions.md` or `.github/instructions/*.instructions.md`.
- The prompt forgets to mention generated-artifact handling after contract-affecting work.
- The prompt lacks a real stop condition, so ownership creeps silently.
- A new prompt is added without cookbook or manifest updates.

## Rules

- Prefer narrowing or merging prompts over adding one more near-duplicate.
- Do not convert a vague request into a large orchestration prompt unless the scope genuinely requires it.
- When a new prompt is justified, keep it thin and route-specific.
- Treat `.github/README` and the cookbook as part of the prompt surface; if they drift, the prompt work is not done.
- If the docs and current prompt disagree, follow the docs unless repo code or current workflow evidence proves the docs stale.

## Completion Checks

- The tuned prompt is clearly stronger than the input in owner selection, scope, validation, and stop conditions.
- The prompt catalog does not gain a duplicate purpose without an explicit reason.
- All prompt-surface docs and inventories touched by the change are aligned.
- The resulting prompt is still shorter and clearer than a generic policy-heavy alternative.

## Example Prompts

- Tune `frontend-product-slice.prompt.md` so it stops repeating baseline rules and has sharper stop conditions.
- Rewrite this weak Baldin prompt into a proper workspace prompt: `Fix the stale command center counts.`
- Review a new prompt draft against the cookbook and tell me whether it should really be a skill instead.
- Tighten a `.github/prompts/*.prompt.md` file and update the cookbook entry if its catalog role changed.
