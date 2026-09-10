# W05 Reliability Plane

W05 owns runtime resilience policy only. It does not own routing, placement, execution, writes, or control-plane state.

## Responsibilities

- bounded retries with exponential backoff and jitter;
- operation deadlines, per-attempt cancellation, and timeout classification;
- per-target circuit breaking;
- transient/permanent/timeout failure classification;
- write-retry safety: non-idempotent writes are never retried;
- deterministic policy evaluation for tests and production observability.

Every attempt receives a fresh `AbortSignal`. Timeout aborts the current attempt before W05 returns its typed `TIMEOUT` failure. Integrated operations must honor that signal so timed-out external I/O does not intentionally continue.

Cloudflare D1 provides automatic retries for eligible read-only queries. W05 remains the application-level resilience boundary for idempotent writes and cross-worker operations. Application retries for writes must be justified by business-level idempotency.

## Boundary

W05 consumes an operation and a failure policy. It returns either a successful value or a typed reliability error. It does not discover shards, mutate control metadata, or perform business recovery itself.

Contract: `W05-RELIABILITY-PLANE-CONTRACT-v1.1.md`.
