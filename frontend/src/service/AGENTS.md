# Frontend Services Agent Instructions

## Owner

- `baldin_frontend`; use `baldin_full_stack_architect` when service changes reveal contract drift.

## Scope

- Applies to frontend API clients and service adapters.

## Do

- Consume generated schema types rather than duplicating API shapes.
- Keep error handling and response normalization explicit.

## Do Not

- Do not hand-edit `frontend/src/schema.d.ts`.
- Do not fake missing backend fields in service code.

## Validation

- Use targeted service tests or typecheck when requested.
- Trigger contract handoff if generated types are stale.

## Handback Notes

- Report endpoint assumptions and generated-type status.
