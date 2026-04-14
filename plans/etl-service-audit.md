## Decision: Implement ETL Service for Crawler Execution

Audit the following system design doc and highlight any concerns that you may have shipping it to production.

```md
# Reverse-Proxy Backend ETL Service

## Summary
- Introduce a new internal-only `etl-service` container, built from the existing backend image, as the main crawler execution boundary.
- Keep `web` responsible for `CrawlerPipeline` and `CrawlerRun` creation, scheduler leadership, `OrchestrationEvent`, lead dedupe/create, and review-state transitions.
- Keep `crawler-worker` as the Redis consumer, but reduce it to a thin dispatcher that loads the run context, calls `etl-service`, and applies returned normalized results.
- Leave user-triggered `/extractors/*` on the current inline path. This slice changes crawler execution only.

## Key Changes
- `docker-compose.yml`: add `etl-service` on the internal Compose network with no public port, using the same env baseline and a healthcheck.
- Add a small internal app surface under the backend codebase for ETL execution. It owns Playwright lifecycle, reverse-proxy transport, crawler adapters, retries, output validation, and normalized result serialization.
- Refactor the crawler execution path in `backend/app/crawler_worker.py` and `backend/app/api/deps.py` so in-process adapter execution becomes one internal HTTP call to `etl-service`.
- Keep `CrawlerRun`, `CrawlerPipeline`, and `OrchestrationEvent` as the system of record. Do not add a raw staging table in v1.
- Update local-development and system-overview docs to show the new service boundary and runtime responsibilities.

## API / Interface Changes
- No public frontend-facing API or OpenAPI change in v1. `openapi.json` and `frontend/src/schema.d.ts` should remain unchanged unless a user-facing route is intentionally added.
- Add one internal-only ETL endpoint, e.g. `POST /internal/crawl-runs/execute`, consumed only by `crawler-worker`.
- Request fields: `run_id`, `source`, `query_definition`, `execution_policy`, and optional schedule/correlation metadata.
- Response fields: `terminal_status`, `results[]`, `stats`, `error_summary`, and `warnings[]`.
- `results[]` reuse the existing normalized crawler shape: `url`, `title`, `description`, `location`, `salary`, `job_function`, `employment_type`, `seniority_level`, `education_level`, `company_name`.
- Keep proxy configuration inside `execution_policy` for v1 instead of adding a new DB column. Default shape: `proxy: { mode: "managed" | "direct", upstream_base_url?: str, auth_header_env?: str }`.
- Default local-dev behavior is `direct` mode when proxy credentials are absent, but the service boundary is always exercised.

## Test Plan
- Unit: ETL service request/response validation, proxy transport selection, crawler adapter normalization, retry behavior, and terminal-status mapping.
- Backend unit: `crawler-worker` delegation success/failure, timeout/error propagation from `etl-service`, and unchanged enqueue/fallback behavior.
- Backend integration: manual run, scheduled run, cancelled run, paused/resumed run, failed run, and `requires_approval -> pending_review`.
- Compose smoke: `web`, `crawler-worker`, `etl-service`, and `redis` boot together; a triggered crawler run reaches `etl-service`, returns normalized results, and persists leads/events correctly.
- Regression: existing extractor route tests stay green to prove `/extractors/*` remained out of scope.

## Assumptions
- Chosen defaults: `New ETL entry`, `Separate container`, `Keep review path`, `Worker delegates`, and `Normalized results`.
- `crawler-worker` stays in v1 because it already owns Redis consumption and keeps the new service isolated from database writes.
- Scheduler stays in `web`; the ETL service does not create runs or own scheduling.
- The ETL service is internal-only on the Compose network and is not exposed as a public Baldin API surface.
- Generated frontend artifacts are intentionally unchanged for this slice unless implementation expands into a public API addition.
```


## Indpendent Audit of the ETL Service Design
Overall, the direction is sound: pulling Playwright/proxy execution out of the component that owns writes is the right architectural move. But I would not ship this unchanged. The biggest concerns I see are these.
	1.	The isolation boundary is weaker than the doc implies.
etl-service is built from the existing backend image and uses the same env baseline. In practice that usually means it inherits DB credentials, app secrets, Redis access, and other privileges it does not need. If a browser exploit, malicious page, or SSRF lands in ETL, the blast radius is still basically “the backend.”
This is even more important because /extractors/* stays on the inline path. So the privileged web service still executes crawler logic for at least one path. That makes the new boundary only partial.
	2.	“Internal-only on the Compose network” is not a production security control.
No public port and an internal Docker network are fine for local topology, but they are not enough for a production trust boundary. I do not see service-to-service authentication, ingress denial, or network policy in the design.
I would want explicit auth on POST /internal/crawl-runs/execute, and I would want that route excluded from public docs and impossible to reach from normal ingress even if routing is misconfigured.
	3.	execution_policy is too permissive and creates security footguns.
Letting the request carry proxy.upstream_base_url and especially auth_header_env is risky. A runtime payload should not be able to choose arbitrary upstream URLs or choose which environment variable the service reads. Combined with “same env baseline,” that is a serious secret-selection and SSRF problem.
I would replace this with an allowlisted proxy_profile_id resolved inside ETL. Also, direct mode should fail closed in production rather than silently falling back if credentials are absent.
	4.	A synchronous HTTP execute call is brittle for long-running crawls.
Redis consumers are typically at-least-once. If the worker calls ETL, the crawl runs for minutes, and the worker times out or crashes, you now have ambiguity: ETL may still be running, may have finished, or may have never started. That ambiguity causes duplicate execution on retry unless you define idempotency very carefully.
I do not see attempt_id, execution leases, heartbeats, or duplicate suppression in the doc. Without them, shipping this to production will create duplicate crawls and inconsistent run state under normal failure modes.
	5.	terminal_status is the wrong thing for ETL to return.
ETL can report its own execution outcome. It cannot truthfully declare the final terminal state of the run, because persistence, dedupe, event creation, and review-state transitions happen afterward in the worker/web path.
Example: ETL returns terminal_status: succeeded, but the worker dies halfway through applying results. The run did not actually succeed. I would split this into execution_outcome from ETL and final CrawlerRun state owned by the write/orchestration path.
	6.	There is no durable handoff between “crawl finished” and “results applied.”
“No raw staging table in v1” is not itself the problem. The problem is the absence of any durable intermediate artifact. If ETL finishes and the HTTP response is dropped, or the worker dies before applying, the work is lost and must be redone.
This is exactly where a staging store, object-storage artifact, or compressed normalized blob helps. You do not necessarily need a table, but you do need a recoverable handoff.
	7.	Returning full results[] inline will become a scaling issue fast.
A single large JSON response couples crawl size to memory pressure, request timeouts, serialization cost, and retry pain. It also means there is no notion of partial progress.
For small runs this is fine, but production crawls tend not to stay small. I would want hard limits on result count and payload size, and a path to batched apply or artifact references instead of always returning the full normalized payload inline.
	8.	Cancellation, pause, and resume are listed in tests but not really designed.
The doc says these flows will be tested, but the interface shown is still a single execute request that returns terminal output. That is not enough to make mid-flight cancellation robust.
To make cancel/pause/resume correct, ETL needs a deadline or cancel token, periodic cooperative checks during execution, and the worker needs a final compare-and-swap style guard before persisting so cancelled runs do not commit after completion.
	9.	State ownership is still spread across too many places.
web owns scheduler leadership, dedupe/create, events, and review transitions. crawler-worker loads context and applies results. ETL owns retries, validation, proxy transport, and execution. That is three different actors making decisions about one run.
This is workable only if the state machine is explicit and the apply path is strongly idempotent. The doc does not spell that out. Without versioned state transitions and transactional apply semantics, race conditions around cancel/retry/review are very likely.
	10.	Retry policy is underspecified and likely duplicated across layers.
The ETL service “owns retries,” but in production the worker, HTTP client, Redis delivery, and scheduler often retry too. If all of them retry independently, one transient proxy failure turns into a storm of duplicate work.
error_summary as a free-form string is also too weak for policy. I would want machine-readable error classes such as retriable, permanent, validation_failed, auth_failed, rate_limited, cancelled, and deadline_exceeded.
	11.	Observability is too thin for a Playwright + proxy service.
Healthchecks and a returned stats object are not enough to operate this in production. You need correlation IDs, attempt IDs, queue latency, browser launch time, navigation/proxy failure rates, per-source success metrics, memory/CPU telemetry, and traces across web -> worker -> etl-service.
Without that, most incidents will collapse into “timeout” or “unknown ETL error,” which is brutal to debug in crawler systems.
	12.	The contract is not versioned, and there is a dual source-of-truth problem.
The request carries run_id and also carries mutable execution inputs like source, query_definition, and execution_policy. That creates room for mismatch: which one is authoritative if they disagree?
I would either treat the request as a fully immutable execution snapshot, or make ETL resolve everything from the run record. Also add an internal schema version so mixed-version worker/ETL deploys do not break each other.
	13.	The scraped fields are untrusted input and need explicit hygiene rules.
title, description, company_name, and the rest come from arbitrary pages. They can include HTML, scripts, malformed Unicode, huge strings, and odd encodings.
“Output validation” is good, but for production I would want field length caps, normalization rules, sanitization/escaping requirements, and a clear statement that these values are unsafe until rendered safely.
	14.	The production deployment story is underdeveloped.
The doc is very Compose-centric: add a service, add a healthcheck, internal network, boot all containers together. That is enough for local smoke testing, not enough for production readiness.
I would want explicit answers for resource limits, concurrency caps, autoscaling behavior, rollout order, rollback safety, and what happens when browser processes start OOM-killing the host.
	15.	The test plan misses some of the failures that matter most.
The current plan is good on happy-path orchestration coverage, but I would not ship without tests for: worker crash after ETL success but before apply, HTTP timeout while ETL continues running, duplicate delivery of the same run, cancel arriving mid-crawl, oversized result payloads, proxy auth failure, and mixed-version worker/ETL deploys.

The short version of my pre-ship bar would be this: make ETL truly least-privileged, replace free-form proxy config with allowlisted profiles, add idempotent attempt semantics plus cancellation/heartbeat behavior, introduce a durable ETL output handoff, and tighten observability and load testing. Until those are in place, this feels production-fragile even though the high-level direction is good.
