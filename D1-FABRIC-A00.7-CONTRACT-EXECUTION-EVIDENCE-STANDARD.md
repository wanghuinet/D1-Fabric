# D1-Fabric A00.7 Contract Execution & Evidence Standard

**Status:** ACTIVE ENGINEERING STANDARD  
**Scope:** D1-Fabric 1.0+  
**Position:** A00.7, subordinate to the Constitution and architecture/platform contracts; complementary to A00.6  
**Primary objective:** Convert an approved engineering contract into the smallest correct implementation without allowing AI agents to silently redesign architecture or invent correctness-critical behavior.

## 1. Purpose

A00.6 defines what a good engineering contract must contain. A00.7 defines how an AI implementation agent SHALL execute that contract.

The objective is not to make AI agents think more. The objective is to remove unnecessary architectural reasoning from implementation time while preserving correctness.

The governing flow is:

```text
Authoritative Contract
        ↓
Execution Packet
        ↓
Frozen Scope / Change Manifest
        ↓
Implementation
        ↓
Targeted Verification
        ↓
Full Verification
        ↓
Evidence
        ↓
Capability Status
```

An AI agent SHALL implement an approved contract; it SHALL NOT silently replace the contract with a different architecture.

## 2. Authority and Precedence

The repository remains the engineering source of truth.

Authority order is:

```text
Constitution
  ↓
Architecture / Platform Contract
  ↓
Capability Contract
  ↓
ADR / Approved Decision
  ↓
Execution Packet / Change Manifest
  ↓
Implementation
  ↓
Verification / Evidence
```

Chat history, unstated assumptions, model preference, code style preference, or inferred future requirements SHALL NOT override an authoritative repository contract.

If implementation conflicts with an authoritative contract, the conflict SHALL be surfaced. The agent SHALL NOT rewrite the contract merely to make existing code appear compliant.

## 3. Architecture Decision vs Implementation Choice

Every material decision SHALL be classified as one of two categories.

### 3.1 Architecture Decision

An architecture decision is frozen when it affects correctness, interoperability, state ownership, routing, consistency, failure/recovery, resource bounds, security, physical distribution, or public protocol.

Examples:

```text
Shard ownership model
Routing epoch semantics
Authoritative state owner
Hot-path D1 I/O budget
Retry/idempotency contract
Consistency guarantee
Cross-shard fan-out limit
Migration fencing
Worker boundary
Public interface
```

Once frozen, the implementation agent MUST NOT change it without an explicit contract/ADR change.

### 3.2 Implementation Choice

An implementation choice is an internal mechanism that satisfies the frozen contract without changing observable guarantees.

Examples may include:

```text
private helper naming
local function decomposition
internal data structure where contract is preserved
loop vs equivalent direct iteration
small private utility extraction
```

Implementation agents MAY choose the simplest correct implementation for these details.

This distinction prevents two opposite failures:

```text
Under-specification → AI invents architecture
Over-specification → AI wastes effort designing trivial internals
```

## 4. Execution Packet

Every non-trivial capability SHALL have an Execution Packet before implementation.

The packet SHALL contain only information required to execute the frozen capability safely:

```text
CAPABILITY_ID
REQUIREMENT_IDS
CONTRACT_VERSION
SCOPE
NON-GOALS
ARCHITECTURE_DECISIONS
INPUTS / OUTPUTS
STATE OWNERS
INVARIANTS
HOT PATH
CONTROL / COLD PATH
CONCURRENCY RULES
FAILURE / RECOVERY RULES
RETRY / IDEMPOTENCY RULES
TIMEOUT / CANCELLATION RULES
BACKPRESSURE / OVERLOAD RULES
D1 I/O BUDGET
FAN-OUT BUDGET
COMPLEXITY BUDGET
ALLOWED FILES
FORBIDDEN CHANGES
VERIFICATION TARGETS
EVIDENCE TARGETS
DISTRIBUTION CLASSIFICATION
```

The Execution Packet SHALL reference authoritative contracts rather than duplicate their full text.

## 5. Implementation Freeze

Before code changes begin, the agent SHALL establish:

```text
CONTRACT_RESOLVED
SCOPE_FROZEN
DEPENDENCIES_VERIFIED
STATE_OWNERSHIP_RESOLVED
ARCHITECTURE_DECISIONS_FROZEN
INVARIANTS_RESOLVED
RESOURCE_BUDGETS_RESOLVED
CHANGE_MANIFEST_FROZEN
```

