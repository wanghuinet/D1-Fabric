# D1-Fabric 1.0 Verification and Evidence Contract

**Status:** CONTRACT BASELINE
**Version:** 1.0
**Authority:** D1-Fabric 1.0 Contract Baseline + Development and AI Engineering Contract

## 1. Purpose

This contract freezes what it means for D1-Fabric to be verified, complete, capable, release-ready, and released.

Core law:

> **No evidence, no claim. No reproducible verification, no completion.**

Passing compilation or a happy-path test is never sufficient evidence of distributed correctness.

## 2. Verification Source of Truth

Verification MUST be derived from:

```text
Contract Baseline
→ Applicable individual contracts
→ Capability acceptance criteria
→ Invariants
→ Verification plan
→ Executed evidence
```

Tests MUST NOT redefine contract semantics.

## 3. Verification Object

Every capability MUST have a unique verification identity containing at least:

```text
capability_id
implementation_commit
contract_baseline/version
environment
runtime/provider versions
schema version
configuration fingerprint where relevant
test suite/version
verification timestamp
```

## 4. Verification Levels

Use these levels:

```text
V0  Static / structural
V1  Unit / deterministic logic
V2  Integration
V3  Runtime / real boundary
V4  Contract / invariant
V5  Concurrency / overload
V6  Failure / recovery
V7  Security / isolation
V8  Performance / cost / regression
V9  Soak / operational readiness
```

Not every capability requires every level, but the evidence MUST explicitly state which levels apply and why omitted levels do not apply.

## 5. Verification Pyramid

Verification SHOULD proceed from cheap to expensive:

```text
format/type/lint
→ unit
→ targeted integration
→ build
→ runtime smoke
→ contract/invariant
→ concurrency
→ overload/backpressure
→ failure/recovery
→ security/isolation
→ performance/cost
→ regression
→ soak
```

A later level does not erase a missing mandatory earlier invariant.

## 6. Contract-to-Test Mapping

Every MUST requirement relevant to an implementation MUST map to at least one of:

```text
automated test
property/invariant check
static verification
runtime verification
reproducible operational procedure
```

If a MUST has no verification method, the capability is incomplete.

## 7. Invariant Testing

Tests MUST verify invariants, not merely expected examples.

Critical distributed invariants include:

```text
one authoritative owner
valid routing epoch
no stale writer acceptance
tenant isolation
authorization enforcement
bounded D1 I/O
bounded fan-out
bounded retries
idempotent mutation
partial failure safety
recoverable ownership
schema compatibility
cache isolation
```

## 8. Negative Testing

For critical paths, verification MUST include rejection of invalid states and actions:

```text
missing identity
invalid identity
unauthorized operation
wrong tenant
cross-tenant request
wrong routing key
wrong shard
stale epoch
non-owner write
duplicate mutation
ambiguous commit retry
schema mismatch
migration interruption
restore mismatch
cache poisoning
resource exhaustion
queue overflow
```

## 9. Determinism Testing

Deterministic components MUST be tested with repeated equivalent inputs.

Where applicable verify:

```text
same normalized request → same routing result
same routing epoch → same ownership decision
same idempotency identity → same mutation outcome
same query semantics → compatible result ordering/shape
```

Non-determinism MUST be explicit and bounded rather than accidental.

## 10. State Ownership Verification

For every persistent/control state touched by a capability, evidence MUST prove:

```text
classification
semantic owner
authoritative location
update boundary
version/epoch
recovery behavior
migration behavior
invalidations
```

A test that only checks rows exist does not prove state ownership.

## 11. Routing / Epoch Verification

Evidence MUST separately test:

```text
authorization
routing
epoch validation
ownership
```

At minimum test:

```text
valid route + current epoch + owner → accepted
valid route + stale epoch → rejected/reconciled
valid route + wrong owner → rejected
valid route + unauthorized tenant → rejected
```

## 12. Tenant and Authorization Verification

Tenant isolation MUST be tested using distinct identities and scopes.

Evidence MUST demonstrate that changing client-supplied tenant identifiers cannot cross an authorization boundary.

Cache, derived data, fan-out, batch, and error paths MUST be included where they can expose tenant data.

## 13. Database Verification

For each database operation, evidence SHOULD capture:

```text
query count
rows read
rows written
query duration
transaction outcome
index behavior where relevant
retry behavior
```

Production claims MUST NOT rely only on application-level latency.

## 14. D1 I/O Verification

Resource-bound operations MUST prove their bounds.

At minimum verify where applicable:

```text
max queries/request
max rows read
max rows written
max shards
max fan-out
max parallelism
max retries
max payload
max queue work
```

