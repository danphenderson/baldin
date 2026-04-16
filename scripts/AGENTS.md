# Scripts Agent Instructions

## Owner

- `baldin_full_stack_architect`.

## Scope

- Applies to repo automation, validators, schema tooling, and local maintenance scripts.

## Do

- Keep scripts deterministic and safe for local worktrees.
- Preserve compatibility wrappers when migration plans require them.
- Prefer clear diagnostics over implicit behavior.

## Do Not

- Do not make scripts depend on untracked local secrets unless explicitly documented.
- Do not hand-edit generated artifacts that scripts own.

## Validation

- Run targeted script checks when requested.
- Report whether generated artifacts changed, were unchanged, or were deferred.

## Handback Notes

- List script entry points and compatibility impact.
