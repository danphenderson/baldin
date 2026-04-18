# Backend API Routes Agent Instructions

## Owner

- `baldin_backend`.

## Scope

- Applies to concrete FastAPI route handlers.

## Do

- Validate auth, status codes, pagination, errors, and response models.
- Keep route tests close to changed behavior.

## Do Not

- Do not change response shapes silently.
- Do not mix unrelated route cleanups into feature patches.

## Validation

- Run the narrowest useful route test when validation is requested.
- Trigger schema regeneration for API contract changes.

## Handback Notes

- List changed endpoints and generated-artifact status.
