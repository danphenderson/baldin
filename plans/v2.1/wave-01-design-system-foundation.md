# Wave 01: Design-System Foundation And Baseline Recovery

> Status: `active`
> Default implementation owner: `baldin_frontend`
> Program owner: `baldin_project_manager`

## Goal

Re-establish a green, code-first shared-UI baseline after deprecating the Figma-gated redesign path.

## Scope

- `frontend/src/design-system/*` drift and targeted shared-surface test cleanup
- landing-page drift blocking `lint:theme`
- docs and planning surfaces that still point contributors at the redesign handoff as an active gate

## Done When

- active docs and planning prompts point to the `v2.1` contract
- `cd frontend && npm run lint:theme` passes
- touched shared surfaces have targeted tests and still typecheck and build

## Validation

- `cd frontend && npm run lint:theme`
- `cd frontend && npm run test -- <targeted shared-surface test files>`
- `cd frontend && ./node_modules/typescript/bin/tsc --noEmit`
- `cd frontend && VITE_API_URL=https://api.preview.invalid npm run build`
- `npm --prefix docs run build`
