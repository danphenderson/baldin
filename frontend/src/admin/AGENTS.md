# Frontend Source Admin Agent Instructions

## Owner

- `baldin_frontend`; use `baldin_design_lead` for Figma-first admin review.

## Scope

- Applies to React admin surfaces.

## Do

- Preserve auth/session expectations and admin route structure.
- Handle permission, loading, empty, and error states.

## Do Not

- Do not bypass backend authorization assumptions.
- Do not change backend APIs from this scope.

## Validation

- Use targeted admin component or route checks when requested.
- Use browser harness admin session for capture-oriented validation.

## Handback Notes

- Name affected admin screens and auth assumptions.
