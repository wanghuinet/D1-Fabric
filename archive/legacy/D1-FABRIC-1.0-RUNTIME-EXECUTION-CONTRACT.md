# D1-Fabric 1.0 Runtime Execution Contract

**Status:** ARCHITECTURE BASELINE  
**Version:** 1.0  
**Authority:** Architecture Contract + Data and State Contract  

## 1. Purpose

This contract defines how D1-Fabric executes requests.

The runtime MUST provide deterministic execution, minimum necessary work, minimum necessary D1 I/O, bounded concurrency, bounded fan-out, bounded retries, explicit timeout/cancellation, shard-local execution, safe cross-shard execution, idempotent mutation handling, cache-aware execution, and AI-assisted optimization without AI dependency on the hot path.

## 2. Unified Execution Pipeline

```text
Request
→ Normalize
→ Validate
→ Resolve Context
→ Resolve Routing
→ Build Execution Plan
→ Validate Plan
→ Execute
→ Commit / Read
→ Assemble Result
→ Observe
```

## 3. Request Lifecycle

A request MUST have a bounded lifecycle:

```text
RECEIVED → NORMALIZED → VALIDATED → ROUTED → PLANNED → EXECUTING → COMPLETED → RESPONDED
```

Possible terminal/error states include:

```text
REJECTED / TIMEOUT / CANCELLED / OVERLOADED / STALE_ROUTE / PARTIAL_FAILURE / FAILED
```

## 4. Request Context

The request context SHOULD remain compact and contain only execution-relevant state:

```text
request_id
tenant_id
operation
routing_key
consistency
idempotency_key
deadline
routing_epoch
resource_budget
```

Normalization and validation SHOULD perform no unnecessary D1 I/O.

## 5. Resource Budget

Every request MUST have bounded:

```text
deadline
D1 reads
D1 writes
D1 queries
shard fan-out
parallelism
retries
payload
memory
```

Child operations consume remaining parent budget and cannot receive independent unlimited budgets.

## 6. Routing

Routing MUST be deterministic for:

```text
routing_key + routing_epoch
```

Before authoritative execution, the runtime SHOULD validate:

- routing epoch;
- shard state;
- ownership;
- permissions.

Stale routing must result in refresh/re-route or safe rejection, never silent stale mutation.

## 7. Execution Plan

Non-trivial requests SHOULD produce an explicit bounded plan containing, conceptually:

```text
epoch
target_shards
operations
dependencies
parallelism
d1_budget
timeout
retry_policy
consistency
merge_strategy
```

The actual representation may be smaller if it preserves the same semantics.

## 8. Plan Validation

Every plan MUST be checked against:

- routing epoch;
- ownership;
- D1 budget;
- fan-out;
- parallelism;
- timeout;
- retry policy;
- consistency;
- security;
- payload limits.

Invalid plans MUST NOT execute.

## 9. Plan Minimality

The planner SHOULD produce the smallest valid plan capable of satisfying the request.

It should minimize:

```text
operations
D1 reads
D1 writes
shards
network hops
serialization
retries
memory
```

## 10. Zero-I/O and Single-Shard Fast Paths

The runtime SHOULD finish cache/local-state requests before D1.

The preferred common path is:

```text
Request → Route → Single Shard → D1 → Result
```

A global coordinator or extra Worker MUST NOT be introduced without a real boundary.

## 11. D1 Boundary

D1 execution MUST go through a controlled storage interface enforcing:

- parameterization;
- limits;
- resource accounting;
- transaction semantics;
- timeout/cancellation where supported;
- observability.

Arbitrary uncontrolled D1 calls are prohibited.

## 12. Read Execution

Reads SHOULD prefer:

```text
cache → local shard → D1
```

The planner should avoid querying shards that cannot contribute to the result.

## 13. Write Execution

The preferred write sequence is:

```text
Validate
→ Route
→ Ownership Check
→ Idempotency
→ D1 Transaction
→ Commit
→ Cache / Derived-State Update
```

Cache and derived-state changes MUST NOT be presented as authoritative before the source-of-truth commit is safe.

