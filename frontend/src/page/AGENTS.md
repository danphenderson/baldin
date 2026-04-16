# Frontend Pages Agent Instructions

## Owner

- `baldin_frontend`.

## Scope

- Applies to page-level React surfaces.

## Do

- Keep page behavior tied to typed services and existing routes.
- Handle loading, error, empty, and permission states.

## Do Not

- Do not put reusable primitives here when they belong in components or design system.
- Do not invent backend fields absent from generated types.

## Validation

- Use targeted page tests or manual route checks when requested.
- Typecheck when page data contracts change.

## Handback Notes

- List affected pages and state coverage.
