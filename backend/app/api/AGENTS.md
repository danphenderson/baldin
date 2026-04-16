# Backend API Agent Instructions

## Owner

- `baldin_backend`; use `baldin_full_stack_architect` for contract regeneration or frontend fallout.

## Scope

- Applies to API package structure, routers, schemas, and dependencies.

## Do

- Keep FastAPI routing, dependency injection, and OpenAPI output coherent.
- Treat response/request schema changes as contract changes.

## Do Not

- Do not edit generated frontend schema files directly.
- Do not leave route behavior untested when semantics change.

## Validation

- Prefer focused API route/schema tests.
- Regenerate contracts when routes or schemas change.

## Handback Notes

- Report endpoint paths and contract status.
