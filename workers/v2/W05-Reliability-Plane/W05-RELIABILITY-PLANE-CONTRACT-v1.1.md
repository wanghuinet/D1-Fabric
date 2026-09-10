# W05 Reliability Plane Contract v1.1

## 1. Ownership

W05 is the runtime resilience boundary for W01-W04. It owns retry decisions, deadlines, failure classification, circuit state, cancellation signaling, and recovery-safe execution policy.

W05 does not own routing, shard placement, D1 schema, write idempotency storage, or control-plane metadata.

When deployed as a service, W05 is the mandatory reliability boundary between W02 Execution Fabric and W03 Write Fabric for write execution. W02 must not bypass W05 for a write execution that requires runtime reliability handling.

## 2. Retry safety

1. Reads may retry when the failure is retryable.
2. Writes may retry only when the operation is explicitly idempotent and `retryWrites` is enabled.
3. Non-idempotent writes are single-attempt regardless of failure classification.
4. Retry count is bounded by `maxAttempts`.
5. Total reliability time is bounded by `maxElapsedMs`, including attempts, backoff, and retry admission.
6. Delay is exponential, bounded, and jittered.
7. The service boundary must derive its attempt ceiling from the admitted request retry budget and must never exceed the bounded W05 service ceiling.

## 3. Timeout and cancellation

1. Every attempt has a bounded timeout. The effective per-attempt timeout is the smaller of the configured timeout and the remaining reliability budget.
2. W05 creates a fresh `AbortSignal` for every attempt and passes it to the operation.
3. When an attempt timeout fires, W05 aborts that attempt before surfacing the typed `TIMEOUT` failure.
4. Operations integrated with W05 must honor the supplied `AbortSignal` and must not intentionally continue external I/O after it is aborted.
5. A timeout is classified separately from permanent application failure and may be retried when operation semantics permit it.
6. Cancellation signaling does not imply cancellation of work that is intrinsically non-abortable; the operation contract must therefore make abort compliance explicit at the integration boundary.

## 4. Circuit breaker

The state machine is CLOSED -> OPEN -> HALF_OPEN -> CLOSED/OPEN.

- CLOSED accepts operations and counts failures.
- OPEN rejects operations until the reset interval expires.
- HALF_OPEN admits a bounded number of probes.
- A successful probe closes the circuit.
- A failed probe reopens the circuit.

The deployed W05 execution boundary maintains circuit state across requests within a Worker isolate and uses a bounded retry budget for downstream execution. Durable cross-isolate global coordination is outside v1.1.

## 5. Failure classification

Retryable classes are transient and timeout. HTTP 4xx failures are permanent except 408/425/429; 5xx failures are transient.

## 6. Service integration contract

`POST /v1/execute` accepts the W02-produced write execution envelope without changing W03 ownership semantics. W05 may reject malformed envelopes before forwarding them.

For retryable upstream responses, W05 may retry only when the W03 operation is explicitly marked retryable. W03 remains authoritative for idempotency-key validation and atomic idempotency state.

W05 forwards a fresh downstream request for every retry attempt so request bodies are not reused after a prior fetch consumes the body stream.

A missing W03 service binding is a readiness failure and returns `503 W03_UNAVAILABLE` for execution requests.

## 7. Verification gate

W05 is not PASS until all of the following are green:

- TypeScript typecheck
- unit tests
- service-boundary integration tests
- dry-run deployment
- W01-W04 integration regression
- GitHub Actions workflow

## 8. Production invariants

- no unbounded retry loop;
- no retry of non-idempotent writes;
- no unbounded circuit probe concurrency;
- no reliability execution beyond `maxElapsedMs`;
- no timed-out attempt left intentionally running when the underlying operation honors the supplied abort signal;
- no failure swallowed without typed classification;
- no floating Promise in Worker integration;
- no business recovery logic inside W05;
- no W02 write bypass around W05;
- no reuse of a consumed downstream request body across retry attempts;
- no false-ready W05 when W03 is unbound.
