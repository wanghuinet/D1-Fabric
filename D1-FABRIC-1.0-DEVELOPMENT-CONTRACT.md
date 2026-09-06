# D1-Fabric 1.0 Development Contract

**Project:** D1-Fabric  
**Release Target:** D1-Fabric 1.0  
**Protocol Version:** 1.1  
**Status:** MANDATORY  
**Authority:** D1-Fabric Engineering Constitution v3.0  
**Primary Coding Agent:** DeepSeek or equivalent autonomous coding agent  
**Engineering Goal:** Minimum complete production-capable distributed data infrastructure, maximum first-pass correctness, minimum unnecessary code, minimum rework.

---

## 0. Purpose

D1-Fabric 1.0 is the first complete core distributed-data-infrastructure release.

The development objective is **not** to make the AI type code as quickly as possible. The objective is to make the **correct implementation on the first coherent implementation pass**, then prove it through deterministic verification.

> **Target: one complete implementation pass per Worker, zero unresolved defects at Worker release, no defect propagation, no uncontrolled scope expansion, and approximately 30% of the previous development-cycle duration through process efficiency rather than skipped engineering controls.**

Absolute mathematical zero-bug guarantees are impossible. Therefore, this contract defines a stronger practical requirement: **defects discovered during development must be contained, root-caused, regression-tested, and closed before the Worker can pass.**

---

# 1. 1.0 Scope Freeze

D1-Fabric 1.0 contains the approved A01-A07 core capability chain only:

```text
A00 Constitution
    ↓
A01 Foundation / Architecture
    ↓
A02 Shard Engine
    ↓
A03 Query Engine
    ↓
A04 Cache Layer
    ↓
A05 Write Engine
    ↓
A06 Storage Engine
    ↓
A07 Control / Cluster
    ↓
W07 Integration / Verification
    ↓
D1-Fabric 1.0
```

### 1.1 In scope

The 1.0 core includes, where defined by the approved architecture:

- runtime and common infrastructure
- shard map and shard routing
- shard split, move and rebalance
- distributed and multi-shard query
- query planning and execution
- cache, TTL, eviction and invalidation
- write batching, WAL, idempotency and backpressure
- persistence and recovery
- node health and cluster/control state
- failure handling
- observability
- benchmark and regression verification

### 1.2 Out of scope

A08 and later capabilities are **strictly excluded** from 1.0 unless an explicit scope-change decision is recorded.

A future capability MUST NOT be introduced indirectly through:

- speculative interfaces
- placeholder modules
- future-proof abstractions
- hidden dependencies
- compatibility shims without current consumers
- unrelated refactors
- “while we are here” feature additions

If a future feature is discovered to be necessary for an A01-A07 contract, STOP and raise a design/change decision. Do not silently implement it.

---

# 2. Development Unit: Worker

The primary AI development unit is the **Worker**, representing a complete capability boundary.

| Worker | Capability | Responsibility |
|---|---|---|
| W01 | Foundation | Runtime, API, data model, errors, config, observability, test harness |
| W02 | Shard | Shard map, routing, split, move, rebalance, ownership |
| W03 | Query | Parse, plan, route, execute, parallelism, merge, pagination |
| W04 | Cache | Get/set, TTL, eviction, invalidation, hot-key and stampede protection |
| W05 | Write | Batch, WAL, idempotency, deduplication, retry, backpressure, flush |
| W06 | Storage + Control | Persistence, recovery, node health, membership, cluster state |
| W07 | Integration / Verification | E2E, failure, recovery, security, benchmark, regression, independent verification, release evidence |

A Worker may contain internal implementation steps. Internal steps are **not independent release gates**.

Correct:

```text
Worker
  → design
  → implementation
  → targeted verification
  → full Worker verification
  → CAPABILITY_PASS
```

Forbidden:

```text
A02.1 → approval
A02.2 → approval
A02.3 → approval
...
```

unless a genuine architecture boundary requires a separate decision.

---

# 3. Mandatory Worker Entry Protocol

Before editing code, the Coding Agent MUST complete the following in order.

