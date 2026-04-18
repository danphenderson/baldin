---
sidebar_position: 10
slug: /engineering/openapi-fetch-evaluation
title: "Evaluation: openapi-fetch as Typed API Client"
description: Trade-off analysis and migration plan for adopting openapi-fetch across the frontend service layer.
---

<!-- last-verified: 2026-04-12 -->

# Evaluation: openapi-fetch as Typed API Client

## Context

The Baldin frontend service layer (`frontend/src/service/*.tsx`) makes API calls
using the native Fetch API with hand-rolled helpers for URL construction,
header injection, request body serialization, and error parsing.  Type safety
relies on manually annotating each function's return type with types imported
from the generated `schema.d.ts`.

The `openapi-fetch` library (companion to the `openapi-typescript` code-gen
already in the repo) generates fully typed `GET`, `POST`, `PATCH`, `DELETE`
methods keyed on the path strings defined in the OpenAPI spec.  This evaluation
prototyped the migration of the **leads service** — the largest service file
with custom error classes, pagination, nested path parameters, and query-string
operations — to measure the impact.

Reference: [openapi-ts.dev/openapi-fetch](https://openapi-ts.dev/openapi-fetch/)

## Prototype Scope

| Item | Before | After |
| --- | --- | --- |
| File | `frontend/src/service/leads.tsx` | same file, rewritten |
| New module | — | `frontend/src/service/api-client.ts` |
| Package added | — | `openapi-fetch@0.17.0` (~7 kB gzip) |
| Deleted helpers | `buildRequest`, `fetchAPI`, `buildLeadListQuery`, `parseError` | replaced by `createApiClient` + `unwrap` |
| Exported API surface | 14 functions + 17 type aliases + `LeadServiceError` class | **unchanged** |
| Test changes | URL/options assertions | switched to `Request`-object assertions |

The shared `api-client.ts` provides a `createApiClient(token?)` factory that
returns a typed `openapi-fetch` client with the base URL already set and an
optional auth middleware.

## Trade-offs

### Advantages

| # | Benefit | Detail |
| --- | --- | --- |
| 1 | **Path-level type safety** | `client.GET('/leads/{id}', { params: { path: { id } } })` is type-checked against `paths["/leads/{id}"]["get"]`.  Typos in the path string, missing path/query params, or wrong body shapes are compile-time errors. |
| 2 | **Response types are inferred** | Return types are derived from the schema automatically — no manual `Promise<LeadDetailRead>` annotation required on internal calls. |
| 3 | **Eliminated boilerplate** | `buildRequest`, `buildLeadListQuery`, and `fetchAPI` (60+ lines) were replaced by the library's built-in serialization and request construction.  The service shrank from 238 lines to 185 lines despite keeping all custom error logic. |
| 4 | **Native Fetch under the hood** | `openapi-fetch` wraps the native `fetch` API with zero runtime dependencies.  No bundle-size surprise — the library is ~7 kB gzipped. |
| 5 | **Middleware model** | Auth headers are injected through a first-class middleware hook rather than per-function boilerplate.  Logging, retry, or metrics middleware can be added in one place. |
| 6 | **Schema-driven evolution** | When backend routes change, `scripts/update_frontend_schemas.sh` regenerates `schema.d.ts` and the compiler immediately flags any service call whose path or params no longer match.  Today, mismatches are only caught at runtime. |

### Disadvantages / Risks

| # | Concern | Mitigation |
| --- | --- | --- |
| 1 | **Test pattern change** | `openapi-fetch` calls `fetch(Request)` rather than `fetch(url, options)`.  Every test that asserts on `fetch` call args must inspect the `Request` object instead.  This is a one-time effort per service and makes tests closer to real browser semantics. |
| 2 | **New dependency** | Adds one production dependency.  The package is maintained by the same team behind `openapi-typescript` and follows the same release cadence, reducing supply-chain risk. |
| 3 | **Custom error handling is still manual** | `openapi-fetch` returns `{ data, error, response }` but does not throw; the service must still unwrap and throw domain errors (like `LeadServiceError`).  This is intentional — the library does not impose an error strategy. |
| 4 | **Per-call client instantiation** | The prototype creates a new client on every call because the auth token is passed per-function.  This is cheap (no network or state) but could be optimized later by caching the client per token or using a React context. |
| 5 | **File uploads and blob downloads** | Services with `FormData` uploads (`documents.tsx`, `users.tsx`) or binary blob downloads cannot use the typed client directly and will need a thin escape hatch.  `openapi-fetch` supports `parseAs: 'blob'` and raw `body` overrides for these cases. |

## Migration Plan

Migration is **incremental and non-breaking**: each service can be migrated in
isolation because every file re-exports the same public API.

### Phase 1 — Foundation (complete)

- [x] Install `openapi-fetch`
- [x] Create `api-client.ts` shared module
- [x] Migrate `leads.tsx` as proof-of-concept
- [x] Update tests, verify TypeScript and all 23 tests pass

### Phase 2 — Simple CRUD services (mostly complete)

19 of 23 service files now use `createApiClient`. The remaining four are:

| Service | Reason pending |
| --- | --- |
| `auth.tsx` | Uses `application/x-www-form-urlencoded`; needs custom `bodySerializer` (Phase 4) |
| `connections.tsx` | Not yet migrated |
| `directory.tsx` | Not yet migrated |
| `messages.tsx` | Not yet migrated |

### Phase 3 — Upload / download services (complete)

Services with `FormData` or blob handling have been migrated using `openapi-fetch`'s
`parseAs: 'blob'` and raw body overrides.

| Service | Special handling |
| --- | --- |
| `documents.tsx` | file upload, PDF download, blob download |
| `users.tsx` | multi-source profile extraction with FormData |

### Phase 4 — Auth service (pending)

`auth.tsx` uses `application/x-www-form-urlencoded` for the OAuth2 login
endpoint.  This requires a custom `bodySerializer` in the client options.
Planned as the final migration because the auth flow is the most sensitive.

### Phase 5 — Cleanup

- Remove per-service `fetchAPI` / `buildRequest` / `createRequestOptions`
  helpers once all services are migrated.
- Consider moving `createApiClient` into a React context so the token does not
  need to be threaded through every call.
- Evaluate whether the middleware model can absorb cross-cutting concerns like
  retry logic or request logging.

## Recommendation

Adopt `openapi-fetch` as the standard API client for the Baldin frontend.  The
leads migration demonstrates that:

1. The library integrates cleanly with the existing `openapi-typescript`
   pipeline and generated `schema.d.ts`.
2. It eliminates a class of runtime bugs (wrong URL, missing param, wrong body
   shape) by shifting them to compile time.
3. The migration is incremental — each service can be converted independently
   without touching callers.
4. Bundle cost is minimal (~7 kB gzip) and there are no transitive runtime
   dependencies.

Proceed with the remaining four services (`connections.tsx`, `directory.tsx`,
`messages.tsx`, and `auth.tsx`) to complete the migration.
