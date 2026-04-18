# Baldin v2.1 Implementation Brief Template

> Required entry artifact for every active `v2.1` implementation slice in the operator-design-forward path.
> Active direction: `docs/docs/reference/operator-design-forward-path.md`
> Working rules: `docs/docs/architecture/frontend-design-system.md` + `docs/docs/engineering/local-development.md`

Do not start implementation until this brief states the code-backed sources, boundaries, and validation plan explicitly.

## Brief Header

- Route family or slice:
- Brief owner:
- Program owner:
- Status: `draft | approved | in implementation | blocked`
- Approved on:
- Frontend implementation owner:
- Backend dependency owner: `not required` or `baldin_backend`

## Canonical Inputs

- Docs reviewed:
- Plan packet reviewed:
- Concrete source files reviewed:
- Targeted shared-surface tests reviewed:
- `operator-design` references reviewed:
- Archived Figma references consulted: `none | listed below`

## Routes And Files In Scope

- Primary routes:
- Shared layouts or collection chrome touched:
- Core files expected to change:
- Explicit out-of-scope files or routes:

## Shared-Surface Promotion Check

- Promotion proposed: `yes | no`
- Candidate shared surfaces:
- Proof of reuse across current in-repo consumers:
- Components or behaviors that remain feature-owned:

## Backend Dependency Statement

- Backend work required: `yes | no`
- Why the current API is sufficient or insufficient:
- If `yes`, link the dependency brief and stop frontend implementation until the contract plan is approved.

## Validation

- Route-level behavior checks:
- Component tests to update:
- Docs to update:
- `cd frontend && npm run test -- <targeted files>`:
- `cd frontend && npm run lint:theme`:
- `cd frontend && ./node_modules/typescript/bin/tsc --noEmit`:
- `cd frontend && VITE_API_URL=https://api.preview.invalid npm run build`:
- `npm --prefix docs run build` required: `yes | no`

## Risks And Open Questions

- Risk 1:
- Risk 2:

## Approval

- Shared-surface boundary review:
- Backend dependency review:
- Ready to implement: `yes | no`
