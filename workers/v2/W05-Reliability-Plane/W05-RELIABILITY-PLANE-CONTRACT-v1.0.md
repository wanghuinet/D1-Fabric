# W05 Reliability Plane Contract v1.0

## 1. Ownership

W05 is the runtime resilience boundary for W01-W04. It owns retry decisions, deadlines, failure classification, circuit state, and recovery-safe execution policy.

W05 does not own routing, shard placement, D1 schema, write idempotency storage, or control-plane metadata.

## 2. Retry safety

1. Reads may retry when the failure is retryable.
2. Writes may retry only when the operation is explicitly idempotent and `retryWrites` is enabled.
3. Non-idempotent writes are single-attempt regardless of failure classification.
4. Retry count is bounded by `maxAttempts`.
5. Delay is exponential, bounded, and jittered.

## 3. Timeout

Every attempt has a bounded timeout. Timeout is classified separately from permanent application failure and may be retried when operation semantics permit it.

## 4. Circuit breaker

The state machine is CLOSED -> OPEN -> HALF_OPEN -> CLOSED/OPEN.

- CLOSED accepts operations and counts failures.
- OPEN rejects operations until the reset interval expires.
- HALF_OPEN admits a bounded number of probes.
- A successful probe closes the circuit.
- A failed probe reopens the circuit.

## 5. Failure classification

Retryable classes are transient and timeout. HTTP 4xx failures are permanent except 408/425/429; 5xx failures are transient.

## 6. Verification gate

W05 is not PASS until all of the following are green:

- TypeScript typecheck
- unit tests
- dry-run deployment
- W01-W04 integration regression
- GitHub Actions workflow

## 7. Production invariants

- no unbounded retry loop;
- no retry of non-idempotent writes;
- no unbounded circuit probe concurrency;
- no failure swallowed without typed classification;
- no floating Promise in Worker integration;
- no business recovery logic inside W05.