## 14. D1 I/O Minimization

The runtime MUST avoid redundant reads and writes.

Compatible work SHOULD be combined when this reduces I/O without changing semantics.

Unchanged state SHOULD NOT be rewritten merely to produce activity.

## 15. Transactions

A single D1 transaction SHOULD be preferred when required atomicity fits within one D1 database.

The runtime MUST NOT simulate global atomicity merely because multiple shards exist.

## 16. Idempotency and Retry

Retryable mutations MUST have idempotency identity.

Every retry policy MUST define:

```text
max_attempts
deadline
backoff
jitter policy
retryable errors
```

Retries stop when budget/deadline is exhausted, cancellation occurs, or the error is non-retryable.

Retry MUST NOT amplify overload without bound.

## 17. Errors

At minimum distinguish:

```text
INVALID_REQUEST
UNAUTHORIZED
NOT_FOUND
CONFLICT
STALE_ROUTE
OVERLOAD
TIMEOUT
CANCELLED
TRANSIENT
PERMANENT
INTERNAL
```

Only explicitly retryable errors may be retried.

## 18. Timeout and Cancellation

Every request MUST have a deadline.

The deadline propagates to child operations, D1 work, cross-shard work, retries, and merge operations.

Cancellation MUST stop unnecessary work without corrupting an already committed transaction.

## 19. Concurrency

Concurrency MUST be bounded separately for:

```text
requests
shards
D1 operations
cross-shard execution
background work
```

Independent shard operations MAY run in parallel within hard limits. Dependent operations MUST remain ordered.

## 20. Backpressure

Overload MUST result in bounded admission, backpressure, controlled degradation, or rejection.

Queues MUST define:

```text
maximum depth
maximum age
admission policy
overflow behavior
drain behavior
```

Unbounded queues are prohibited.

## 21. Batch Execution

Batching SHOULD combine compatible operations when it reduces overhead.

Batch size MUST be bounded by payload, memory, D1 limits, execution time, transaction size, and failure blast radius.

Batch failure semantics MUST be explicit:

```text
ALL_OR_NOTHING
PARTIAL
PER_ITEM
```

## 22. Cross-Shard Execution

Cross-shard execution MUST explicitly define:

```text
target shard count
fan-out budget
parallelism
timeout
merge strategy
partial-failure policy
```

Arbitrary unbounded shard discovery is forbidden.

## 23. Cross-Shard Merge and Pagination

Merge MUST bound result size and memory.

Pagination MUST preserve declared ordering and avoid duplicates/omissions. Cursor/keyset strategies SHOULD be preferred where appropriate.

Partial failure behavior MUST be explicit; silently returning incomplete authoritative data is prohibited unless the contract explicitly allows partial results.

## 24. Cache Execution

Cache MAY precede D1 when consistency permits:

```text
Cache Hit → Result
Cache Miss → D1
```

Cache MUST preserve authorization, tenant isolation, ownership, and consistency semantics.

Cache stampede protection MAY coalesce equivalent misses, but coalescing population, wait time, and lifetime MUST be bounded.

## 25. AI-Assisted Plans

AI MAY propose execution plans, but every candidate MUST pass the same deterministic:

```text
Plan Validation
→ Resource Validation
→ Security Validation
→ Consistency Validation
→ Policy
```

AI cannot directly execute arbitrary D1 operations.

If AI is unavailable, slow, rejected, or invalid, the runtime MUST use the deterministic baseline plan.

## 26. Plan Versioning and Expiration

Material plans SHOULD have:

```text
plan_id
plan_version
routing_epoch
runtime_version
```

Plans SHOULD have invalidation/expiration conditions for routing changes, schema changes, policy changes, workload shifts, and measured regressions.

## 27. Hot Path vs Control Path

The Hot Path MUST NOT require:

- remote AI inference;
- global coordination;
- unbounded metadata lookup;
- experimental decision generation.

The Control Path MAY perform expensive AI inference, benchmark analysis, migration planning, anomaly detection, and experiment analysis without blocking ordinary Data Plane execution.

