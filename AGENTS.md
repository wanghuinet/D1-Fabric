# D1-Fabric AI Engineering Instructions

**Version:** 1.0
**Status:** ACTIVE
**Authority:** `D1-FABRIC-1.0-CONTRACT-BASELINE.md`
**Primary implementation language:** TypeScript

## 1. Mission

Build the minimum amount of correct code that provides complete, runnable, verifiable, maintainable, scalable, secure, recoverable, and deployable distributed-data capability.

Code should be minimal; contracts and proof obligations remain rigorous.

D1-Fabric is domain-neutral infrastructure for Cloudflare D1. Product semantics belong above the core.

## 2. Authoritative Source Order

When documents disagree, use:

```text
1. D1-FABRIC-1.0-CONTRACT-BASELINE.md
2. Applicable D1-FABRIC-1.0-* contracts
3. AGENTS.md
4. DEVELOPMENT-PROTOCOL.md
5. Existing verified implementation
6. Execution Packet / Change Manifest
7. Chat discussion
```

The repository, not chat history, is the source of truth.

Historical A00.x documents and superseded development contracts are not implementation authority.

## 3. Required Reading Before Non-Trivial Work

Read:

```text
D1-FABRIC-1.0-CONTRACT-BASELINE.md
Applicable D1-FABRIC-1.0-* contracts
AGENTS.md
DEVELOPMENT-PROTOCOL.md
Relevant existing implementation/tests
Current Execution Packet
Current Change Manifest
```

Read security, reliability, performance, data/state, runtime, AI-governance, and verification contracts whenever the capability touches those boundaries.

## 4. Mandatory Engineering Invariants

```text
I-01 No global coordinator is mandatory on the data-plane hot path.
I-02 Every mutable state has exactly one authoritative owner.
I-03 Every retryable operation has explicit idempotency semantics.
I-04 Retry MUST NOT amplify overload.
I-05 Shard ownership MUST be unambiguous for a routing epoch.
I-06 Routing decisions MUST be versioned/fenced where migration can race with traffic.
I-07 No request may cause unbounded D1 I/O.
I-08 No queue may grow without bounded admission/backpressure policy.
I-09 No single shard may be an unavoidable global bottleneck.
I-10 Partial failure MUST NOT corrupt committed state.
I-11 Recovery MUST restore routing/state invariants before normal traffic resumes.
I-12 Every scalability claim MUST have reproducible evidence.
```

Applicable security/compatibility invariants and performance/recovery invariants in the 1.0 contracts are equally mandatory.

## 5. Before Coding

For every non-trivial capability, establish:

```text
Capability / REQ IDs
Scope / Non-goals
Smallest complete design
Applicable contracts
Inputs / Outputs
State model
Authoritative owner for every mutable state
Invariants
Hot path / control path
Concurrency boundary
Idempotency / retry semantics
Timeout / cancellation / failure semantics
Recovery / return-to-service condition
Consistency model
Resource budgets
Scaling boundary
Security / trust / tenant boundary
Compatibility / versioning
Verification matrix
Evidence requirements
Distribution classification
Change manifest
Rejected alternatives where material
```

If a correctness-critical item is unknown or contradictory, STOP and resolve the contract before coding.

If an unknown affects only an internal implementation choice while the contract remains satisfied, choose the smallest conventional implementation.

## 6. Execution Protocol

All non-trivial implementation SHALL follow `DEVELOPMENT-PROTOCOL.md`:

```text
READ
→ RESOLVE CONTRACT
→ EXECUTION PACKET
→ FREEZE CHANGE MANIFEST
→ IMPLEMENT
→ TARGETED VERIFY
→ FULL APPLICABLE VERIFY
→ EVIDENCE
→ INDEPENDENT REVIEW
→ STATUS
→ COMMIT
```

The templates under `templates/` are the standard execution artifacts.

## 7. Architecture Boundary

The implementation agent is not an architecture authority.

Do not silently change:

```text
state ownership
routing / epoch / fencing
consistency semantics
failure/recovery semantics
security boundaries
tenant isolation
resource limits
public protocols
schema compatibility
Worker boundaries
```

A material architecture change requires an explicit contract/ADR decision.

## 8. Minimal-Code Rule

Prefer:

- existing correct primitives;
- direct implementation;
- one authoritative state owner;
- one primary execution path;
- shared validation/error/timeout infrastructure;
- minimal D1 operations;
- minimal network hops;
- minimal dependencies.

Do not add speculative abstractions, queues, retries, caches, persistent state, coordinators, Workers, or dependencies without a current requirement, invariant, measurable benefit, and real boundary.

Do not perform unrelated refactors.

## 9. Data / Routing / Security Ordering

For protected operations preserve:

```text
Authenticate
→ Authorize
→ Resolve authorized tenant/scope
→ Construct canonical routing identity
→ Resolve route
→ Validate epoch
→ Validate ownership
→ Validate resource/consistency policy
→ Resolve idempotency
→ Execute
→ Commit
→ Update derived/cache state
```

