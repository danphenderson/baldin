# Backend Core Extractor Agent Instructions

## Owner

- `baldin_backend`.

## Scope

- Applies to core extraction logic and document-processing helpers.

## Do

- Preserve deterministic extraction behavior and fixture compatibility.
- Keep external-service assumptions injectable or mocked in tests.

## Do Not

- Do not require real API keys for local tests unless explicitly requested.
- Do not rewrite unrelated ETL stages.

## Validation

- Use focused extractor tests or fixtures when validation is requested.
- Note any fixture updates.

## Handback Notes

- Report changed extraction inputs, outputs, and fallback behavior.
