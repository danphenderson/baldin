# Backend Public Fixtures Agent Instructions

## Owner

- `baldin_backend`.

## Scope

- Applies to tracked backend public fixtures and public test assets.

## Do

- Allow tracked fixtures such as seeds and existing tracked upload fixtures.
- Keep fixture paths deterministic and reviewable.

## Do Not

- Do not edit runtime DB, log, var, datalake, or transient upload output directories.
- Do not commit local runtime artifacts.

## Validation

- Use fixture-specific checks when requested.
- Confirm no runtime artifact directories were intentionally touched.

## Handback Notes

- State fixture purpose and runtime-artifact status.
