# Backend App Agent Instructions

## Owner

- `baldin_backend`.

## Scope

- Applies to the FastAPI application package and runtime backend modules.

## Do

- Keep route, schema, service, and model changes aligned.
- Prefer targeted tests near the behavior being changed.

## Do Not

- Do not hide API response-shape changes inside service-only edits.
- Do not patch generated contracts by hand.

## Validation

- Use focused backend tests for touched runtime behavior.
- Run schema regeneration only when API contracts changed.

## Handback Notes

- Name the affected routes, models, or services.