## 3.1 Read authoritative context

Read:

1. `D1-FABRIC-ENGINEERING-CONSTITUTION-V3.0.md`
2. this Development Contract
3. current architecture/design documents relevant to the Worker
4. current Worker status/evidence
5. immediately preceding Worker interfaces and tests
6. actual repository source relevant to the change

The repository is the source of truth for current implementation state. The AI MUST NOT infer code that it has not inspected when correctness depends on that code.

## 3.2 Build a dependency map

Before editing, identify:

```text
Inputs
 ↓
Existing primitives
 ↓
Current interfaces
 ↓
State ownership
 ↓
Concurrency boundaries
 ↓
Persistence boundaries
 ↓
Outputs
 ↓
Tests
```

The agent MUST identify which existing implementation is authoritative before creating a new one.

## 3.3 Produce a Change Manifest

Before implementation, the agent MUST internally establish a concise manifest containing:

- files to add
- files to modify
- files to delete, if any
- public/internal interfaces affected
- state affected
- data flow
- concurrency assumptions
- failure modes
- test cases
- non-goals
- known risks

The manifest is a planning control, not permission to expand scope.

## 3.4 Ambiguity rule

If an ambiguity can materially change correctness, data integrity, API compatibility, concurrency safety, recovery behavior, or security:

> **STOP. Resolve the contract before coding.**

The agent MUST NOT guess and patch later.

---

# 4. Contract Freeze Before Coding

Every Worker MUST freeze its local implementation contract before substantial code changes.

At minimum define:

### Inputs
- accepted inputs
- invalid inputs
- empty/null behavior
- size/range limits

### Outputs
- success result
- error result
- ordering guarantees
- consistency guarantees

### State
- authoritative owner
- mutable state
- lifecycle
- persistence requirement
- restart behavior

### Concurrency
- synchronization boundary
- atomic operations
- duplicate request behavior
- retry behavior
- race-sensitive state

### Failure
- timeout
- cancellation
- node failure
- storage failure
- partial failure
- recovery path

### Performance
- expected complexity
- concurrency expectations
- hot path
- memory/resource constraints

### Security
- trust boundary
- validation
- authorization boundary where applicable
- data exposure risks

### Observability
- required logs
- metrics
- error identity
- trace/context requirements where applicable

### Tests
The agent MUST define the test cases before declaring implementation complete.

No silent contract changes are permitted after implementation begins. If the contract must change, return to design review.

---

# 5. DeepSeek One-Pass Implementation Protocol

DeepSeek should be used as an **autonomous engineering agent**, not as a line-by-line code generator.

The preferred operating pattern is:

```text
UNDERSTAND
  ↓
DESIGN
  ↓
CONTRACT FREEZE
  ↓
CHANGE MANIFEST
  ↓
IMPLEMENT COMPLETE PATH
  ↓
TARGETED TEST
  ↓
FULL WORKER TEST
  ↓
BUILD
  ↓
RUN
  ↓
REAL REQUEST
  ↓
FAILURE / RECOVERY
  ↓
SELF REVIEW
  ↓
INDEPENDENT VERIFICATION
```

## 5.1 Complete implementation requirement

The agent MUST implement a coherent complete production path in one implementation pass.

It MUST NOT intentionally leave:

- TODO production logic
- FIXME production logic
- empty handlers
- fake success
- hard-coded test behavior
- unreachable “future” branches
- placeholder storage
- placeholder routing
- disabled validation
- mocked production dependencies

## 5.2 Do not patch before understanding

When a test fails, the agent MUST NOT immediately add a patch.

First determine:

```text
Failure
 ↓
Reproduce
 ↓
Locate violated invariant/contract
 ↓
Find root cause
 ↓
Choose smallest correct fix
 ↓
Add regression test
 ↓
Re-run affected tests
 ↓
Re-run Worker gate
```

## 5.3 Architecture failure rule

If repeated fixes reveal that the design itself is wrong, STOP patching.

Return to:

