# D1-Fabric First-Pass Verification Protocol

**Project:** D1-Fabric  
**Release:** 1.0  
**Protocol Version:** 1.0  
**Status:** MANDATORY  
**Authority:** D1-Fabric Engineering Constitution v3.0 + D1-Fabric 1.0 Development Contract v1.1  
**Purpose:** Prevent silent correctness defects, distributed-state corruption, concurrency defects, weak tests, patch piling, and false PASS during AI-assisted development.

---

# 0. Core Principle

D1-Fabric MUST optimize for **first-pass correctness**, not merely first-pass code generation.

The objective is:

```text
Design correctly
    ↓
Freeze invariants and state transitions
    ↓
Implement one coherent path
    ↓
Attack the implementation with high-value verification
    ↓
Find root causes before release
    ↓
Regression-proof the fix
    ↓
Independent PASS
```

Absolute zero bugs cannot be mathematically guaranteed. The engineering requirement is stronger and operationally enforceable:

> **No unresolved correctness defect may cross a Worker boundary.**

---

# 1. Mandatory Verification Layers

For every applicable Worker, verification MUST include:

```text
V01 Invariant Contract
V02 State Machine Contract
V03 Property / Fuzz Testing
V04 Concurrency Stress
V05 Independent Oracle / Reference Check
V06 Fault Injection Matrix
V07 Performance Baseline + Regression Threshold
V08 Mutation / Clean-Room Verification
```

Not every layer requires a large test suite. The agent MUST choose the smallest test set capable of meaningfully exercising the risk.

A layer marked `NOT TESTED`, `NOT RUN`, `SKIPPED`, or `UNKNOWN` is NOT PASS.

---

# 2. V01 — Invariant Contract

Every stateful or distributed Worker MUST define its critical invariants before implementation.

An invariant is a property that MUST remain true before, during, and after operations, including failure and recovery where applicable.

Examples:

```text
Shard ownership is authoritative and non-ambiguous.
A record has exactly one authoritative owner.
Shard split preserves record identity and cardinality.
Shard move preserves record identity and cardinality.
Rebalance does not lose or duplicate records.
Routing resolves according to current ownership.
Committed WAL state is recoverable.
Idempotent operations do not create duplicate effects.
Cache invalidation cannot expose a prohibited stale value.
```

## Required invariant test pattern

```text
Initial state
 → operation
 → intermediate state
 → failure/retry if applicable
 → final state
 → invariant assertion
```

A successful API response is never sufficient proof of an invariant.

---

# 3. V02 — State Machine Contract

Every Worker containing lifecycle or stateful coordination MUST define valid state transitions before implementation.

Example:

```text
CREATING → ACTIVE
ACTIVE → SPLITTING
SPLITTING → ACTIVE
ACTIVE → MOVING
MOVING → ACTIVE
```

Recovery examples:

```text
RUNNING → FAILED
FAILED → RECOVERING
RECOVERING → RUNNING
```

The test matrix MUST include, where applicable:

- valid transition
- invalid transition
- repeated transition
- concurrent transition
- crash during transition
- restart during transition
- partial transition
- recovery after partial transition

The implementation MUST NOT allow an impossible state merely because a caller supplied a legal-looking request.

---

# 4. V03 — Property-Based / Fuzz Testing

Critical algorithms MUST be tested beyond hand-written examples.

Applicable targets include:

- shard routing
- shard-key calculation
- split boundaries
- rebalance
- query planning
- pagination
- serialization/deserialization
- cache invalidation
- WAL replay
- idempotency
- retry handling

Preferred pattern:

```text
Generate valid/randomized operations
          ↓
Execute against D1-Fabric
          ↓
Check invariant / independent oracle
```

The objective is not maximum random test count. The objective is to explore boundary combinations that humans are unlikely to enumerate manually.

Fuzz tests MUST have bounded execution time and reproducible seeds when possible.

A discovered fuzz failure MUST preserve the smallest reproducing case as a regression test.

---

# 5. V04 — Concurrency Stress

Distributed correctness MUST NOT depend on favorable scheduling.

Applicable Workers MUST exercise concurrent operations such as:

