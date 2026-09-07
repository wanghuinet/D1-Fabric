# D1-Fabric 1.0 Development and AI Engineering Contract

**Status:** CONTRACT BASELINE
**Version:** 1.1
**Authority:** D1-FABRIC-1.0-CONTRACT-BASELINE.md

## 1. Purpose

This contract defines how DeepSeek and other implementation agents convert frozen architecture into the smallest correct, verifiable, production-capable implementation.

> Implement the contract; do not redesign the contract while coding.

The objective is minimum correct code, maximum verified capability density, deterministic behavior, reproducible verification, and near-zero avoidable rework.

## 2. Source of Truth

```text
1. Contract Baseline
2. Applicable versioned contracts
3. AGENTS.md
4. DEVELOPMENT-PROTOCOL.md
5. Existing verified implementation
6. Execution Packet
7. Chat discussion
```

Chat history MUST NOT override repository contracts.

## 3. Contract Semantic Map — Mandatory

Before non-trivial coding, DeepSeek MUST create a compact Semantic Contract Map from the authoritative repository documents.

```text
capability
contract/version
semantic owner of each concern
authoritative state/state owner
untrusted vs verified inputs
routing identity
epoch/fencing
authorization/tenant boundary
consistency/idempotency
resource budgets
failure/recovery obligations
compatibility obligations
verification obligations
forbidden behavior
```

The map is an interpretation artifact, not a new authority. If two authoritative contracts cannot be reconciled, STOP and resolve the contract.

After implementation, every MUST obligation in the map MUST have a verification reference.

## 4. Execution Packet

Every non-trivial implementation MUST begin from a compact packet containing:

```text
Capability ID
Goal
In scope / Out of scope
Applicable contracts
Semantic Contract Map
Acceptance criteria
State touched / owners
Change manifest
Resource budget
Security requirements
Failure/recovery requirements
Compatibility requirements
Verification plan
Evidence required
```

## 5. Frozen Change Manifest

Before coding, declare:

```text
files to add/modify/delete
schema changes
configuration changes
dependencies
public API changes
runtime behavior changes
verification artifacts
```

Anything outside the manifest requires re-evaluation before implementation. Only a necessary contract-compatible correction may be added automatically and it MUST be recorded.

## 6. Smallest Complete Implementation

Optimize for:

```text
minimum code
minimum abstractions
minimum state
minimum network hops
minimum D1 queries
minimum serialization
minimum Workers
minimum dependencies
maximum verified capability density
```

Do not remove required correctness, security, recovery, observability, or verification to reduce code.

## 7. No Speculative Architecture

Do not add Workers, queues, caches, coordinators, replicas, abstractions, frameworks, dependencies, background services, persistent state, retry layers, or generic plugin systems without a concrete requirement, protected invariant, real boundary, measurable benefit, and verification method.

## 8. Semantic Ownership

Each concern has one semantic owner:

```text
Architecture        → Architecture Contract
State/ownership     → Data & State Contract
Execution           → Runtime Execution Contract
Retry/recovery      → Reliability & Recovery Contract
Security            → Security & Compatibility Contract
Performance/cost    → Performance & Cost Contract
AI authority        → AI Governance Contract
```

Modules may implement a concern but MUST NOT redefine its semantics.

## 9. Implementation Order

Prefer:

```text
Contract
→ Semantic Contract Map
→ state model
→ invariants
→ pure deterministic logic
→ authoritative I/O boundary
→ failure paths
→ integration
→ observability
→ verification
```

Do not start with framework plumbing or speculative abstractions.

## 10. Hot Path Discipline

Hot-path code MUST be deterministic and bounded. Minimize D1 queries, fan-out, serialization, allocation, network hops, contention, retries, cache work, and branching complexity. Runtime AI MUST NOT be a correctness dependency.

## 11. Resource Budget First

Every request path MUST have explicit or inherited bounds for:

```text
deadline
queries
rows read
rows written
shards/fan-out
parallelism
retries
payload
memory
queue work
```

An implementation without a bounded resource model is incomplete.

## 12. State Before Code

For every persistent state element answer:

```text
what
classification
semantic owner
authoritative storage
epoch/version
update semantics
recovery
migration
invalidation/rebuild
```

No hidden persistent state is permitted.

## 13. Database Access

For every D1 operation record query count, rows read/written, transaction boundary, index dependency, expected latency, and retry behavior. Queries MUST be parameterized. Unbounded production scans are forbidden on hot paths.

## 14. Write and Read Paths

Write:

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

Read:

```text
Authenticate
→ Authorize/public scope
→ Resolve consistency
→ Route
→ Safe cache lookup if applicable
→ Authoritative read/permitted replica
→ Bounded merge
```

Cache MUST NOT bypass security, ownership, or consistency.

## 15. Cross-Shard Rule

Declare:

```text
fan-out
parallelism
deadline
resource budget
consistency
partial-failure semantics
atomicity semantics
merge policy
```

Never imply global atomicity across independent D1 databases without an explicit protocol.

## 16. Retry Rule

There is one retry semantic owned by Reliability. Every retryable mutation requires an idempotency identity, explicit attempt/deadline/backoff/jitter, and overload accounting. Provider retries MUST be included in the budget.

## 17. Error Handling

At minimum distinguish:

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

## 18. Security

