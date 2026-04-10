---
description: "Use when Baldin's open issue backlog needs a Project Manager-led cleanup pass that dedupes or rescopes issues, patches tickets for agent dispatch, then applies labels, projects, milestones, and relationships in order."
name: "Issue Cleanup Orchestrator"
argument-hint: "Describe which Baldin issues or backlog slice to clean up, or say 'all open issues'"
agent: "Baldin Project Manager"
model: "GPT-5 (copilot)"
---
<!-- classification: maintenance -->
Clean up the targeted Baldin issue backlog in a strict multi-pass sequence.

Use [Baldin Project Delivery Rules](../instructions/baldin-project.instructions.md), [Prompt The Right Agent](../../docs/docs/engineering/copilot-prompt-cookbook.md), [Contribute Safely](../../docs/docs/getting-started/contributing.md), [Track Release Readiness](../../docs/docs/engineering/release-roadmap.md), the current issue templates under [ISSUE_TEMPLATE](../ISSUE_TEMPLATE), and [apply_backlog_audit.sh](../../scripts/apply_backlog_audit.sh).

Task:
- Build a live inventory of the targeted issues before making any edits. Capture current title, state, body shape, labels, assignees, project membership, milestone, and relationship state.
- Reconcile the live issue state against the latest repo evidence before changing anything. If the earlier backlog audit reflected in [apply_backlog_audit.sh](../../scripts/apply_backlog_audit.sh) or current code contradicts an issue body, use the repo evidence as the source of truth and call out the drift explicitly.
- Treat the workflow as operator-assisted whenever GitHub permissions, Project v2 setup, milestone creation, or relationship writes are unavailable. Do not pretend blocked GitHub writes were completed.
- Run the cleanup passes in this exact order and do not skip ahead.

Pass 1: Dedupe or rescope similar issues.
- Cluster similar or overlapping issues before touching titles, labels, milestones, or relationships.
- Decide one disposition per issue: keep, merge into another issue, rewrite as a narrower decision or verification ticket, split into a parent with follow-on child issues, or close.
- Use the repo's current local-first, developer-preview posture to reject stale or over-scoped issues instead of preserving them out of inertia.
- Reuse [apply_backlog_audit.sh](../../scripts/apply_backlog_audit.sh) language when it already contains the right closure recommendation or rewrite framing.
- Stop for human confirmation if multiple issues overlap but resolving them requires a product or architecture decision that the repo evidence does not answer.

Pass 2: Patch the remaining open issue titles and bodies for agent dispatch.
- Rewrite every kept issue into a dispatch-ready ticket using the repo's issue-template language plus Baldin's Standard Handback schema from [Prompt The Right Agent](../../docs/docs/engineering/copilot-prompt-cookbook.md).
- Every kept issue body must include: Problem Statement, Why It Matters Now, Affected Area, Suggested owner, In-Scope, Non-Goals, Required validation, Generated-artifact note, Dependencies, Escalate if, and Return format.
- Normalize titles into outcome-oriented, surface-first wording.
- If an issue becomes a decision or verification ticket, use the help-request structure from [Custom.md](../ISSUE_TEMPLATE/Custom.md) instead of pretending it is implementation-ready.
- If backend routes or schemas could change, explicitly name the [Baldin Lead Full-Stack Architect](../agents/baldin-lead-full-stack-architect.agent.md) as the contract owner or follow-on owner.

Pass 3: Assign or update Labels and Projects.
- Apply labels only after the issue body and scope are stable.
- Prefer Baldin's smallest useful label vocabulary. Preserve existing labels when they are still accurate, and add only the minimum missing routing labels such as docs, etl, cross-stack, decision-needed, or needs-verification.
- Apply one primary surface label where possible: backend, frontend, docs, etl, devops, or cross-stack.
- Put every kept issue into the single Baldin Project v2 backlog board if it exists, or produce the operator steps to create it if it does not.
- Populate Project fields for Status, Surface, Owner, Workstream, Dispatch Ready, Phase, and Needs Decision.

Pass 4: Define Milestones in a second pass over enriched issues.
- Assign milestones only after the issue bodies, labels, and project fields reflect the final scoped ticket.
- Use Baldin's hybrid milestone model: execution-plan phases for committed work, and Decision Gate or Stretch only when a phase assignment would be misleading.
- Prefer the smallest honest milestone set, typically: Phase 2 - Integration Gate, Phase 5 - Runtime Blockers, Phase 6 - Minimum Safety Controls, Stretch - Feature Completeness, and Decision Gate.
- If a verification issue is already fixed or no longer aligned, close it instead of assigning a milestone.

Pass 5: Create Relationships between implementation-ready tickets.
- Create relationships only after the final kept issue set is stable and milestoneed.
- Use parent and sub-issue relationships only for true umbrella tickets.
- Use blocks and blocked-by relationships only where sequencing actually changes implementation order.
- Do not create relationship noise for issues that are merely related by theme.

Current backlog defaults to check explicitly when they appear in scope:
- Treat issue #10 as a likely umbrella quality ticket if it still mixes backend coverage and frontend Playwright scaffold work.
- Resolve the ETL direction conflict between #82 and #105 before both survive as implementation-ready tickets.
- Treat #59 and #126 as decision or verification tickets unless new repo evidence makes them implementation-ready.

Return:
- Objective summary.
- Live backlog snapshot and any drift from the earlier backlog audit reflected in [apply_backlog_audit.sh](../../scripts/apply_backlog_audit.sh).
- Pass-by-pass actions taken in order.
- Issues closed, merged, rewritten, or left unchanged and why.
- Label, project, milestone, and relationship summary.
- Open decisions, blockers, or operator-required steps.
- Final dispatch-ready issue table with recommended next owner for each kept issue.

Stop and hand off if:
- GitHub permissions or missing Project v2 configuration block the required writes. Return an operator checklist instead of assuming success.
- The current repo evidence is too ambiguous to dedupe responsibly.
- The issue set is already clean and the user actually wants direct implementation on one specific ticket; hand off to the smallest correct specialist owner instead.