After this point:

- unrelated refactoring is prohibited;
- new public interfaces require an explicit decision;
- new persistent state requires ownership review;
- new D1 operations require budget review;
- new retry paths require idempotency review;
- new queues require backpressure review;
- new network hops require hot-path review;
- new Worker boundaries require architecture evidence;
- new dependencies require license and complexity review.

## 6. Missing Information Rule

Not every unknown requires a STOP.

The agent SHALL classify missing information as follows:

### BLOCKING_UNKNOWN

Missing information can change correctness, compatibility, ownership, security, resource bounds, failure semantics, or architecture.

Action: STOP and resolve through the authoritative contract/ADR.

### NON_BLOCKING_UNKNOWN

Missing information affects only an internal implementation choice while the contract remains fully satisfied.

Action: choose the smallest conventional implementation and record the choice if material.

This rule exists specifically to prevent unnecessary AI overthinking.

## 7. No Silent Architecture Improvement

An AI agent MUST NOT change an approved design because another design appears:

- more elegant;
- more abstract;
- more future-proof;
- more scalable in theory;
- more familiar to the model;
- closer to another database system;
- more enterprise-like;
- more configurable.

A proposed improvement belongs in an ADR or contract change, not inside an unrelated implementation task.

An implementation agent SHALL optimize **within** the contract, not optimize **the contract** during coding.

## 8. Smallest Correct Implementation Rule

The implementation SHALL minimize:

```text
files
public interfaces
state objects
dependencies
network hops
D1 operations
retry paths
queues
concurrency mechanisms
execution paths
serialization
```

No abstraction is justified solely because it may be useful later.

A new abstraction SHALL have a current requirement, invariant, measurable benefit, or real ownership/scaling/security/failure boundary.

When two implementations satisfy the same contract, prefer the one with lower complexity and fewer runtime operations.

## 9. D1-Fabric Hot-Path Rule

The normal data-plane path SHOULD remain structurally close to:

```text
Request
  ↓
Local routing snapshot
  ↓
Cache
  ↓
Query / Write
  ↓
Target shard
  ↓
Response
```

The implementation SHALL NOT introduce mandatory control-plane reads, unbounded fan-out, unbounded retries, or unbounded queues into the normal path.

Every request path SHALL have a finite resource envelope.

Hard budget violations SHALL result in defined bounded behavior such as reject, shed, degrade, or bounded partial execution.

## 10. Verification-First Implementation

The agent SHALL identify verification targets before implementation, not after it.

At minimum, applicable behavior SHALL map to:

```text
Normal
Boundary
Invalid
Duplicate
Retry
Timeout / Cancellation
Concurrency / Race
Partial Failure
Overload / Backpressure
Resource Exhaustion
Restart / Recovery
Hot Key / Hot Shard / Skew
Security
Performance / Regression
```

Verification SHALL test the contract, not merely reproduce the implementation.

## 11. Evidence Levels

Evidence SHALL be classified by strength.

```text
E0  Declaration / design statement
E1  Static inspection / type or lint validation
E2  Unit verification
E3  Integration verification
E4  Build + runtime verification
E5  Real request / end-to-end verification
E6  Concurrency + failure + recovery verification
E7  Performance / load / soak / scale verification
E8  Independent verification / release-grade proof
```

Minimum evidence expectations:

| Claim | Minimum Evidence |
|---|---|
| Internal behavior | E2 |
| Cross-component correctness | E3 |
| Runnable capability | E4 |
| Real request behavior | E5 |
| Concurrency / failure / recovery | E6 |
| Performance / scale claim | E7 |
| Critical release or architecture claim | E8 where applicable |

Higher evidence does not replace lower-level tests; applicable layers remain required.

## 12. Proof Debt

Every material requirement or invariant without sufficient evidence creates `PROOF_DEBT`.

Proof debt SHALL be explicit:

```text
PROOF_DEBT_ID
REQUIREMENT / INVARIANT
MISSING_EVIDENCE_LEVEL
REASON
OWNER
BLOCKING_STATUS
```

Proof debt affecting correctness, safety, recovery, security, bounded resource behavior, or a release-critical claim SHALL block the required PASS state.

Unknown evidence SHALL never be converted into PASS through narrative wording.

## 13. Architecture Drift Detection

Before completion, compare the implementation against the approved architecture baseline.

At minimum review changes to:

