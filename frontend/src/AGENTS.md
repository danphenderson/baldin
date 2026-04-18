# Frontend Source Agent Instructions

## Owner

- `baldin_frontend`.

## Scope

- Applies to React source code under `frontend/src`.

## Do

- Use MUI and existing Baldin patterns.
- Consume backend data through typed services and generated schema types.
- Design loading, empty, and error states explicitly.

## Do Not

- Do not edit `frontend/src/schema.d.ts` by hand.
- Do not add broad state-management or theme rewrites without explicit scope.

## Validation

- Prefer focused frontend tests for changed behavior.
- Use typecheck/build when shared typed surfaces or production behavior warrants it.

## Handback Notes

- Report affected routes, services, and user-visible states.
