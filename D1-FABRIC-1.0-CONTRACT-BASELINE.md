# D1-Fabric 1.0 Contract Baseline

**Status:** FROZEN  
**Version:** 1.0  
**Baseline:** Contract Freeze  
**Authority:** Cross-contract precedence and integration baseline

## 1. Purpose

This document freezes the integrated meaning of the D1-Fabric 1.0 contracts.

The individual contracts remain authoritative for their own concerns. This baseline resolves cross-contract ambiguity and defines the rules that an implementation MUST follow when multiple contracts apply to the same operation.

## 2. Frozen Contract Set

The D1-Fabric 1.0 baseline consists of:

```text
D1-FABRIC-1.0-ARCHITECTURE-CONTRACT.md
D1-FABRIC-1.0-AI-GOVERNANCE-CONTRACT.md
D1-FABRIC-1.0-DATA-AND-STATE-CONTRACT.md
D1-FABRIC-1.0-RUNTIME-EXECUTION-CONTRACT.md
D1-FABRIC-1.0-PERFORMANCE-AND-COST-CONTRACT.md
D1-FABRIC-1.0-RELIABILITY-AND-RECOVERY-CONTRACT.md
D1-FABRIC-1.0-SECURITY-AND-COMPATIBILITY-CONTRACT.md
```

`D1-FABRIC-1.0-CONTRACT-AUDIT.md` records the final cross-contract audit that authorized this freeze.

## 3. Baseline State

The architecture is now **CONTRACT-FROZEN**.

Implementation may proceed only against this baseline.

Implementation MUST NOT:

- reinterpret a contract to make code easier;
- add architecture because an implementation agent prefers it;
- split the runtime into modules merely because a document contains many concepts;
- silently weaken a MUST requirement;
- create a second semantic owner for an existing concern;
- use chat history to override repository contracts.

If implementation exposes a genuine contract defect, implementation stops at the affected boundary and a contract change is required before proceeding.

## 4. Cross-Contract Precedence

When two requirements appear to compete, use this order:

```text
Security / Isolation
→ Correctness / Authoritative State
→ Ownership / Epoch / Fencing
→ Consistency
→ Recovery Safety
→ Resource Bounds
→ Useful Availability
→ Performance
→ Cost
→ AI Optimization
```

This is a conflict-resolution rule, not a replacement for the individual contracts.

## 5. Identity and Tenant Resolution

The runtime MUST distinguish:

```text
Untrusted Request Input
Verified Identity
Authorized Tenant / Scope
Routing Identity
Shard Ownership
```

A client-supplied `tenant_id` is never proof of tenant authority.

The frozen authorization sequence is:

```text
Authenticate
→ Authorize
→ Resolve Authorized Tenant/Scope
→ Construct Canonical Routing Identity
→ Resolve Route
→ Validate Routing Epoch
→ Validate Ownership
→ Validate Resource/Consistency Policy
→ Resolve Idempotency
→ Execute
→ Commit
→ Update Derived/Cache State
```

Public/non-tenant operations MUST use an explicit public/global scope rather than relying on an implicit missing tenant value.

## 6. Canonical Routing Identity

The semantic routing input is:

```text
RoutingIdentity =
    normalized_namespace
  + authorized_tenant_scope
  + logical_routing_key
```

Then:

```text
Route(RoutingIdentity, routing_epoch) → logical_shard
```

The exact encoding/hash is an implementation choice, but it MUST be deterministic, versioned, collision-safe for the declared namespace, and independent of untrusted authorization claims.

Routing does not prove authorization.
Authorization does not prove ownership.
Ownership does not replace epoch validation.
Epoch validation does not replace consistency validation.

## 7. State Ownership Matrix

| State | Classification | Semantic owner | Recovery requirement |
|---|---|---|---|
| Application authoritative data | AUTHORITATIVE | Application-defined logical shard owner | Restore data + ownership + epoch |
| Shard ownership | CONTROL | D1-Fabric control plane | Must restore before authoritative writes |
| Routing epoch/fence | CONTROL | D1-Fabric control plane | Must prevent stale writers |
| Physical placement | CONTROL | D1-Fabric control plane | Must reconcile before service |
| Migration state | CONTROL | D1-Fabric control plane | Must resume/abort deterministically |
| Schema compatibility metadata | CONTROL | D1-Fabric schema governance | Must verify before admission |
| Authorization policy owned by Fabric | CONTROL | D1-Fabric security control plane | Must restore before protected operations |
| External identity assertion | EPHEMERAL/request context | Trusted identity provider/application boundary | Must be re-established per request |
| Cache | CACHE | Cache subsystem | Rebuild/expire safely |
| Derived state | DERIVED | Derived-state subsystem | Rebuild/reconcile |
| Telemetry | OBSERVATION | Observability subsystem | Loss must not corrupt authoritative state |
| Process-local execution state | EPHEMERAL | Runtime instance | Loss must be safe and recoverable |
| Recovery state affecting ownership | CONTROL | D1-Fabric recovery/control plane | Must be durable/recoverable |

Application-specific business semantics remain application-owned and MUST NOT be moved into D1-Fabric merely to simplify routing.

## 8. Cache Rule

Cache is semantically downstream from authorization and authoritative state.

Safe cache execution is:

```text
Authenticate
→ Authorize / resolve public scope
→ establish consistency context
→ build security-safe cache identity
→ Cache Lookup
→ if miss, authoritative execution
```

A cache hit MUST NOT bypass authorization, tenant isolation, ownership, consistency, or schema compatibility.

## 9. Retry and Idempotency Rule

Reliability owns retry semantics.

Performance measures retry cost.
Security protects against replay.
Runtime integrates retries into execution.

The single semantic rule is:

