# Baldin Redesign Implementation Brief Template

> Required entry artifact for every post-closeout redesign implementation slice.
> Active redesign source: `docs/docs/reference/baldin-redesign-handoff.md`
> Program rules: `docs/docs/engineering/redesign-implementation-program.md`

Do not start implementation until this brief is filled with exact approved redesign nodes and the boundary decisions below are explicit.

## Brief Header

- Route family or slice:
- Brief owner:
- Program owner:
- Status: `draft | approved | in implementation | blocked`
- Approved on:
- Design approver:
- Frontend implementation owner:
- Backend dependency owner: `not required` or `baldin_backend`

## Canonical Inputs

- Handoff sections applied:
- Route-family packet or supporting brief:
- Dashboard aggregation impact: `none | updates metrics | changes summary framing`

## API Surfaces Consumed

- Service modules this route family calls:
- Known API gaps that could block the redesign:

## Approved Design Inputs

- Figma file:
- Figma file key:
- Approved page name or names:
- `00 · Vision & Route Map` rows referenced:
- Exact approved node IDs:
- Approval notes:

## Routes In Scope

- Primary routes:
- Shared layouts or collection chrome touched:
- Explicit out-of-scope routes:

## Shared-Surface Promotion Check

- Promotion proposed: `yes | no`
- Candidate shared surfaces:
- Proof of reuse across approved route families:
- Components or behaviors that remain feature-owned:

## Backend Dependency Statement

- Backend work required: `yes | no`
- Why the current API is sufficient or insufficient:
- If `yes`, link the dependency brief and stop frontend implementation until the contract plan is approved.

## PR Slicing

- Shared-foundation PR required: `yes | no`
- Route-family PR scope:
- Cleanup PR expected: `yes | no`
- Notes:

## Validation

- Route-level behavior checks:
- Component tests to update:
- Docs to update:
- `cd frontend && ./node_modules/.bin/tsc --noEmit`:
- `cd frontend && npm run build`:
- `cd frontend && npm run lint:theme` required: `yes | no`
- `cd frontend && npm run test -- <targeted files>`:
- Visual or manual verification plan against the approved nodes:

## Risks And Open Questions

- Risk 1:
- Risk 2:

## Approval

- Design approval:
- Shared-surface boundary review:
- Backend dependency review:
- Ready to implement: `yes | no`
