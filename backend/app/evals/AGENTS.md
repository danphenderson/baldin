# Backend Evals Agent Instructions

## Owner

- `baldin_backend`.

## Scope

- Applies to backend evaluation harnesses and eval fixtures.

## Do

- Keep evals reproducible with local fixtures.
- Separate eval-only changes from production route behavior.

## Do Not

- Do not require live paid services for routine validation.
- Do not treat eval output as a generated runtime contract.

## Validation

- Run only targeted eval checks when explicitly requested.
- Document skipped external dependencies.

## Handback Notes

- Summarize metric or fixture implications.
