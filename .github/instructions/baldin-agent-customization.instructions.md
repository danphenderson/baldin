---
description: "Use when modifying Baldin Copilot instructions, prompts, agents, skills, or Copilot workflow docs. Covers layering, least-privilege tooling, discovery quality, and drift resistance."
name: "Baldin Agentic Configuration Rules"
applyTo: .github/agents/*.agent.md, .github/prompts/*.prompt.md, .github/instructions/*.instructions.md, .github/skills/*/SKILL.md, docs/docs/engineering/copilot-*.md
---
# Baldin Agentic Configuration Rules

- Treat Baldin's Copilot setup as operational infrastructure. Prefer the smallest durable change over persona polish or workflow sprawl.
- Optimize Baldin Copilot assets for fast local work on the `docker-compose.yml` stack. Keep the default workflow compose-first, local-first, and easy to discover in under a minute.
- Keep layers explicit:
  - `.github/copilot-instructions.md` = always-on repo baseline
  - `.github/instructions/*.instructions.md` = scoped rules
  - `.github/prompts/*.prompt.md` = single focused workflow entry points
  - `.github/agents/*.agent.md` = specialist owners or orchestrators
  - `.github/skills/*/SKILL.md` = repeatable multi-step workflows
- Do not duplicate the same repo posture, standard handback, or validation rules across every file when a higher layer or linked doc already owns that guidance.
- Prefer links to repo docs such as `docs/docs/engineering/copilot-prompt-cookbook.md`, `docs/docs/engineering/testing.md`, and `docs/docs/engineering/contract-management.md` instead of re-embedding long policy blocks.
- When prompts, agents, or Copilot workflow docs describe execution flow, bias toward inspect -> patch -> smoke-check loops and separate edit-time smoke checks from broader pre-push gates.
- Favor direct backend, frontend, or full-stack execution prompts when ownership is already obvious. Do not route small local fixes through extra planning or multi-agent coordination by default.
- Keep `docs/docs/engineering/local-development.md`, `docs/docs/engineering/testing.md`, and `docs/docs/engineering/contract-management.md` aligned with prompt and agent defaults so local commands, recovery paths, and contract regeneration behavior do not drift.
- When documenting contract regeneration, mention the staged-file gate on `./scripts/update_frontend_schemas.sh`, the `SCHEMA_UPDATE_FORCE=1` local-iteration path, and the need to confirm whether generated artifacts actually changed.
- Use keyword-rich descriptions that say "Use when..." and include the actual trigger phrases a user or parent agent would search for.
- Favor fewer, stronger prompts. If a prompt is routing, validation, review, or synthesis, keep it single-purpose and stop when ownership should change.
- Favor fewer, stronger agents. Only create a new agent if the existing Backend, Frontend, Lead Full-Stack Architect, and Project Manager split cannot own the work cleanly.
- Use least-privilege tools. Include only the aliases or specific tools the agent truly needs. If an agent declares `agents:`, include the `agent` tool alias.
- Keep prompts, agents, skills, and docs aligned. When you materially change the operating model, update `docs/docs/engineering/copilot-prompt-cookbook.md` and `docs/docs/engineering/copilot-prompt-examples.md` or explain why no doc change is needed.
- Do not preserve weak personas, duplicate instructions, or generic enterprise language just because it already exists.
