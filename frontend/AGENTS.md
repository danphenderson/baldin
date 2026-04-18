# Frontend Agent Instructions

## Owner

- `baldin_frontend`; use `baldin_design_lead` for archived-design reference surfaces and `baldin_full_stack_architect` for contract ownership.

## Scope

- Applies to frontend app code, tests, scripts, and browser harness assets.

## Do

- Use React, Vite, MUI, and generated schema types consistently.
- Handle loading, error, and empty states intentionally.
- Preserve accessibility and responsive behavior.

## Do Not

- Do not hand-edit `frontend/src/schema.d.ts`.
- Do not import Tailwind/shadcn/Figma Make scaffolding as canonical design-system code.
- Do not redesign API contracts from frontend-only work.

## Validation

- Prefer the smallest relevant frontend test first.
- Use `./node_modules/.bin/tsc --noEmit` and `npm run build` when the changed surface warrants it.

## Handback Notes

- Report typed contract assumptions and user-facing behavior changes.