## 28. Telemetry

Material executions SHOULD expose enough bounded telemetry to reconstruct:

```text
request
routing
epoch
plan
shards
D1 reads
D1 writes
cache
retries
latency
status
```

Telemetry itself MUST be bounded.

## 29. Cost Accounting

Logical requests SHOULD be associated with:

```text
D1 rows read
D1 rows written
D1 queries
shards
retries
execution time
payload
```

This supports cost optimization, tenant accounting, and regression detection.

## 30. Admission and Degradation

Admission MAY consider:

```text
current load
request cost
shard load
D1 pressure
queue depth
tenant limits
```

During overload, expensive work may be rejected before cheap work. Degradation MUST remain within declared consistency semantics.

## 31. Tenant and Hot-Key Isolation

A tenant or hot key MUST NOT consume unlimited shared resources.

Protection MAY include cache, coalescing, rate limiting, admission control, and shard isolation without changing authoritative semantics.

## 32. Graceful Shutdown and Startup

Shutdown:

```text
Stop Admission
→ Stop New Work
→ Drain/Cancel Bounded Work
→ Commit Safe Operations
→ Release Resources
```

Startup:

```text
Load Configuration
→ Validate State
→ Resolve Routing Epoch
→ Validate Ownership
→ Initialize Safe State
→ Accept Traffic
```

Traffic MUST NOT be accepted before critical invariants are restored.

## 33. Runtime Health

Health MUST distinguish:

```text
READY
DEGRADED
OVERLOADED
RECOVERING
NOT_READY
FAILED
```

Process liveness is not sufficient evidence of readiness.

## 34. Runtime Invariants

- **RT-01:** Every request has a bounded lifecycle.
- **RT-02:** Every request has a resource budget.
- **RT-03:** Routing is deterministic for a fixed epoch.
- **RT-04:** Stale routing cannot silently execute authoritative writes.
- **RT-05:** No request may cause unbounded D1 I/O.
- **RT-06:** No request may cause unbounded shard fan-out.
- **RT-07:** Retry is finite and idempotent where required.
- **RT-08:** Retry cannot amplify overload without bound.
- **RT-09:** Concurrency is bounded.
- **RT-10:** Queues are bounded.
- **RT-11:** Cross-shard failure semantics are explicit.
- **RT-12:** AI is not required for ordinary Data Plane correctness.
- **RT-13:** AI-generated plans pass deterministic validation.
- **RT-14:** AI cannot bypass resource or security limits.
- **RT-15:** Material optimization is observable.
- **RT-16:** Material automatic optimization is reversible where technically possible.
- **RT-17:** Cancellation cannot corrupt committed state.
- **RT-18:** Recovery restores routing and ownership before normal service resumes.

## 35. Forbidden Runtime Designs

Prohibited:

- unbounded D1 scans;
- unbounded shard fan-out;
- unbounded retries;
- unbounded queues;
- unbounded concurrency;
- AI inference required for every request;
- AI direct arbitrary D1 mutation;
- AI bypass of plan validation;
- AI bypass of authorization;
- AI bypass of resource limits;
- global coordinator on ordinary hot path;
- hidden cross-shard execution;
- silent consistency downgrade;
- retry without idempotency;
- stale routing writes;
- unbounded cache stampede;
- unbounded request coalescing;
- unbounded telemetry.

## 36. Verification Matrix

Runtime verification MUST cover:

```text
normal request
zero-I/O request
cache hit/miss
single-shard read/write
concurrent write
duplicate write
retry
timeout
cancellation
overload
backpressure
batch and batch failure
cross-shard read
partial failure
pagination
hot key
hot shard
stale routing
epoch transition
migration interaction
D1 failure
Worker restart
AI plan accepted/rejected/unavailable
AI regression
configuration rollback
shutdown
recovery startup
```

## 37. Final Runtime Law

> **Every request must execute the smallest bounded, deterministic, resource-aware plan that can satisfy its declared semantics.**

AI may discover a better plan. AI may not redefine correctness.