Client-supplied tenant, shard, or routing information is not proof of authorization.

Cache and derived state cannot bypass authorization, ownership, epoch, consistency, or schema compatibility.

## 10. Hot Path

Hot-path execution MUST be deterministic and bounded.

Runtime AI MUST NOT be required for correctness.

The baseline path must remain safe if AI optimization, cache, or non-authoritative derived state is unavailable.

## 11. D1 / Resource Boundaries

Every applicable request MUST have explicit budgets for:

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

No unbounded production hot-path scan, fan-out, retry, queue, batch, or concurrency mechanism.

## 12. Security / Compatibility

Security and compatibility are release-blocking concerns.

Enforce:

```text
authentication
authorization
least privilege
tenant isolation
input/query safety
replay protection
resource abuse controls
control-plane authorization
migration/restore authorization
fail-closed behavior
protocol compatibility
schema compatibility
rolling-version compatibility
```

AI cannot bypass these boundaries.

## 13. Failure / Recovery

Do not equate response delivery with commit outcome.

Retries MUST be idempotent and bounded.

Recovery must restore distributed invariants, including ownership, epoch/fencing, migration state, schema compatibility, authorization, and idempotency state where applicable.

D1 storage restore alone is not proof of complete D1-Fabric recovery.

## 14. Verification

Never report PASS from source inspection or compilation alone.

Use the applicable verification pyramid:

```text
V0 Static
V1 Unit
V2 Integration
V3 Runtime
V4 Contract / Invariant
V5 Concurrency / Overload
V6 Failure / Recovery
V7 Security / Isolation
V8 Performance / Cost / Regression
V9 Soak / Operational
```

Unknown and unproven are not PASS.

Critical negative paths MUST be covered where applicable:

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
```

## 15. Evidence

Use `templates/EVIDENCE-RECORD.md`.

Evidence MUST identify exact commit, environment, commands, inputs, results, metrics, limitations, and status.

Evidence levels:

```text
E0 declaration
E1 static/type/lint
E2 unit
E3 integration
E4 build/runtime
E5 real request / end-to-end
E6 concurrency/failure/recovery
E7 performance/load/soak/scale
E8 independent/release-grade
```

Performance/scale claims require E7 or stronger where applicable. Critical release claims require E8 where applicable.

AI confidence is not evidence.

## 16. Status

Only use:

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

A capability cannot advance while a required invariant, security obligation, recovery obligation, resource bound, or proof obligation is unknown, unproven, or failed.

## 17. Change Manifest

Every non-trivial task MUST freeze:

```text
allowed files
forbidden files
interfaces
state/schema changes
dependencies
configuration
tests/evidence
```

Unplanned material changes require stop-and-re-evaluate.

## 18. Development AI Rule

DeepSeek or another coding agent SHALL implement the approved contract, not redesign it during implementation.

Use:

```text
Contract
→ Packet
→ Manifest
→ Implementation
→ Verification
→ Evidence
```

Do not fabricate tests, metrics, benchmark results, recovery results, security results, or completion status.

## 19. Runtime AI Rule

Runtime AI may observe, analyze, propose, optimize, experiment, canary, and learn only within the AI Governance Contract.

The optimization loop is:

```text
Observe
→ Analyze
→ Hypothesis
→ Candidate
→ Validate
→ Benchmark
→ Canary
→ Measure
→ Promote / Reject
→ Learn
```

AI cannot directly bypass immutable safety boundaries.

## 20. Commercial / IP Boundary

Every capability MUST be classified as `OPEN`, `COMMERCIAL`, or `MIXED` before merge.

If the boundary is ambiguous, status is `BLOCKED` rather than guessed.

Do not publish secrets, customer data, proprietary optimization logic, or security-sensitive implementation details accidentally.

Commercial separation must not justify artificial Worker/module fragmentation.

## 21. Documentation

Documentation is an engineering control.

Material behavior must remain traceable:

```text
REQ
→ CONTRACT
→ IMPLEMENTATION
→ TEST
→ EVIDENCE
```

Do not change documentation merely to make code appear compliant.

If code conflicts with a contract, surface and resolve the conflict.

## 22. Stop Conditions

STOP immediately for:

```text
contract conflict
ambiguous ownership
authorization bypass
cross-tenant leakage
stale writer acceptance
data corruption/loss risk
unbounded D1 I/O
unbounded fan-out/retry/queue
unproven recovery
schema incompatibility
fabricated evidence
wrong-commit evidence
P0/P1 defect
critical regression
architecture drift
unresolved IP/security boundary
```

Do not continue to a dependent capability until the current required PASS state is achieved.

## 23. Final Law

> **The repository contracts define what must be true. The implementation agent chooses the simplest way to make it true. Verification proves whether it is true. Nothing else is authority.**