```text
Failure
 ↓
Architecture Review
 ↓
Contract Revision
 ↓
Clean Implementation
```

Do not accumulate compatibility hacks around a fundamentally incorrect design.

---

# 6. Code Minimization Contract

The target is **Minimum Complete Implementation**, not minimum LOC.

Optimize for:

```text
Minimum Correct Code
+
Minimum Necessary Abstractions
+
Minimum Necessary State
+
Minimum Necessary Dependencies
+
Minimum Necessary Network Hops
+
Minimum Duplicate Execution Paths
```

## 6.1 Mandatory simplicity rules

MUST:

- reuse existing correct primitives
- keep one authoritative state owner
- keep one primary execution path where possible
- share validation/error/timeout/observability infrastructure
- prefer direct implementations when only one implementation exists
- add abstraction only when a real boundary requires it

MUST NOT:

- create speculative factories
- create unused providers
- create unused strategy interfaces
- duplicate storage/query/write paths
- duplicate state merely for convenience
- add dependencies for trivial functionality already available
- create wrappers with no real behavior
- introduce serialization/network hops without a concrete reason
- perform unrelated refactoring

Example of prohibited speculative architecture:

```text
IStorage
StorageFactory
StorageProvider
StorageAdapter
DefaultStorage
```

when the system has only one actual storage implementation and no current boundary requires these layers.

Prefer the smallest correct direct implementation until a real architectural boundary exists.

---

# 7. Change Boundary and Anti-Drift Rules

The agent MUST modify only files necessary for the frozen Worker contract.

### Forbidden without explicit approval

- changing completed Worker APIs for style reasons
- replacing a working implementation with a preferred personal design
- renaming large groups of files
- changing toolchain versions
- adding major dependencies
- broad formatting migrations
- unrelated cleanup
- implementing A08+ features
- rewriting passed modules without evidence of a defect

### Existing correct code rule

> **If existing code satisfies the frozen contract and verification, do not modify it.**

Correctness outranks architectural aesthetics.

### Scope drift detector

Before final verification the agent MUST compare the actual diff against the Change Manifest.

Any unexplained changed file or behavior is a STOP condition.

---

# 8. First-Pass Correctness Checklist

Before declaring a Worker implementation complete, DeepSeek MUST review the implementation against all applicable cases:

```text
Normal path
Boundary values
Empty input
Null / undefined
Invalid input
Duplicate request
Retry
Timeout
Cancellation
Concurrent requests
Race conditions
Partial failure
Node failure
Storage failure
Restart
Recovery
Idempotency
Resource exhaustion
Large input
Hot key / hot shard where applicable
Ordering
Consistency
Compatibility
Observability
Security
Performance
Cleanup / lifecycle
```

The checklist is a reasoning gate. A test that cannot exercise a meaningful case must not be falsely reported as proof of that case.

---

# 9. Verification Must Be Layered

A Worker is not complete because unit tests pass.

Verification MUST progress through the applicable layers:

```text
Type Check
 ↓
Targeted Unit Tests
 ↓
Worker Unit/Integration Tests
 ↓
Build
 ↓
Start Real Runtime
 ↓
Health
 ↓
Readiness
 ↓
Real Request
 ↓
Failure Test
 ↓
Recovery Test
 ↓
Security Test
 ↓
Performance Test
 ↓
Full Regression
 ↓
Independent Verification
```

A skipped layer is `UNKNOWN`, not `PASS`.

---

# 10. Real Runtime Requirement

Every completed capability MUST be exercised in the real application runtime where technically applicable.

Minimum proof:

```text
Build succeeds
AND
Process starts
AND
Health succeeds
AND
Readiness succeeds
AND
Real request succeeds
AND
Expected state/result is observed
```

Mocks may support unit tests but MUST NOT replace real runtime verification for the final capability gate.

---

# 11. Failure and Recovery Requirement

Distributed infrastructure is incomplete if only the happy path works.

Each Worker MUST test applicable failures, including:

- timeout
- retry
- duplicate request
- unavailable node
- partial shard failure
- storage failure
- process restart
- recovery after restart
- resource pressure
- concurrent mutation

