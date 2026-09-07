# D1-Fabric 1.0 Development and AI Engineering Contract

**Status:** CONTRACT BASELINE
**Version:** 1.0
**Authority:** D1-Fabric 1.0 Contract Baseline + AGENTS.md

## 1. Purpose

This contract defines how implementation agents, including DeepSeek and other AI coding agents, MUST convert the frozen 1.0 architecture into the smallest correct, verifiable, production-capable implementation.

Core law:

> **Implement the contract; do not redesign the contract while coding.**

The objective is minimum correct code, maximum capability density, deterministic behavior, reproducible verification, and near-zero avoidable rework.

## 2. Source of Truth

Implementation authority is, in order:

```text
1. D1-FABRIC-1.0-CONTRACT-BASELINE.md
2. Individual 1.0 Contracts
3. AGENTS.md
4. Existing verified implementation
5. Implementation notes / task packet
6. Chat discussion
```

Chat history MUST NOT override repository contracts.

## 3. Contract-First Development

Before changing code, the agent MUST identify:

```text
capability
applicable contracts
required invariants
state touched
state owner
hot path / control path
resource budgets
security boundary
failure behavior
recovery behavior
compatibility impact
verification requirements
```

If any item is materially unknown, implementation MUST stop at that boundary rather than inventing architecture.

## 4. Execution Packet

Every non-trivial implementation MUST begin from a compact Execution Packet containing:

```text
Capability ID
Goal
In scope
Out of scope
Applicable contracts
Acceptance criteria
State touched
Semantic owners
Change manifest
Resource budget
Security requirements
Failure/recovery requirements
Compatibility requirements
Verification plan
Evidence required
```

The packet MUST be small enough for an AI agent to hold as one coherent unit.

## 5. Frozen Change Manifest

Before coding, the agent MUST declare the expected change surface:

```text
files to add
files to modify
files to delete
schema changes
configuration changes
dependencies
public API changes
runtime behavior changes
verification artifacts
```

Unplanned architectural expansion is forbidden.

If implementation discovers a necessary change outside the manifest, the agent MUST classify it as:

```text
required correction
contract defect
implementation convenience
optional optimization
```

Only a required correction may be added automatically, and it MUST remain contract-compatible and be recorded in evidence.

## 6. Smallest Complete Implementation

The implementation MUST optimize for:

```text
minimum code
minimum abstractions
minimum state
minimum network hops
minimum D1 queries
minimum serialization
minimum Workers
minimum dependencies
maximum capability density
```

Small code is not a goal if it removes required correctness, security, recovery, observability, or verification behavior.

## 7. No Speculative Architecture

The agent MUST NOT add:

```text
Worker
Queue
Cache
Coordinator
Replica
Abstraction layer
Framework
Dependency
Background service
Persistent state
Retry layer
Generic plugin system
```

unless the change has a concrete requirement, invariant, real boundary, measurable benefit, and verification method.

## 8. Semantic Ownership

Each cross-cutting concern has one semantic owner.

```text
Architecture        → architecture contract
State/ownership     → Data & State
Execution           → Runtime Execution
Retry/recovery      → Reliability & Recovery
Security            → Security & Compatibility
Performance/cost    → Performance & Cost
AI authority        → AI Governance
```

Implementation modules may execute a concern but MUST NOT redefine its semantics.

## 9. Implementation Order

For a new capability, prefer:

```text
Contract
→ state model
→ invariants
→ pure deterministic logic
→ authoritative I/O boundary
→ failure paths
→ integration
→ observability
→ verification
```

Do not start with framework plumbing or abstractions.

## 10. Hot Path Discipline

Hot-path code MUST be deterministic and bounded.

The agent MUST minimize:

```text
D1 queries
cross-shard fan-out
serialization
allocation
network hops
locks/contention
retries
cache lookups
branching complexity
```

AI inference MUST NOT be a correctness dependency of the normal request path.

## 11. Resource Budget First

Every request path MUST have explicit or inherited bounds for:

```text
deadline
queries
rows read
rows written
shards
fan-out
parallelism
retries
payload
memory
queue work
```

An implementation without a bounded resource model is incomplete.

## 12. State Before Code

For every new persistent state element, the agent MUST answer:

```text
What is it?
Classification?
Who owns it?
Where is authoritative storage?
What epoch/version governs it?
How is it updated?
How is it recovered?
How is it migrated?
How is it invalidated?
```

