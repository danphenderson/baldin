# Backend Core RAG Agent Instructions

## Owner

- `baldin_backend`.

## Scope

- Applies to retrieval, ranking, embedding, and RAG orchestration logic.

## Do

- Keep retrieval behavior locally reproducible.
- Guard external model calls behind existing configuration and test doubles.

## Do Not

- Do not introduce new vector infrastructure or cloud services without explicit scope.
- Do not require live network calls for routine validation.

## Validation

- Prefer focused RAG/core tests with fixtures or mocks.
- Document any changed ranking or prompt assumptions.

## Handback Notes

- Call out data, embedding, or retrieval compatibility risks.
