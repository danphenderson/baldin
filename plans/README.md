# Baldin Plan Sources

Use this directory for tracked plan, spike, and epic documents that feed Baldin's planning prompts.

## Active Files

- [v2.1/implementation-brief-template.md](./v2.1/implementation-brief-template.md) — Required entry brief for every active `v2.1` implementation slice.
- [v2.1/wave-01-design-system-foundation.md](./v2.1/wave-01-design-system-foundation.md) — Shared-foundation and baseline-recovery packet.
- [v2.1/wave-02-legacy-shell-migration.md](./v2.1/wave-02-legacy-shell-migration.md) — Raw shell migration packet for `Alert`, `Dialog`, and wrapper cleanup.
- [v2.1/wave-03-flagship-route-slices.md](./v2.1/wave-03-flagship-route-slices.md) — Default route-family order for the first product-app slices.
- [flagship-aspirations-to-apply.md](./flagship-aspirations-to-apply.md) — Historical roadmap from the pre-`v2.1` flagship planning path.
- [redesign/implementation-brief-template.md](./redesign/implementation-brief-template.md) — Historical redesign brief from the archived Figma-gated program.

## Usage Notes

- Prefer plan files in this directory for repo-scoped planning work that needs a durable markdown source.
- When prompts ask for the active implementation plan sources, start from `docs/docs/reference/operator-design-forward-path.md`, then use the relevant `plans/v2.1/*` packet or brief and `operator-design/` when the task needs forward reference layouts or states.
- Treat `plans/redesign/*` as archival reference only unless a task explicitly asks for historical redesign context.
- Keep plan documents focused on phased execution, explicit dependencies, and observable acceptance criteria.