Never trust client tenant/shard/routing identifiers as authorization. Never use cache or idempotency as authorization. Unknown security state MUST fail closed.

Keep distinct:

```text
Authorization → may actor perform operation?
Routing       → where should operation go?
Epoch         → is view current?
Ownership     → is target authoritative writer?
```

## 19. Migration and Schema

Migration:

```text
Plan → Prepare → Copy → Verify → Fence → Commit Ownership → Advance Epoch → Serve → Retire Source
```

Schema:

```text
Expand → Compatible Readers/Writers → Migrate/Backfill → Verify → Switch → Contract
```

Copy completion is not ownership transfer. Destructive changes require proof that supported readers/writers and recovery paths are retired.

## 20. Recovery

Recovery MUST restore distributed invariants, not merely database bytes:

```text
schema
control metadata
ownership
epoch
migration state
idempotency
data invariants
security policy
representative operations
load/error stability
```

Normal admission cannot resume before required verification succeeds.

## 21. Development AI Workflow

DeepSeek MUST execute:

```text
Read authoritative contracts
→ Build Semantic Contract Map
→ Build Execution Packet
→ Freeze Change Manifest
→ Inspect existing implementation
→ Implement smallest complete change
→ Targeted verification immediately
→ Contract-driven adversarial verification
→ Full applicable verification
→ Evidence
→ Independent review
→ Status
```

DeepSeek is an implementation agent, not architecture authority.

## 22. Contract-Driven Adversarial Verification

Verification MUST derive critical negative tests from contracts independently of implementation-authored tests.

Applicable cases include:

```text
wrong tenant
unauthorized request
stale epoch
wrong owner
duplicate mutation
ambiguous commit
partial shard failure
migration interruption
schema mismatch
cache poisoning
resource exhaustion
invalid AI candidate
expired knowledge
authority downgrade
```

Compilation and implementation-authored tests are never sufficient evidence of semantic compliance.

## 23. AI Boundary

AI-generated code has no authority merely because the model is confident. AI MUST NOT bypass security, ownership, fencing, consistency, idempotency, resource bounds, recovery safety, or compatibility.

## 24. DeepSeek Anti-Drift Rules

DeepSeek MUST:

```text
read repository contracts before coding
reference repository paths, not chat summaries
state the Semantic Contract Map before implementation
freeze scope before implementation
keep changes inside the manifest
verify each coherent boundary immediately
trace each contract MUST to evidence
run negative/adversarial verification
stop on semantic conflict or missing requirement
never fabricate tests, metrics, evidence, or status
```

DeepSeek MUST NOT:

```text
redesign architecture during implementation
invent a second semantic owner
expand scope silently
add speculative abstractions
reinterpret a frozen MUST for convenience
mark complete from compilation
use its own summary as authority
```

## 25. Contract Evolution

Frozen semantics may not be changed by implementation. A change to a `MUST`, invariant, semantic owner, protocol meaning, schema compatibility, security boundary, routing/epoch meaning, recovery rule, or AI authority requires a contract revision:

```text
Change Proposal
→ Evidence / Reason
→ Semantic Impact Analysis
→ Compatibility Analysis
→ Migration/Rollback Plan
→ Adversarial Verification
→ Review/Approval
→ New Contract Version
→ Implementation
→ Revalidation
→ Deprecate/Retire Old Version
```

## 26. Verification Pyramid

```text
static/type/lint
→ unit
→ targeted integration
→ build
→ runtime smoke
→ contract/invariant
→ concurrency/overload
→ failure/recovery
→ security/isolation
→ performance/cost
→ regression
→ soak where required
```

Applicability MUST be recorded. Unknown/unproven is not PASS.

## 27. Evidence

Every completion MUST identify:

```text
exact commit
contracts/version
what changed
commands
inputs/outputs
environment/version
verification results
limitations
remaining risk
```

Evidence MUST be reproducible and generated from the actual commit being evaluated.

## 28. Regression

Check correctness, security, reliability, compatibility, performance, D1 I/O, cost, and complexity. A local improvement that violates a higher-priority contract is a failed change.

## 29. Completion and Release Gate

Allowed capability states:

```text
UNKNOWN READY IN_PROGRESS LOCAL_PASS CONTRACT_PASS INTEGRATION_PASS REGRESSION_PASS CAPABILITY_PASS RELEASE_READY RELEASED ROLLED_BACK FAILED BLOCKED
```

`RELEASE_READY` requires contract satisfaction, semantic-map coverage, security, ownership/epoch, applicable recovery, resource bounds, compatibility, performance evidence where claimed, regression pass, and evidence.

## 30. Documentation Synchronization

Changes to contract meaning, state model, public behavior, migration, recovery, or verification MUST update affected documentation in the same change set. Documentation describes actual implementation, never intended implementation.

## 31. Commit Discipline

Commit only coherent verified units plus required evidence/documentation. No unrelated cleanup.

## 32. Forbidden Development Behavior

Prohibited:

```text
coding before contract read
architecture invention
large speculative refactors
unreviewed semantic changes
dependency convenience additions
fabricated tests/benchmarks/evidence
ignoring negative paths
chat authority over repository authority
completion from compilation only
```

## 33. Final Development Law

> **One authoritative contract, one Semantic Contract Map, one execution packet, one semantic owner, one bounded implementation, immediate verification, adversarial verification, reproducible evidence.**