```text
Worker count / boundaries
Network hops
D1 reads / writes
Fan-out
Retry attempts
Queue mechanisms
Mutable state
State owners
Routing / epoch semantics
Public interfaces
Dependencies
Persistent schema
Cache authority
Failure paths
```

Any material difference SHALL be classified as:

```text
INTENTIONAL_CHANGE
CONTRACT_DRIFT
IMPLEMENTATION_DETAIL
UNKNOWN
```

`CONTRACT_DRIFT` and unresolved `UNKNOWN` SHALL block the required capability status.

## 14. Change Manifest Enforcement

The implementation SHALL remain inside the approved Change Manifest.

If a new file or behavior becomes necessary:

```text
Stop
 ↓
Explain why
 ↓
Determine whether contract changes
 ↓
Update decision/manifest if approved
 ↓
Resume
```

The agent SHALL NOT silently expand scope merely because the repository structure makes expansion convenient.

## 15. Retry and Failure Safety

Before adding or modifying retry behavior, the agent SHALL establish:

```text
What operation is retried?
Why is it safe to retry?
What is the idempotency key / deduplication rule?
Maximum attempts?
Backoff?
Jitter where applicable?
What happens under overload?
What happens after timeout but before result visibility?
```

Retries SHALL NOT create an unbounded amplification loop.

Timeout SHALL NOT be treated as proof that the underlying operation did not execute.

## 16. Concurrency Safety

For every shared or mutable state, verification SHALL identify:

```text
Owner
Readers
Writers
Atomicity requirement
Ordering requirement
Race scenario
Conflict resolution
Recovery behavior
```

If a race can violate an invariant, the race SHALL have an explicit test or formal reasoning sufficient to establish the guarantee.

## 17. Completion Gate

A capability SHALL progress only through explicit states:

```text
UNKNOWN
READY
IN_PROGRESS
LOCAL_PASS
CONTRACT_PASS
INTEGRATION_PASS
REGRESSION_PASS
CAPABILITY_PASS
RELEASE_READY
RELEASED
ROLLED_BACK
FAILED
BLOCKED
```

`CAPABILITY_PASS` requires:

```text
Contract satisfied
+ Invariants verified
+ Change Manifest satisfied
+ Applicable verification complete
+ Required evidence complete
+ No unresolved architecture drift
+ No blocking proof debt
```

A dependent capability SHALL NOT be promoted when a required upstream capability remains below its required PASS state.

## 18. AI Anti-Overthinking Rule

The implementation agent SHALL spend reasoning effort in this order:

```text
1. Resolve contract
2. Resolve correctness-critical ambiguity
3. Resolve state ownership
4. Resolve resource bounds
5. Implement smallest complete path
6. Verify
7. Stop
```

The agent SHALL NOT spend implementation time repeatedly reconsidering already-approved architecture.

The following are not valid reasons to reopen a frozen decision:

```text
"another design may be better"
"this is more scalable"
"this is more generic"
"this may be useful later"
"this abstraction is cleaner"
```

A better design may be proposed separately, but the current task SHALL finish against the approved contract unless explicitly redirected.

## 19. Evidence Record Minimum

A durable evidence record SHALL identify, where applicable:

```text
CAPABILITY_ID
CONTRACT_VERSION
COMMIT_SHA
CHANGE_MANIFEST
CHANGED_FILES
TEST_COMMANDS
TEST_RESULTS
RUNTIME / CONFIGURATION
REAL_REQUEST_RESULT
CONCURRENCY_RESULT
FAILURE / RECOVERY_RESULT
D1_READS
D1_WRITES
FAN_OUT
RETRY_AMPLIFICATION
QUEUE_PEAK
CACHE_HIT / D1_READ_AVOIDANCE
PERFORMANCE_RESULTS
LIMITATIONS
PROOF_DEBT
FINAL_STATUS
```

Evidence SHALL be reproducible enough for an independent engineer to challenge the claim without chat history.

## 20. Final Principle

D1-Fabric SHALL not ask an AI agent to repeatedly rediscover architecture.

The repository contract decides **what must be true**.

The implementation agent decides **the simplest way to make it true** where the contract leaves internal freedom.

Verification decides **whether it is actually true**.

Therefore:

> Freeze architecture before coding. Allow freedom only inside the contract. Make every important guarantee testable. Minimize implementation complexity. Never confuse AI reasoning with engineering evidence.
