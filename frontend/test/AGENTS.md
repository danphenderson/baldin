# Frontend Tests Agent Instructions

## Owner

- `baldin_frontend`.

## Scope

- Applies to frontend test utilities, fixtures, and test setup.

## Do

- Keep fixtures representative and minimal.
- Prefer behavior-focused assertions over brittle implementation detail checks.

## Do Not

- Do not hide accessibility or state regressions with shallow snapshots.
- Do not require external services for deterministic tests.

## Validation

- Run the smallest relevant frontend test when requested.
- Use typecheck/build only when the changed surface warrants it.

## Handback Notes

- Report exact test scope and fixture changes.
