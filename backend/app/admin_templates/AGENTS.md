# Backend Admin Templates Agent Instructions

## Owner

- `baldin_backend` with design review from `baldin_design_lead` only for Figma-backed admin capture.

## Scope

- Applies to server-rendered admin templates.

## Do

- Preserve admin auth assumptions and backend-rendered data contracts.
- Keep template changes compatible with existing FastAPI/admin routes.

## Do Not

- Do not convert admin templates into frontend app surfaces.
- Do not introduce unsupported Tailwind or shadcn scaffolding.

## Validation

- Smoke-check the relevant admin route or targeted backend test when requested.
- Use the admin browser harness path for privileged capture workflows.

## Handback Notes

- Identify any admin route or fixture assumptions.
