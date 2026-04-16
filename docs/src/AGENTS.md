# Docs Source Components Agent Instructions

## Owner

- `baldin_full_stack_architect`.

## Scope

- Applies to Docusaurus source components and styling.

## Do

- Keep docs UI changes isolated from product frontend patterns unless intentionally shared.
- Preserve accessibility and static-site build behavior.

## Do Not

- Do not patch `docs/build`.
- Do not introduce runtime app dependencies into docs.

## Validation

- Use docs build when requested or when source changes warrant it.
- Use targeted checks for docs UI behavior.

## Handback Notes

- Report docs build impact.
