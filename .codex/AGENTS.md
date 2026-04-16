# Codex Configuration Agent Instructions

## Owner

- `baldin_project_manager` for ownership model changes; `baldin_full_stack_architect` for execution config.

## Scope

- Applies to Codex project configuration and local Codex support files.

## Do

- Keep Codex setup aligned with root/scoped `AGENTS.md` and the five-agent owner model.
- Prefer narrow custom agents over broad duplicated prompt catalogs.

## Do Not

- Do not force one-to-one Codex clones of Copilot prompts.
- Do not configure unsupported repo-owned MCP mirrors such as `webdev`.

## Validation

- Run the agentic validator when requested after config changes.
- Check TOML parseability for custom agent edits.

## Handback Notes

- Report Codex behavior or sandbox changes.