The test MUST cover the boundary and an over-bound request.

## 15. Concurrency Verification

Concurrency tests MUST exercise:

```text
parallel reads
parallel writes
same-key contention
cross-shard concurrency
duplicate requests
retry races
migration races
stale-route races
```

The objective is invariant preservation, not merely higher throughput.

## 16. Overload and Backpressure Verification

Evidence MUST demonstrate that overload remains bounded.

Test:

```text
queue saturation
concurrency saturation
D1 saturation
fan-out pressure
retry pressure
large request volume
```

Expected behavior MUST be explicit:

```text
admit
queue boundedly
degrade
reject
retry within budget
```

Unbounded queue growth is a failed verification.

## 17. Failure Injection

Critical capabilities MUST use controlled failure injection where practical.

Inject at least the relevant failures:

```text
Worker failure
D1 transient failure
D1 timeout
network interruption
shard unavailable
partial fan-out failure
commit ambiguity
cache failure
queue failure
control-plane unavailability
```

The expected result must be defined before the test runs.

## 18. Recovery Verification

Recovery evidence MUST distinguish:

```text
process recovery
storage recovery
schema recovery
ownership recovery
routing/epoch recovery
migration recovery
security-policy recovery
```

A successful D1 restore alone MUST NOT produce a distributed `CAPABILITY_PASS`.

## 19. Recovery Invariants

After recovery, verify:

```text
no stale owner can write
current owner is unique
epoch is valid
migration state is coherent
schema is compatible
idempotency state is safe
authorization is enforced
representative reads work
representative writes work
```

## 20. Schema Migration Verification

Every schema migration MUST verify the compatibility sequence:

```text
Expand
→ compatible readers
→ compatible writers
→ migrate/backfill
→ verify
→ switch
→ contract old form
```

Evidence MUST include at least one supported-version compatibility scenario and one incompatible-version rejection scenario where applicable.

## 21. Ownership Migration Verification

Data movement MUST be tested separately from ownership transfer.

Evidence MUST demonstrate:

```text
copy incomplete → source remains authoritative
copy verified → ownership still unchanged
fence → stale writers blocked
ownership commit → exactly one authoritative owner
epoch advance → new route accepted
retire source → no authoritative dependency remains
```

## 22. Commit and Retry Verification

Tests MUST cover:

```text
commit success + response success
commit success + response failure
commit ambiguous + retry
transient failure + retry
non-retryable failure + no retry
duplicate request + stable outcome
```

No test may treat response delivery as proof of commit outcome.

## 23. Cache Verification

Cache evidence MUST test:

```text
authorization before cache access
tenant isolation
stale data behavior
schema version compatibility
invalidation/revalidation
cache miss fallback
cache failure fallback
cache poisoning resistance
```

Cache hit rate alone is not correctness or performance evidence.

## 24. Cross-Shard Verification

Cross-shard tests MUST verify declared:

```text
fan-out
parallelism
deadline
consistency
partial failure semantics
atomicity semantics
merge behavior
```

No test may infer global atomicity merely because all participating operations succeeded in one run.

## 25. Security Verification

Security verification MUST include:

```text
authentication
authorization
least privilege
tenant isolation
input/query safety
replay/idempotency abuse
resource abuse
control-plane authorization
migration authorization
restore authorization
audit behavior
fail-closed behavior
AI authority boundaries
```

Security-critical unknown states MUST be tested as denial/fail-closed outcomes.

## 26. Compatibility Verification

For every public or persisted compatibility boundary, verify:

```text
request compatibility
response compatibility
error compatibility
schema compatibility
routing compatibility
query-plan compatibility where authoritative behavior depends on it
cache-format compatibility
rolling-version compatibility
```

Breaking changes require explicit evidence and migration protocol.

## 27. Performance Verification

Performance tests MUST fix and record:

```text
dataset
workload
request mix
concurrency
shard count
cache state
consistency mode
runtime/provider version
configuration
```

Required metrics where applicable:

```text
P50
P95
P99
P99.9 for critical paths
queries/request
rows read/request
rows written/request
fan-out
retry rate
error rate
cost/useful operation
```

Average-only results are insufficient for critical performance claims.

## 28. Cost Verification

Cost claims MUST identify the cost drivers:

```text
D1 rows read
D1 rows written
storage
Worker execution
network/other provider resources where material
```

A cost improvement is invalid if it simply moves equivalent cost into an unmeasured resource.

## 29. Regression Verification

Every meaningful implementation change MUST compare against an accepted baseline for applicable metrics.

Regression dimensions:

