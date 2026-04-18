# GitHub Copilot Instructions Agent Instructions

## Owner

- `baldin_project_manager`.

## Scope

- Applies to Copilot `.instructions.md` files.

## Do

- Keep Copilot instructions compatible with root/scoped `AGENTS.md`.
- Use `applyTo` globs that match real files.

## Do Not

- Do not tell Copilot to load every scoped `AGENTS.md` globally.
- Do not duplicate long repo policy already owned by root.

## Validation

- Run the agentic validator when requested.
- Check `applyTo` coverage.

## Handback Notes

- Report instruction scope and conflict checks.
