# CDK Tests Agent Instructions

## Owner

- `baldin_full_stack_architect`.

## Scope

- Applies to infrastructure tests.

## Do

- Keep tests focused on intended resource shape and safety properties.
- Use deterministic assertions.

## Do Not

- Do not snapshot noisy generated output without a reason.
- Do not require live cloud access for unit-style tests.

## Validation

- Run targeted CDK tests when requested.
- Report fixture or snapshot changes.

## Handback Notes

- State whether deployment behavior is expected to change.