```text
Readers + Writers
Retries + Writes
Shard movement + Reads
Shard movement + Writes
Cache invalidation + Reads
Recovery + Requests
Multiple coordinators + State transitions
```

The concurrency test MUST attempt to detect:

- race conditions
- lost updates
- duplicate effects
- deadlocks
- livelocks
- starvation
- ordering violations
- stale ownership
- inconsistent state publication
- resource exhaustion

Where supported by the runtime/toolchain, race detection or equivalent concurrency diagnostics SHOULD be used.

A single successful concurrent run is not sufficient evidence for a race-sensitive property. Stress tests SHOULD execute repeated schedules or randomized interleavings.

---

# 6. V05 — Independent Oracle / Reference Verification

Where correctness can be computed independently, the expected result MUST NOT be generated by the same production algorithm under test.

Examples:

```text
D1-Fabric routing result
        ↓ compare
Independent reference calculation
```

```text
D1-Fabric query result
        ↓ compare
Simple reference implementation
```

```text
D1-Fabric record distribution
        ↓ compare
Independent ownership calculation
```

The oracle SHOULD favor simplicity and transparency over performance.

The purpose is to prevent:

```text
Implementation bug
 +
Test derived from same bug
 =
False PASS
```

If no independent oracle is practical, the evidence MUST explicitly state that limitation.

---

# 7. V06 — Fault Injection Matrix

Failure testing MUST target partial failure, not only total failure.

Applicable failure classes include:

| Failure | Required question |
|---|---|
| Process crash | Does the system recover correctly? |
| Node unavailable | Does routing/failover remain correct? |
| Network timeout | Is retry safe? |
| Network partition | Is consistency behavior correct? |
| Delayed response | Is ordering protected? |
| Out-of-order response | Can stale work overwrite current state? |
| Duplicate request | Is the effect idempotent? |
| Partial write | Is state atomic/recoverable? |
| Storage failure | Is corruption prevented and detected? |
| Restart | Is durable state restored? |
| Disk/resource exhaustion | Does the system fail safely? |
| Interrupted state transition | Can the transition recover? |

The exact matrix MUST be tailored to the Worker.

The agent MUST record which failures were actually injected. “Failure tested” without a concrete failure case is insufficient evidence.

---

# 8. V07 — Performance Baseline and Regression Threshold

Every performance-critical Worker MUST establish a baseline before release.

The comparison model is:

```text
BASELINE
   ↓
CURRENT
   ↓
COMPARE
   ↓
THRESHOLD
   ↓
PASS / FAIL
```

Metrics SHOULD include where applicable:

- throughput
- P50 latency
- P95 latency
- P99 latency
- CPU
- memory
- network
- storage I/O
- queue depth
- error/retry rate

Thresholds MUST be explicit for the Worker. A benchmark command returning successfully is not itself a performance PASS.

A meaningful regression beyond the approved threshold means `FAILED` until explained and accepted through the proper change process.

Performance measurements MUST record environment and workload so that comparisons are interpretable.

---

# 9. V08 — Mutation Testing and Clean-Room Verification

## 9.1 Mutation testing

For critical test suites, the project SHOULD intentionally introduce controlled mutations such as:

```text
boundary condition inversion
removed validation
altered shard calculation
changed retry behavior
removed idempotency check
modified comparison operator
```

The test suite should fail when a meaningful mutation is introduced.

If a critical mutation survives, the test suite is considered insufficient for that behavior and SHOULD be strengthened before Worker release.

Mutation testing MUST NOT modify the authoritative production branch as a permanent change.

## 9.2 Clean-room verification

The coding agent MUST NOT be the sole authority for PASS.

The independent verifier SHOULD receive:

```text
Frozen contract
Actual repository state
Actual diff
Verification commands/results
Runtime evidence
```

It SHOULD NOT rely on the coding agent's conclusion as evidence of correctness.

The verifier MUST independently determine:

```text
PASS
FAIL
UNKNOWN
```

A statement such as “all tests pass” is evidence, not a conclusion.

---

# 10. Risk-Based Verification Priority

Verification depth MUST follow risk.

### CRITICAL

- shard ownership
- data movement
- WAL
- persistence
- recovery
- consistency
- distributed coordination
- concurrency state
- security boundaries