The exact failure matrix is capability-specific. The agent MUST not claim “failure tested” without identifying what was actually exercised.

---

# 12. Test Design Rules

Tests MUST validate behavior and contracts, not implementation trivia.

Prefer tests that prove:

- invariants
- state transitions
- data correctness
- error semantics
- idempotency
- concurrency safety
- recovery
- compatibility
- performance boundaries

For each defect found, add or strengthen a regression test so that the same class of failure cannot silently return.

Tests MUST NOT be weakened, deleted, or made less strict solely to obtain PASS.

---

# 13. Defect Closure Protocol

Any defect discovered before Worker release means:

```text
WORKER = FAILED
```

The required closure sequence is:

```text
1. Record failure
2. Reproduce deterministically where possible
3. Identify root cause
4. Identify violated contract/invariant
5. Make minimal correct change
6. Add regression coverage
7. Run targeted verification
8. Run full Worker verification
9. Run independent verification
10. Update evidence
```

A defect is NOT closed because:

- the test was deleted
- the assertion was weakened
- the failure was ignored
- the failure became flaky
- a retry happened to pass once
- the expected behavior was silently changed

---

# 14. No Patch Piling

If the same area requires repeated corrective patches, the agent MUST assess whether the root problem is architectural.

Strong STOP signals include:

- repeated fixes for the same invariant
- conflicting state ownership
- duplicate execution paths created during repair
- increasing special cases
- growing compatibility branches
- tests that pass only under artificial ordering
- inability to explain why the implementation is correct

When a STOP signal occurs, prefer a clean root-cause correction over another patch.

---

# 15. Worker Integration Rule

Workers are integrated sequentially against the real current baseline:

```text
W01 PASS
 ↓
W02 PASS
 ↓
W03 PASS
 ↓
W04 PASS
 ↓
W05 PASS
 ↓
W06 PASS
 ↓
W07 FINAL VERIFICATION
```

Each Worker MUST verify compatibility with the preceding system rather than only against isolated mocks.

After a Worker passes, the implementation MUST be committed with its evidence before moving to the next Worker.

No known defect may be knowingly carried into the next Worker.

---

# 16. Independent Verification

The Coding Agent and the final verifier MUST be treated as separate reasoning roles.

The Coding Agent may perform self-review, but self-review does not equal independent verification.

Independent verification SHOULD use:

- a fresh context
- the frozen contract
- the actual diff
- the actual repository state
- deterministic test commands
- runtime evidence

The verifier MUST challenge assumptions rather than merely repeat the coding agent's conclusion.

---

# 17. Evidence Contract

Every Worker PASS MUST leave durable evidence containing at least:

```text
Worker ID
Contract/version
Commit SHA
Changed files
Change summary
Tests executed
Test results
Type check result
Build result
Runtime result
Real request result
Failure/recovery result
Security result
Performance result
Regression result
Independent verification result
Known limitations
Final status
```

Evidence MUST distinguish:

```text
PASS
FAIL
NOT TESTED
NOT RUN
SKIPPED
UNKNOWN
```

`UNKNOWN` MUST NEVER be converted to `PASS` by assumption.

---

# 18. AI Stop Conditions

The Coding Agent MUST STOP and request/perform explicit resolution when any of the following occurs:

- contract ambiguity affecting correctness
- conflicting architecture documents
- missing required dependency
- unexpected production code outside the planned boundary
- unexplained API incompatibility
- data migration risk
- security issue
- inability to reproduce a critical failure
- repeated failed repairs
- P0/P1 defect
- loss of authoritative state ownership
- inability to prove a release criterion
- unexplained diff growth

STOP means **do not continue generating speculative code**.

---

# 19. Efficiency Protocol: How to Reach ~30% Cycle Time

The target cycle-time reduction MUST come from eliminating waste.

Primary sources of efficiency:

