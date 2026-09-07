# D1-Fabric World-Class Scale & Reliability Gate

**Status:** MANDATORY  
**Applies to:** every capability claiming `CAPABILITY_PASS`, `RELEASE_READY`, or production readiness  
**Authority:** Constitution v3.0 + v3.1 + v3.2

## Purpose

This is the single consolidated gate for proving that D1-Fabric is robust under concurrency, skew, overload, failure, recovery, and sustained operation.

It is intentionally one gate rather than many micro-documents.

---

## Gate 1 — Ownership

Record:

- authoritative state owner
- shard/partition ownership rule
- routing epoch/version
- migration/fencing rule
- control-plane versus data-plane boundary

**Reject if:** ownership can be ambiguous, stale actors can commit incorrectly, or normal hot-path traffic requires a global coordinator without approved evidence.

## Gate 2 — Hot Path

For each critical operation record:

| Budget | Required |
|---|---|
| Network hops | bounded |
| D1 reads | bounded/measured |
| D1 writes | bounded/measured |
| Cross-shard work | bounded/measured |
| Coordination | bounded/measured |
| Retries | bounded |
| Fan-out | bounded |

**Reject if:** any operation can grow without a declared bound.

## Gate 3 — Concurrency

Test the actual contention boundary, including:

- parallel requests to the same key
- parallel requests to different keys
- same-shard contention
- cross-shard parallelism
- duplicate execution
- concurrent topology change where applicable

Record throughput, latency distribution, failures, queue depth, and D1 I/O.

## Gate 4 — Admission / Backpressure

Every queue, batch, retry loop, and fan-out MUST define:

```text
capacity
admission
backpressure
timeout
deadline
retry limit
load shedding
observable rejection
```

**Reject if:** overload can produce unbounded memory, latency, queue growth, or retry amplification.

## Gate 5 — D1 Economics

Measure D1 operations rather than estimating from source code.

Record:

```text
reads/request
writes/request
rows touched
transactions/request
batch sizes
retry amplification
cross-shard amplification
```

The preferred implementation is the lowest-I/O design that preserves the contract.

## Gate 6 — Skew / Hotspot

At minimum compare:

1. uniform keys
2. one hot key
3. hot shard
4. burst traffic
5. read-heavy
6. write-heavy
7. mixed workload

A scalable design must remain bounded under skew or have an explicit, tested mitigation path.

## Gate 7 — Failure / Recovery

Inject or simulate:

- D1 timeout
- transient D1 failure
- Worker restart
- duplicate request
- partial batch failure
- stale routing metadata
- concurrent topology change
- cache loss
- network failure

Verify no committed-state corruption and that recovery converges without normal manual repair.

## Gate 8 — Soak

Run sustained workload long enough to expose:

- memory growth
- queue accumulation
- retry storms
- latency drift
- hotspot amplification
- stale metadata
- resource leaks

The duration is workload-dependent and must be recorded with the evidence.

## Gate 9 — Capacity Envelope

Publish a workload-specific envelope:

```text
RPS
concurrency
payload size
dataset size
shard count
D1 I/O
p50
p95
p99
error rate
rejection rate
```

Never publish a single unconditional "maximum QPS" as a universal property.

## Gate 10 — Evidence Reproducibility

Every result must identify:

```text
commit
runtime
configuration
schema/index state
dataset/workload version
concurrency
duration
warm/cold state
shard count
D1 counters
latency/error results
```

A result is **PROVEN** only when another engineer/agent can reproduce it from the recorded procedure.

## Final Classification

| Status | Meaning |
|---|---|
| PROVEN | contract met with reproducible evidence |
| PARTIAL | only part of the contract is proven |
| UNPROVEN | design exists but runtime proof is missing |
| FAILED | runtime evidence violates the contract |
| NOT_APPLICABLE | explicitly justified |

### Release rule

```text
All applicable gates = PROVEN
AND regression = PASS
AND no P0/P1 defect
AND documentation impact = CLOSED
→ RELEASE_READY
```

Otherwise the capability remains `BLOCKED`, `IN_PROGRESS`, or `FAILED` according to the actual state.

## Evidence Record Template

```text
Capability:
Commit:
Runtime:
Configuration:
Schema/Indexes:
Dataset:
Workload:
Concurrency:
Duration:
Warm/Cold:
Shard Count:
D1 Reads:
D1 Writes:
Rows Touched:
p50:
p95:
p99:
Errors:
Rejections:
Queue Peak:
Failure Injection:
Recovery Result:
Applicable Invariants:
Gate Results:
Independent Verification:
Final Status:
```

## Principle

> D1-Fabric does not claim world-class scalability because the architecture looks sophisticated. It earns that claim only when correctness, bounded concurrency, low D1 I/O, overload behavior, recovery, and scale are repeatedly demonstrated with reproducible evidence.