```text
retryable mutation
→ idempotency identity
→ bounded attempts
→ deadline/backoff/jitter
→ outcome resolution
```

A new retry layer may not be introduced by another contract or module with different semantics.

## 10. Commit and Response Rule

The authoritative commit boundary is independent of response delivery.

Therefore:

```text
Commit succeeds
→ response may succeed or fail
→ later retry resolves existing outcome
```

An ambiguous commit MUST be resolved before replay.

## 11. Cross-Shard Rule

Cross-shard operations MUST declare:

```text
fan-out
parallelism
deadline
resource budget
consistency
partial-failure semantics
atomicity semantics
merge behavior
```

No global atomicity may be implied by the existence of multiple D1 databases.

## 12. Recovery Rule

Recovery restores distributed invariants, not just database bytes.

Minimum recovery verification:

```text
Process
→ Storage
→ Schema
→ Control Metadata
→ Ownership
→ Routing/Epoch
→ Data Invariants
→ Idempotency
→ Security
→ Representative Operations
→ Load/Error Stability
```

Normal admission cannot resume before required verification succeeds.

## 13. Schema / Deployment Rule

All schema evolution uses:

```text
Expand
→ Compatible Readers/Writers
→ Migrate/Backfill
→ Verify
→ Switch
→ Contract
```

A schema version is compatible only if every supported runtime version can safely interpret the authoritative state it may encounter.

A database restore MUST verify schema compatibility against the serving runtime before traffic resumes.

Destructive schema changes require proof that:

```text
old readers retired
+
old writers retired
+
recovery path upgraded
+
rollback/recovery requirements satisfied
```

## 14. Security / Performance Rule

Security predicates, tenant isolation, authorization, and audit requirements are not optional performance costs.

Performance optimization may improve their implementation through:

```text
routing
indexes
data layout
cache
batching
admission
```

but may never remove or weaken a security invariant.

Security-critical audit writes are legitimate work but MUST remain bounded and minimal.

## 15. AI Authority Rule

AI is subordinate to all frozen correctness and security boundaries.

Even L3 cannot:

```text
invent ownership
bypass authorization
bypass tenant isolation
bypass epoch/fencing
bypass consistency
bypass resource limits
bypass recovery verification
execute arbitrary D1
silently change schema semantics
hide evidence
```

AI output is untrusted input.

The minimum AI execution gate is:

```text
Candidate
→ Parse
→ Validate
→ Security Check
→ Ownership/Epoch Check
→ Consistency Check
→ Resource Check
→ Compatibility Check
→ Policy
→ Execute
→ Measure
→ Verify
```

## 16. Hot Path Rule

The ordinary Data Plane hot path MUST NOT require:

```text
remote AI inference
global coordinator
unbounded metadata lookup
experimental decision generation
```

Approved AI-derived configuration MAY be consumed by the hot path only after validation and within explicit validity/version bounds.

## 17. Failure State Rule

Reliability lifecycle state and security incident state are orthogonal.

They MUST NOT be implemented as competing meanings of one generic state field.

For example:

```text
Shard Lifecycle = ACTIVE / FAILED / RECOVERING / ...
Security Incident = NORMAL / SUSPECTED / ISOLATED / ...
```

A security incident may force a shard or capability into a restricted reliability/availability state, but the two dimensions remain semantically distinct.

## 18. Control-Plane Rule

Control metadata is authoritative distributed-system state.

Any state that can change:

```text
ownership
routing
epoch/fence
placement
migration
schema compatibility
security policy
AI authority
recovery
```

must have an explicit semantic owner, version, integrity protection, and recovery path.

No process-local copy can silently become authoritative.

## 19. Compatibility Rule

Public compatibility is defined by documented semantic contracts, not by accidental implementation behavior.

Clients MUST rely on:

```text
version
machine-readable error code
retryability
schema contract
consistency contract
resource limits
```

They MUST NOT rely on:

```text
internal shard IDs
internal routing metadata
field ordering
error message text
incidental timing
undocumented fields
```

## 20. DeepSeek Implementation Rules

For every implementation task, DeepSeek MUST first identify:

```text
contract(s) involved
semantic owner of each concern
untrusted vs verified input
state owner
routing identity
epoch/fence requirement
authorization boundary
resource budget
failure/retry behavior
schema compatibility
verification evidence
```

DeepSeek MUST NOT create a new module merely because multiple contracts mention the same concept.

Example:

```text
Routing
```

is one semantic concern owned by Data/State, not separate routing implementations in Runtime, Security, Performance, and AI.

Likewise:

```text
Retry
```

has one reliability meaning with execution, cost, and security integrations.

## 21. Change Control

After this freeze, any change to a `MUST`, invariant, state owner, protocol semantics, schema compatibility rule, security boundary, routing/epoch meaning, or AI authority boundary requires a new contract revision.

Implementation may refine:

- function names;
- file layout;
- internal data structures;
- serialization details;
- algorithm choice;
- benchmark harness;

provided the frozen semantics remain unchanged.

## 22. Release Interpretation

`CONTRACT-FROZEN` does not mean the software is production-ready.

It means:

```text
Architecture semantics = frozen
Implementation = not yet proven
```

The next gates are:

```text
Implementation
→ Targeted Verification
→ Full Verification
→ Failure/Recovery Verification
→ Security Verification
→ Performance/Cost Verification
→ Evidence Review
→ Capability Gate
→ Release Gate
```

## 23. Final Baseline Law

> **One architecture, one semantic owner per concern, one authoritative state owner, one security boundary, one routing interpretation, one recovery interpretation, one compatibility contract.**

The repository is now the source of truth for D1-Fabric 1.0 architecture. Implementation agents must obey this baseline rather than reconstructing architecture from conversation history.