No hidden persistent state is permitted.

## 13. Database Access Rule

D1 access MUST be explicit and measurable.

The implementation MUST know for each operation:

```text
query count
rows read
rows written
transaction boundary
index dependency
expected latency
retry behavior
```

Queries MUST be parameterized.

Unbounded production scans are forbidden on hot paths.

## 14. Write Path Rule

The preferred write sequence is:

```text
Authenticate
→ Authorize
→ Resolve tenant/scope
→ Route
→ Validate epoch/ownership
→ Check idempotency
→ Execute authoritative transaction
→ Commit
→ Update derived/cache state
```

No derived or cache update may become authoritative accidentally.

## 15. Read Path Rule

The preferred read sequence is:

```text
Authenticate
→ Authorize / public scope
→ Resolve consistency context
→ Route
→ Safe cache lookup if applicable
→ Authoritative read / permitted replica
→ Merge bounded results
```

Cache MUST NOT bypass security, tenant isolation, ownership, or consistency rules.

## 16. Cross-Shard Rule

Cross-shard execution MUST be explicit.

The implementation MUST declare:

```text
fan-out
parallelism
deadline
consistency
partial failure semantics
atomicity semantics
merge policy
```

A generic fan-out abstraction without bounded semantics is forbidden.

## 17. Retry Rule

Only one retry semantic may exist.

Every retryable mutation MUST have an idempotency identity.

The implementation MUST account for provider-level retries and MUST prevent retry multiplication.

A retry loop without an explicit attempt, deadline, and overload budget is a defect.

## 18. Error Handling

Errors MUST be classified according to the Reliability Contract.

The implementation MUST distinguish at least:

```text
invalid
unauthorized
forbidden
stale route/epoch
conflict
transient
permanent
timeout
partial failure
overloaded
recovery required
```

Human-readable messages MUST NOT become machine compatibility contracts.

## 19. Security Rule

Security checks MUST remain in the execution path even when an optimization appears to make them redundant.

The agent MUST NOT:

```text
trust client tenant_id
trust client shard_id
trust routing key as authorization
use cache as authorization
reuse idempotency as authorization
skip ownership checks after authentication
let AI bypass policy
```

Unknown security state MUST fail closed.

## 20. Routing / Epoch / Ownership Rule

The implementation MUST preserve this distinction:

```text
Authorization → may this actor perform the operation?
Routing       → where should the operation go?
Epoch         → is this routing/ownership view current?
Ownership     → is this target the authoritative writer?
```

No one of these checks substitutes for another.

## 21. Migration Rule

Migration code MUST implement the frozen ownership transition:

```text
Plan
→ Prepare
→ Copy
→ Verify
→ Fence
→ Commit Ownership
→ Advance Epoch
→ Serve
→ Retire Source
```

The implementation MUST persist enough state to resume or deterministically abort.

Copy completion MUST NOT be interpreted as ownership transfer.

## 22. Schema Change Rule

Schema changes MUST use:

```text
Expand
→ compatible readers
→ compatible writers
→ migrate/backfill
→ verify
→ switch
→ contract old form
```

Migration tooling order alone is not application compatibility.

A destructive schema change without proof that supported readers/writers are retired is forbidden.

## 23. Recovery Rule

Recovery MUST restore distributed invariants, not only database rows.

After storage restore or ownership recovery, verify:

```text
schema
control metadata
ownership
epoch
migration state
idempotency state
data invariants
security policy
representative reads/writes
```

A reachable D1 database is not sufficient evidence of recovery.

## 24. AI Authority Boundary

AI is an implementation accelerator and runtime optimization participant, not an unrestricted administrator.

AI MUST NOT directly bypass:

```text
security
ownership
fencing
tenant isolation
consistency
idempotency
resource bounds
recovery safety
compatibility
```

AI-generated code has no authority merely because the model is confident.

## 25. AI Coding Workflow

The required coding loop is:

```text
Read authoritative contracts
→ Build Execution Packet
→ Freeze Change Manifest
→ Inspect existing code
→ Implement smallest complete change
→ Run targeted verification immediately
→ Review contract invariants
→ Run full applicable verification
→ Generate evidence
→ Update capability status
```

Do not perform a large unverified batch of unrelated changes.

## 26. DeepSeek Prompt Boundary

When delegating implementation to DeepSeek, the controlling prompt MUST contain:

