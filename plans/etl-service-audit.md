I shared your responses with the auditor, here is the final report that he returned:

```md
Independent Audit of the ETL Service Design

Executive Summary

The proposed ETL split is directionally sound. Moving browser execution, proxy handling, adapter behavior, and normalization into a separate etl-service is a sensible step for Baldin, and keeping the backend as the system of record is the right instinct.

That said, this design is not ready to ship to production in its current form.

The main blockers are not cosmetic. They are structural: ETL is not yet genuinely least-privileged, the internal service boundary is not strongly authenticated, proxy configuration is overly permissive, the queue and execution model can lose work, there is no durable handoff between ETL completion and backend apply, cancellation and resume are only partial, and the internal contract is under-specified for mixed-version and failure-heavy production conditions.

This assessment reflects the corrected implementation details as provided:
	•	/extractors/* is a separate extraction surface, not the crawler path.
	•	Baldin currently uses a Redis RPUSH / BLPOP queue, not an ack-based at-least-once broker.
	•	Baldin already has some observability and test coverage; the issue is not absence, but insufficiency for production.

Overall conclusion: this is a reasonable local-first architecture step, but still production-fragile.

What the design gets right

The design does several things well.

It introduces a clearer execution boundary for Playwright and proxy activity. It preserves CrawlerRun, CrawlerPipeline, and OrchestrationEvent as backend-owned records. It keeps the public API stable. It also avoids over-expanding scope by not trying to redesign extractor routes, frontend schemas, and storage shape all at once.

Those are good constraints. The problem is that the current boundary is only partial and not yet durable enough for production reliability.

Findings

1. The least-privilege boundary is still too weak

Severity: High

etl-service is built from the existing backend image and loads the same repo-tracked environment baseline. In practice, that means ETL inherits credentials and configuration it does not need for browser execution: database access, Redis settings, app secrets, and other backend values.

If ETL is compromised through browser execution, malicious content, SSRF, or a library flaw, the blast radius remains much larger than it should be. The earlier claim that /extractors/* keeps crawler logic inline in web was too strong, but the higher-order concern remains valid: the ETL split is only partial, and the privileged web process is not fully isolated from adjacent extraction behavior.

Recommended action: run ETL with its own reduced image or reduced secret set, strip unnecessary credentials, isolate service accounts, restrict outbound network access, and treat browser execution as hostile by default.

2. “Internal-only on the Compose network” is not a production security boundary

Severity: High

No public host port and a Compose-local network are acceptable for local topology. They are not sufficient production controls. The ETL endpoint currently lacks service-to-service authentication, and the ETL app still exposes its own docs surface.

That means a routing mistake, reverse-proxy misconfiguration, or unintended ingress exposure could make an internal execution endpoint reachable without meaningful protection.

Recommended action: require explicit service authentication on POST /internal/crawl-runs/execute, disable or hide ETL docs in production, and make accidental public exposure difficult through deployment and network policy, not just convention.

3. execution_policy is too permissive

Severity: High

This is a real security concern in the current implementation. ETL accepts proxy.upstream_base_url and auth_header_env, dynamically reads the named environment variable, and routes outbound navigation through the selected upstream target.

One nuance matters: this is not an arbitrary public caller selecting secrets at request time. These values come from a persisted, superuser-managed crawler pipeline policy. That narrows the threat model, but it does not remove the risk. The design still creates an SSRF and secret-selection footgun.

Recommended action: replace free-form proxy config with an allowlisted proxy_profile_id resolved inside ETL. Keep direct mode for local development, but fail closed in production when required proxy configuration is absent.

4. The queue and execution model can lose work

Severity: High

The worker performs a blocking HTTP call to ETL with a fixed timeout, and the queue is a simple Redis RPUSH / BLPOP list. There are no attempt IDs, leases, heartbeats, or duplicate-suppression semantics.

The most immediate risk is not broker redelivery. It is worse in a different way: the worker can pop work, crash, and the job can simply disappear. If ETL finishes but the response is lost or the worker dies before apply completes, the system has no durable way to determine what happened.

Recommended action: introduce explicit attempt semantics, job leasing or visibility semantics, heartbeats, and idempotent apply behavior. Whether that is done with a stronger queue pattern or a different broker is less important than making execution recoverable.

5. terminal_status is the wrong responsibility for ETL

Severity: Medium-High

ETL can accurately report its own execution outcome. It cannot accurately declare the final state of the run, because the backend still owns persistence, dedupe, orchestration events, review transitions, and final run status.

In Baldin today, ETL returns terminal_status, but the backend still decides whether the run ends as success, failed, pending_review, cancelled, or paused. That is a responsibility mismatch.

Recommended action: rename and narrow this field to something like execution_outcome, and keep final run-state ownership entirely in the backend.

6. There is no durable handoff between ETL completion and backend apply

Severity: Critical

This is one of the strongest reasons not to ship the design unchanged. ETL returns normalized results inline over HTTP and the worker immediately applies them. There is no staging artifact, no durable blob, and no recoverable handoff.

If ETL succeeds and the response is dropped, or if the worker crashes after ETL succeeds but before persistence finishes, the work is lost and must be rerun. A database table is not the only possible solution, but some durable intermediate boundary is needed.

Recommended action: persist ETL output as a durable artifact before apply. That could be a staging table, an object-store blob, or another append-only result boundary.

7. Returning full results[] inline does not scale well

Severity: High

The ETL contract returns the full normalized result set inline, and ETL accumulates that response in memory before returning it. That couples crawl size to memory pressure, serialization time, HTTP timeout behavior, and retry cost.

This may be tolerable for small crawls. It is fragile for larger ones.

Recommended action: add hard payload limits and a path to artifact references, batching, or chunked apply rather than assuming a single in-memory response is always safe.

8. Cancellation, pause, and resume are only partially implemented

Severity: Medium-High

Baldin does have some guardrails already. Cancel, pause, and resume endpoints exist, and the worker re-checks run status before applying results. That helps prevent a cancelled run from persisting after ETL returns.

But ETL itself has no cancel token, no deadline propagation, and no cooperative cancellation checks. Resume also does not actually resume from a checkpoint; it requeues the run from the beginning. The checkpoint field exists in the model but is not used for real resumability.

Recommended action: propagate deadlines and cancel signals into ETL, add cooperative checks during execution, and either implement true checkpoint semantics or describe resume honestly as restart-from-beginning.

9. State ownership is spread across too many actors

Severity: Medium-High

web and the scheduler create runs and orchestration events. The worker loads context and applies results. ETL owns browser execution, validation, proxy behavior, and adapter retries. Review and reaping introduce additional actors.

That can work, but only if transitions are explicit and strongly idempotent. Today, the arrangement remains race-prone under cancellation, retry, failure, and review edge cases.

Recommended action: define a clear state machine, assign authoritative ownership for each transition, and use versioned or compare-and-swap style updates on critical state changes.

10. Retry policy is under-specified

Severity: Medium

The original “retry storm” framing was too strong for current Baldin. Most retries today live inside browser actions and adapter navigation. Upper layers mostly rely on queue fallback and explicit manual retry.

Still, the core concern remains. ETL reports free-form error_summary, and there is no machine-readable error classification for routing retry policy. That becomes dangerous as more retry layers are inevitably added.

Recommended action: introduce structured error classes such as retriable, permanent, validation_failed, auth_failed, rate_limited, cancelled, and deadline_exceeded, and make one layer the clear owner of retry policy.

11. Observability exists, but it is not production-grade for this workflow

Severity: Medium

Baldin is not operating blind. It already has Sentry bootstrap, structured logging, ETL warning logging, and a runtime-status endpoint exposing queue and ETL reachability.

The gap is at the next level: there are no ETL attempt IDs, no trace stitching across web -> worker -> ETL, no strong correlation ID usage, no per-source success metrics, no proxy-specific telemetry, and no browser memory or timing visibility. Production incidents will still collapse too easily into “timeout” or “unknown ETL error.”

Recommended action: add traceable attempt identifiers, cross-service correlation, queue latency metrics, browser lifecycle timing, per-source success/failure dashboards, and proxy failure metrics.

12. The internal contract is not versioned and has a dual source of truth

Severity: Medium-High

The ETL request includes run_id, but it also includes mutable execution inputs such as source, query_definition, execution_policy, and optional metadata. That means ETL is executing a backend-assembled snapshot rather than resolving from one authoritative record, and there is no schema version protecting mixed-version deploys.

That is survivable in development. It becomes brittle in production rollouts.

Recommended action: either make the ETL request an explicitly versioned immutable execution snapshot, or make ETL resolve from a backend-owned authoritative execution record.

13. Scraped fields are still treated too casually as trusted text

Severity: Medium

Some hygiene already exists. URLs are validated, and lead text is normalized before persistence. But the design still lacks explicit field-length caps, ETL-side sanitization rules, and a clear contract statement that crawler result text is untrusted until rendered safely.

That leaves room for oversized payloads, malformed Unicode, HTML-bearing text, and downstream rendering problems.

Recommended action: define strict field-size caps, normalization rules, text-safety expectations, and safe-rendering requirements as part of the ETL contract.

14. The deployment story is not yet production-ready

Severity: Medium

This is not a contradiction of the repo posture. Baldin is explicitly local-first and Compose-oriented. The issue is not that the design fails its own stated goals. The issue is that it is still missing the operational controls expected of a production service boundary.

There is no clear story yet for resource limits, concurrency caps, autoscaling, rollout sequencing, rollback safety, or browser-process failure isolation.

Recommended action: produce a production deployment plan before promoting this boundary beyond local or preview use.

15. The test plan is meaningful, but it misses the most important architectural failures

Severity: Medium-High

The current test posture is better than a thin reading would suggest. Baldin already covers ETL warnings, failure mapping, queue fallback behavior, pending-review transitions, cancel-before-persist behavior, and cancel/pause/resume route transitions.

The missing tests are the ones most likely to break this architecture in production: worker crash after ETL success but before apply, HTTP timeout while ETL continues running, lost work after queue pop, oversized ETL payloads, mixed-version worker/ETL compatibility, and replay or recovery behavior around durable handoff.

Recommended action: add failure-mode integration tests and chaos-style scenarios before treating this as production-grade.

Pre-Ship Bar

Before this design should be considered production-ready, the following items should be in place:
	1.	A genuinely least-privileged ETL runtime with stripped secrets and restricted network access.
	2.	An authenticated internal ETL surface with docs disabled or hidden in production.
	3.	Allowlisted proxy profiles instead of free-form upstream URL and env-variable selection.
	4.	Explicit attempt semantics with recoverable execution, heartbeats, and idempotent apply behavior.
	5.	A durable ETL output boundary so completed work is not lost between execution and persistence.
	6.	A versioned internal contract with machine-readable error classes and clear final-state ownership.
	7.	Cooperative cancellation and deadline propagation across worker and ETL.
	8.	Production-grade observability and failure-mode testing across the full web -> worker -> ETL path.

Final Recommendation

Do not ship this design to production as currently specified.

It is a reasonable and useful local-first step. It improves separation of concerns and creates a better place to evolve crawler execution. But without stronger privilege isolation, safer proxy configuration, durable execution semantics, and better operational controls, it remains too fragile for production use.
```

Please validate the final report above.