Required: invariants + state machine where applicable + failure + regression + independent verification; property/concurrency/oracle testing SHOULD be used.

### HIGH

- query planning/execution
- cache invalidation
- idempotency
- retry
- backpressure
- serialization

Required: targeted contract tests plus applicable property/concurrency/failure verification.

### NORMAL

- configuration
- observability
- non-critical helpers

Use proportionate tests; do not create unnecessary verification infrastructure.

---

# 11. Diff Risk Classification

Every Worker MUST classify the final diff.

```text
LOW
MEDIUM
HIGH
CRITICAL
```

### LOW

Documentation, tests, non-runtime tooling.

### MEDIUM

Internal implementation with no public/state/recovery impact.

### HIGH

Public API, serialization, routing, concurrency, cache semantics, write semantics.

### CRITICAL

Data ownership, consistency, WAL, persistence, recovery, migration, distributed coordination, security boundary.

A HIGH or CRITICAL change requires explicit verification of the affected contract even if the code change is small.

A small diff is not automatically a low-risk diff.

---

# 12. Defect and Rework Control

When a verification layer fails:

```text
FAIL
 ↓
Reproduce
 ↓
Identify violated invariant/transition/contract
 ↓
Root cause
 ↓
Minimal correct fix
 ↓
Regression test
 ↓
Affected verification
 ↓
Full Worker verification
 ↓
Independent verification
```

The agent MUST NOT stack patches merely to make the latest test pass.

Three or more corrective changes in the same logic area SHOULD trigger explicit architecture reassessment.

If the implementation can no longer be explained simply, STOP and return to design review.

---

# 13. Test Independence Rules

Tests MUST NOT be designed merely to mirror implementation branches.

Avoid:

```text
implementation condition
      ↓
identical test condition
      ↓
PASS
```

Prefer:

```text
contract/invariant
      ↓
independent expected behavior
      ↓
implementation
      ↓
compare
```

Tests MUST NOT be weakened to accommodate an incorrect implementation.

---

# 14. Evidence Requirements

Every applicable verification layer MUST record:

```text
Layer ID
Risk level
Command / procedure
Environment
Input/workload
Expected result
Observed result
PASS / FAIL / UNKNOWN
Evidence location
```

For randomized tests record the seed where possible.

For benchmarks record workload and environment.

For fault injection record the injected failure and recovery observation.

For independent verification record the verifier's independent conclusion.

---

# 15. Worker PASS Rule

A Worker may become `CAPABILITY_PASS` only when:

```text
Contract PASS
AND
Invariant PASS
AND
State Machine PASS where applicable
AND
Targeted Tests PASS
AND
Property/Fuzz PASS where applicable
AND
Concurrency PASS where applicable
AND
Independent Oracle PASS where applicable
AND
Build PASS
AND
Runtime PASS
AND
Real Request PASS
AND
Fault/Recovery PASS where applicable
AND
Security PASS where applicable
AND
Performance PASS where applicable
AND
Regression PASS
AND
Independent Verification PASS
AND
Evidence COMPLETE
```

`UNKNOWN` cannot satisfy an AND condition.

---

# 16. Anti-False-PASS Rules

The following are prohibited:

- changing expected behavior only to make a test pass
- deleting a failing test without a contract change
- weakening assertions without documented reason
- increasing timeouts until failures disappear without root-cause analysis
- marking skipped tests as PASS
- claiming runtime verification from unit tests
- claiming performance PASS from benchmark execution alone
- claiming recovery PASS without restart/failure evidence
- claiming concurrency PASS from a single happy-path run
- claiming data integrity from API success responses alone
- using the same faulty algorithm as both implementation and oracle
- treating AI self-review as independent verification

---

# 17. Final Rule

> **D1-Fabric does not attempt to make AI infallible. It makes AI defects difficult to escape.**

The system is designed so that:

```text
AI mistake
   ↓
Targeted test
   ↓
Invariant / property / concurrency / fault verification
   ↓
Regression
   ↓
Independent verification
   ↓
BLOCK
```

rather than:

```text
AI mistake
 ↓
Test happens to pass
 ↓
Commit
 ↓
Next Worker
 ↓
Defect propagation
```

**No Worker may advance merely because the coding agent says it is complete. Evidence and independent verification determine PASS.**