```text
Repository is source of truth.
Read applicable contracts before coding.
Do not redesign architecture.
Do not add unrequested abstractions.
Implement only the frozen capability.
Keep the change manifest minimal.
Verify immediately after each meaningful boundary.
Do not claim tests that were not run.
Do not claim evidence that was not generated.
Stop on contract conflict or missing requirement.
```

The prompt MUST reference contract files by repository path rather than relying on conversational summaries.

## 27. AI Defect Prevention

The agent MUST actively check for the highest-risk defect classes before declaring completion:

```text
wrong state owner
stale epoch acceptance
cross-tenant leakage
authorization bypass
duplicate mutation
retry storm
unbounded query/fan-out
partial commit corruption
migration cutover error
restore inconsistency
schema incompatibility
cache correctness violation
resource budget bypass
```

## 28. Verification Pyramid

Verification MUST progress from cheap to expensive:

```text
format/type/lint
→ unit tests
→ targeted integration
→ build
→ runtime smoke
→ contract/invariant checks
→ concurrency
→ overload/backpressure
→ failure/recovery
→ security/tenant isolation
→ performance/cost
→ regression
→ soak where required
```

A higher-level test does not replace a missing lower-level invariant test.

## 29. Evidence Rule

Every capability completion MUST produce evidence that identifies:

```text
what changed
what contract requires it
what was tested
exact commands
results
environment/version
known limitations
remaining risk
```

Evidence MUST be reproducible.

The agent MUST never convert “code exists” into “capability verified.”

## 30. Test Design Rule

Tests MUST target invariants, not only examples.

For critical paths include negative tests for:

```text
wrong tenant
wrong authorization
stale epoch
wrong owner
duplicate request
retry after ambiguous commit
partial shard failure
migration interruption
restore mismatch
schema version mismatch
overload
cache poisoning
```

## 31. Performance Verification

Performance claims MUST use fixed, reproducible workloads.

At minimum, measure where applicable:

```text
P50
P95
P99
queries/request
rows read/request
rows written/request
fan-out
retry rate
error rate
cost/useful operation
```

Average latency alone is insufficient for critical claims.

## 32. Regression Rule

Every implementation change MUST be checked for regression across:

```text
correctness
security
reliability
compatibility
performance
D1 I/O
cost
complexity
```

A local improvement that violates a higher-priority contract is a failed change.

## 33. Stop Conditions

The agent MUST stop and report BLOCKED when it encounters:

```text
contract conflict
ambiguous state ownership
missing security rule
unbounded resource behavior
unproven recovery
schema incompatibility
unknown compatibility impact
P0/P1 correctness defect
security violation
data corruption/loss risk
fabricated evidence
unresolved architectural drift
```

The agent MUST NOT patch around an architectural contradiction silently.

## 34. Completion States

Use only these capability states:

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

A status MUST correspond to actual evidence.

## 35. Documentation Synchronization

When implementation changes a public contract, state model, operational behavior, migration behavior, or verification method, the affected documentation MUST be updated in the same change set or the capability remains incomplete.

Documentation MUST describe actual implementation, not intended implementation.

## 36. Commit Discipline

Commits SHOULD represent coherent verified units.

Preferred sequence:

```text
small complete change
→ targeted verification
→ commit
```

Do not mix unrelated refactors with capability implementation.

## 37. Release Gate

A capability may reach `RELEASE_READY` only when:

```text
contract satisfied
+ security verified
+ ownership/epoch verified
+ failure/recovery verified where applicable
+ resource bounds verified
+ compatibility verified where applicable
+ performance evidence available where claimed
+ regression pass
+ evidence recorded
```

## 38. Forbidden Development Behavior

The following are prohibited:

```text
coding before reading contracts
architecture invention during implementation
large speculative refactors
copying patterns without checking semantics
adding dependencies for convenience
claiming unrun tests
fabricating benchmark results
ignoring negative tests
silently changing contract meaning
using chat history over repository authority
marking complete because compilation succeeds
```

## 39. Minimum-Code / Maximum-Capability Law

The correct optimization target is not minimum lines of code alone.

It is:

```text
Capability
──────────
Code + State + I/O + Complexity + Operational Burden
```

Prefer the design that delivers more verified capability per unit of total system complexity.

## 40. Final Development Law

> **One frozen contract, one execution packet, one semantic owner, one bounded implementation, immediate verification, reproducible evidence.**

The fastest path is not writing code faster. It is preventing wrong code from being written.
