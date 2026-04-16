# Frontend Storybook Agent Instructions

## Owner

- `baldin_design_lead` for design-system linkage; `baldin_frontend` for Storybook runtime fixes.

## Scope

- Applies to Storybook configuration.

## Do

- Keep stories aligned with MUI design-system primitives.
- Support optional Figma metadata without making Code Connect publish mandatory.

## Do Not

- Do not introduce Tailwind/shadcn wrapper APIs as canonical components.
- Do not break app builds for story-only convenience.

## Validation

- Run Storybook build only when requested or when config changes warrant it.
- Escalate to frontend typecheck if shared React code changes.

## Handback Notes

- Note any design-system or Figma mapping implications.
