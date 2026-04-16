# Backend App Extractor Agent Instructions

## Owner

- `baldin_backend`.

## Scope

- Applies to backend app extraction modules outside core.

## Do

- Keep extraction pipeline contracts explicit.
- Reuse existing fixtures and local defaults.

## Do Not

- Do not duplicate core extractor logic without a reason.
- Do not change API-facing extraction outputs silently.

## Validation

- Use targeted extractor tests when available.
- Report fixture or schema effects.

## Handback Notes

- State whether outputs or side effects changed.
