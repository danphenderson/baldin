# Backend Core Agent Instructions

## Owner

- `baldin_backend`.

## Scope

- Applies to backend core services and shared domain logic.

## Do

- Keep service boundaries testable and independent from HTTP plumbing where possible.
- Surface behavior changes to route/schema owners when API output changes.

## Do Not

- Do not bury database migrations or API changes in core-only edits.
- Do not introduce mature-SaaS abstractions without explicit scope.

## Validation

- Prefer unit or focused integration tests for changed logic.
- Escalate to route tests when HTTP behavior changes.

## Handback Notes

- Call out downstream route or ETL impacts.
