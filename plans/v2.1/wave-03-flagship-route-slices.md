# Wave 03: Flagship Route Slices

> Status: `planned`
> Default implementation owner: `baldin_frontend`
> Program owner: `baldin_full_stack_architect`

## Goal

Continue the product app from the shipped `v2.1` design-system contract instead of reopening route work through new Figma screens.

## Default Order

1. `/me`
2. `/me/aspirations/roles`
3. `/me/aspirations/companies`
4. `/leads`
5. `/applications`
6. `/applications/board`
7. `/applications/:applicationId`

## Source Rules

- start from current route code plus `frontend/src/design-system/*`
- use `operator-design/` only as visual reference
- consult archived Figma material only when historical context is necessary
- do not block a slice on Figma node approval or a new handoff artifact

## Validation

- route-level behavior checks for the touched pages
- `cd frontend && npm run lint:theme` when shared UI or imports changed
- `cd frontend && npm run test -- <targeted shared-surface test files>` when public shared React behavior changed
- `cd frontend && ./node_modules/typescript/bin/tsc --noEmit`
- `cd frontend && VITE_API_URL=https://api.preview.invalid npm run build`
