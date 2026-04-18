# Wave 02: Legacy Shell Migration

> Status: `planned`
> Default implementation owner: `baldin_frontend`
> Program owner: `baldin_full_stack_architect`

## Goal

Reduce remaining raw MUI shell usage that still bypasses the canonical design-system layer.

## Priority Debt

- raw `Alert` usage that should move to `InlineFeedback`
- raw `Dialog` usage that should move to `SurfaceDialog` or `FormDialogShell`
- dead compatibility wrappers that can be deleted once the last consumer moves

## Slice Rules

- migrate the smallest coherent page or route family at a time
- do not mix route-specific semantics into shared-surface promotion
- update the design-system docs when the inventory or adoption status changes

## Validation

- `cd frontend && npm run lint:theme`
- `cd frontend && npm run test -- <targeted shared-surface test files>` when shared behavior changes
- `cd frontend && ./node_modules/typescript/bin/tsc --noEmit`
- `cd frontend && VITE_API_URL=https://api.preview.invalid npm run build`
