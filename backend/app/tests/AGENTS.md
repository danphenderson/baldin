# Backend App Tests Agent Instructions

## Owner

- `baldin_backend`.

## Scope

- Applies to backend app test files and fixtures.

## Do

- Prefer the narrowest useful pytest scope.
- Use `127.0.0.1:5431` from the host and `test_db` inside Compose.
- Run backend tests through `./scripts/run_backend_pytest.sh` by default. For host-only loops, use `cd backend && pipenv run pytest ...` or the host wrapper.

## Do Not

- Do not broaden fixtures in ways that hide regressions.
- Do not require live external services for deterministic tests.

## Validation

- Run targeted pytest scopes when requested through the repo wrapper or `pipenv run pytest`, not bare `pytest`.
- Escalate to broader scopes only when the changed surface warrants it.

## Handback Notes

- Report exact test scope and DB-host assumption.
