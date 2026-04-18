# Frontend E2E Agent Instructions

## Owner

- `baldin_frontend`.

## Scope

- Applies to frontend end-to-end tests.

## Do

- Keep tests focused on user-visible flows and stable selectors.
- Use local Compose assumptions unless a task says otherwise.

## Do Not

- Do not paper over product bugs with brittle waits.
- Do not require external services for ordinary e2e runs.

## Validation

- Run the narrowest relevant e2e test when requested.
- Capture failure route and state when blocked.

## Handback Notes

- Report browser/runtime assumptions and exact test scope.