```text
One Worker Context
+
One Frozen Contract
+
One Change Manifest
+
One Coherent Implementation Pass
+
Immediate Targeted Verification
+
One Full Worker Verification
+
Automated Evidence
+
Minimal Abstraction
+
Minimal Dependencies
+
No Repeated Context Reconstruction
```

Do NOT obtain speed by removing:

- build verification
- runtime verification
- real requests
- failure/recovery testing
- security verification
- performance verification
- regression
- independent verification
- evidence

The intended improvement is **less rework**, not **less verification**.

---

# 20. Recommended DeepSeek Operating Prompt Structure

For each Worker, the controlling prompt should conceptually follow this structure:

```text
ROLE
You are the autonomous implementation engineer for D1-Fabric <Worker>.

AUTHORITY
Read and obey D1-FABRIC-ENGINEERING-CONSTITUTION-V3.0.md and this contract.

SCOPE
Implement only the frozen Worker capability.
Do not implement A08+.
Do not perform unrelated refactors.

BEFORE CODING
Inspect the repository.
Read the current architecture and preceding Worker interfaces.
Identify authoritative state and existing reusable primitives.
Produce the Change Manifest.
Freeze inputs, outputs, state, concurrency, failure, security,
performance, observability, and tests.

IMPLEMENTATION
Implement the Minimum Complete Implementation.
Use the smallest correct number of files, abstractions, dependencies,
and execution paths.
Do not leave production placeholders.

VERIFICATION
Run type check, targeted tests, Worker tests, build, runtime,
real requests, failure/recovery, security, performance and regression
checks as applicable.

FAILURE
Do not patch blindly.
Reproduce → root cause → minimal fix → regression test → full Worker gate.
If the design is wrong, stop patching and return to design review.

FINAL REVIEW
Compare actual diff against the Change Manifest.
Explain every changed file.
Confirm no scope drift.
Confirm no unresolved defects.

OUTPUT
Return implementation summary, verification evidence, limitations,
commit-ready state, and final Worker status.
```

This structure is mandatory in spirit even when the actual orchestration prompt is shorter.

---

# 21. Git / State Synchronization

AI development must leave the repository in a recoverable state.

After each Worker reaches PASS:

```text
Code
 ↓
Tests
 ↓
Evidence
 ↓
Status
 ↓
Git Commit
 ↓
Next Worker
```

The next session MUST be able to determine:

- what is complete
- what is not complete
- what commit is authoritative
- what tests passed
- what remains

Never rely on conversational memory as the sole project state.

---

# 22. Final Release Gate

D1-Fabric 1.0 is `RELEASE_READY` only when all of the following are true:

```text
W01 CAPABILITY_PASS
AND
W02 CAPABILITY_PASS
AND
W03 CAPABILITY_PASS
AND
W04 CAPABILITY_PASS
AND
W05 CAPABILITY_PASS
AND
W06 CAPABILITY_PASS
AND
W07 CAPABILITY_PASS
AND
Failure/Recovery PASS
AND
Security PASS
AND
Performance PASS
AND
Regression PASS
AND
Independent Verification PASS
AND
Evidence COMPLETE
```

No unresolved P0/P1/P2 defect may remain without an explicit approved exception. Exceptions MUST NOT be used to hide incomplete core functionality.

A08+ is not required for 1.0.

---

# 23. Final Engineering Rule

> **One Worker, one frozen contract, one coherent implementation, one complete verification cycle.**
>
> **Do not write speculative code. Do not guess at ambiguous contracts. Do not patch blindly. Do not propagate defects. Do not expand scope. Do not trade verification for speed.**
>
> **Use DeepSeek's strength for repository comprehension, dependency analysis, implementation, test generation, static reasoning, failure analysis and evidence production—but keep the final PASS independent and evidence-based.**

The desired engineering result is:

```text
Less fragmentation
      ↓
Better context retention
      ↓
Better design before coding
      ↓
First-pass correct implementation
      ↓
Less patch piling
      ↓
Less rework
      ↓
Less code
      ↓
Same or stronger verification
      ↓
Faster D1-Fabric 1.0
```

**This contract is mandatory for D1-Fabric 1.0 development.**
