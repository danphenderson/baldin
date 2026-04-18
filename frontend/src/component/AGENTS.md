# Frontend Components Agent Instructions

## Owner

- `baldin_frontend`.

## Scope

- Applies to reusable React components outside the design-system package.

## Do

- Favor accessible, composable MUI-based components.
- Keep props typed and service data normalized before presentation.

## Do Not

- Do not create duplicate design-system primitives here.
- Do not import Tailwind/shadcn conventions.

## Validation

- Use focused component tests when behavior changes.
- Escalate to design-system owner if a primitive should be promoted.

## Handback Notes

- Report reusable component API changes.
