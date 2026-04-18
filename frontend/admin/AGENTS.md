# Frontend Admin Agent Instructions

## Owner

- `baldin_frontend`; use `baldin_design_lead` for admin capture or Figma handoff.

## Scope

- Applies to frontend admin entry points outside `src`.

## Do

- Keep admin flows aligned with existing auth/session assumptions.
- Use browser harness admin session patterns for privileged review.

## Do Not

- Do not bypass local superuser token setup in harness-driven work.
- Do not change backend admin contracts from this scope.

## Validation

- Use targeted admin UI checks when requested.
- Escalate if backend auth or route behavior is the blocker.

## Handback Notes

- Call out admin-session setup and affected screens.
