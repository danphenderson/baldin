# Frontend Routes Agent Instructions

## Owner

- `baldin_frontend`.

## Scope

- Applies to frontend routing, route guards, and navigation wiring.

## Do

- Keep auth, redirects, params, and not-found behavior explicit.
- Preserve deep-link and browser navigation behavior.

## Do Not

- Do not change backend route contracts from frontend routing work.
- Do not make broad IA changes without scope.

## Validation

- Use targeted route tests or smoke checks when requested.
- Escalate to backend if route data is missing or inconsistent.

## Handback Notes

- Report changed paths, guards, and redirects.
