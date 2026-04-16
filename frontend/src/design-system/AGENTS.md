# Frontend Design System Agent Instructions

## Owner

- `baldin_design_lead` for Figma-first and mapping work; `baldin_frontend` for implementation fixes.

## Scope

- Applies to Baldin design-system source, stories, and `.figma.ts` metadata.

## Do

- Preserve Baldin’s MUI-based design system as canonical.
- Keep `frontend/figma.config.json` and `.figma.ts` metadata optional future-proofing.
- Use Baldin tokens, primitives, and patterns for any salvaged Figma Make ideas.

## Do Not

- Do not port Tailwind token names, `cva` contracts, shadcn APIs, or Figma Make scaffolding directly.
- Do not require Code Connect publish for routine delivery.

## Validation

- Use Storybook or targeted frontend checks when requested.
- Use Figma MCP or browser harness inspection for Figma-first work when available.

## Handback Notes

- Call out component promotion, Figma mapping, and optional metadata status.