```text
correctness
security
reliability
compatibility
latency
throughput
D1 I/O
cost
memory
complexity
```

Thresholds MUST be explicit for release-critical metrics.

## 30. AI Optimization Verification

AI-generated optimization MUST follow:

```text
observe
→ analyze
→ hypothesis
→ candidate
→ validate
→ benchmark
→ canary where applicable
→ measure
→ promote/reject
→ record learning
```

AI confidence is not verification evidence.

AI MUST NOT self-certify its own correctness without independent execution of the required verification.

## 31. Evidence Artifact

Each completed capability MUST produce a machine-readable or structured evidence record containing:

```text
capability_id
commit
contract_version
scope
requirements
invariants
tests
commands
inputs
environment
results
metrics
failures
known limitations
risk
final status
```

Human summaries may accompany evidence but cannot replace it.

## 32. Evidence Integrity

Evidence MUST be tied to the exact implementation being claimed.

At minimum:

```text
code commit
schema state
configuration
test result
benchmark result
```

must be traceable.

Evidence from a different commit or incompatible environment MUST NOT be reused as proof without explicit equivalence justification.

## 33. Reproducibility

A reviewer MUST be able to determine:

```text
what was run
where it was run
with which version
against which code
with which inputs
what result occurred
```

“Verified locally” without reproducible detail is insufficient.

## 34. Independent Verification

Critical capabilities SHOULD receive verification by a second independent execution path, reviewer, or test mechanism.

For security, migration, recovery, ownership, and release-critical claims, independent verification is REQUIRED unless explicitly waived with recorded rationale.

## 35. Evidence Failure Modes

The following are evidence failures:

```text
claim without execution
passing test omitted from record
partial test presented as full verification
stale evidence
wrong commit evidence
wrong environment evidence
unreproducible benchmark
fabricated result
silent test skip
hidden flaky failure
manual change not recorded
```

Any such failure blocks capability completion.

## 36. Flaky Test Rule

A flaky test MUST NOT be silently retried until it passes and then reported as a clean pass.

The record MUST distinguish:

```text
first-run failure
retry result
root cause
final disposition
```

Known flaky tests on release-critical paths block `RELEASE_READY` until disposition is accepted.

## 37. Verification Completeness

A capability is verification-complete only when:

```text
all applicable MUSTs mapped
all critical invariants tested
negative paths covered
failure/recovery covered where applicable
security covered where applicable
resource bounds verified
compatibility verified where applicable
performance/cost claims evidenced
regression passed
evidence stored
```

## 38. Capability Status Rules

Statuses have strict meaning:

```text
UNKNOWN          no reliable implementation/verification state
READY            implementation authorized, not started
IN_PROGRESS      implementation underway
LOCAL_PASS       local checks passed, capability not fully verified
CONTRACT_PASS    contract/invariant verification passed
INTEGRATION_PASS integration/runtime boundary passed
REGRESSION_PASS  applicable regression suite passed
CAPABILITY_PASS  all applicable capability evidence complete
RELEASE_READY    release gates complete
RELEASED         production release completed
ROLLED_BACK      released change reverted
FAILED           verification or implementation failed
BLOCKED          cannot safely proceed
```

A status MUST NOT be promoted by narrative alone.

## 39. Release Gate

`RELEASE_READY` requires, as applicable:

```text
contract compliance
security pass
ownership/epoch pass
recovery pass
compatibility pass
resource-bound pass
performance/cost evidence
regression pass
independent verification
evidence integrity
no unresolved P0/P1 defect
```

## 40. Verification Stop Conditions

Verification MUST stop and mark `BLOCKED` when:

```text
contract conflict
ambiguous state ownership
authorization bypass
cross-tenant leakage
stale writer accepted
data corruption/loss risk
unbounded resource behavior
unproven recovery
schema incompatibility
fabricated evidence
wrong-commit evidence
unresolved critical flaky test
P0/P1 defect
```

Do not convert a failed verification into a documentation change merely to obtain a pass.

## 41. Verification Economy

Verification itself MUST be efficient.

Use the smallest test set that provides complete coverage of the applicable invariants and boundaries.

Prefer:

```text
pure logic tests
→ focused integration
→ targeted fault injection
→ bounded concurrency
→ targeted benchmark
```

over duplicated broad suites that provide no additional evidence.

## 42. No Green-by-Accident

A capability MUST NOT be considered verified because:

```text
build succeeds
one request succeeds
unit tests pass while integration is untested
benchmark runs without fixed workload
AI says it is correct
manual inspection looks correct
```

## 43. Final Verification Law

> **The implementation is not what we believe it does; it is what reproducible evidence proves it does.**
