# Codex Custom Agents Agent Instructions

## Owner

- `baldin_project_manager` for owner boundaries; implementation-specific owners for agent instructions.

## Scope

- Applies to `.codex/agents/*.toml` custom agents.

## Do

- Keep the five-agent owner model intact.
- Use concise, task-specific developer instructions and appropriate sandboxes.

## Do Not

- Do not create prompt-file mirrors for every Copilot workflow.
- Do not broaden agent permissions without a concrete need.

## Validation

- Use the agentic validator when requested.
- Check TOML parseability and unique agent names.

## Handback Notes

- List changed agent names and ownership impact.
