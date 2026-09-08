# D1-Fabric 1.0 Contract Baseline

**Status:** CONTRACT-FROZEN
**Version:** 1.1 governance revision
**Authority:** Cross-contract precedence and integration baseline

## 1. Purpose

This document freezes the integrated meaning of the D1-Fabric 1.x contracts and resolves cross-contract ambiguity. Individual contracts remain authoritative for their own concerns.

The repository, not chat history, is the source of truth.

## 2. Frozen Contract Set

```text
D1-FABRIC-1.0-ARCHITECTURE-CONTRACT.md
D1-FABRIC-1.0-AI-GOVERNANCE-CONTRACT.md
D1-FABRIC-1.0-DATA-AND-STATE-CONTRACT.md
D1-FABRIC-1.0-RUNTIME-EXECUTION-CONTRACT.md
D1-FABRIC-1.0-PERFORMANCE-AND-COST-CONTRACT.md
D1-FABRIC-1.0-RELIABILITY-AND-RECOVERY-CONTRACT.md
D1-FABRIC-1.0-SECURITY-AND-COMPATIBILITY-CONTRACT.md
```

`D1-FABRIC-1.0-CONTRACT-AUDIT.md` records the audit supporting the baseline.

## 3. Baseline Rules

Implementation MUST NOT:

- reinterpret contracts to make code easier;
- add architecture because an agent prefers it;
- split runtime merely because documents contain many concepts;
- silently weaken a MUST;
- create a second semantic owner;
- use chat to override repository authority.

A genuine semantic contract defect blocks the affected boundary until revised.

## 4. Cross-Contract Precedence

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

## 5. Semantic Ownership

Each concern has exactly one semantic owner. Other contracts may impose integration obligations but cannot redefine the concern.

```text
Architecture        → Architecture Contract
State/ownership     → Data & State Contract
Execution           → Runtime Execution Contract
Retry/recovery      → Reliability & Recovery Contract
Security            → Security & Compatibility Contract
Performance/cost    → Performance & Cost Contract
AI authority        → AI Governance Contract
```

The owner and all applicable obligations MUST be represented in the Semantic Contract Map for non-trivial implementation.

## 6. Identity and Tenant Resolution

The runtime distinguishes:

```text
Untrusted Request Input
Verified Identity
Authorized Tenant / Scope
Routing Identity
Shard Ownership
```

A client-supplied `tenant_id` is never proof of authority.

Frozen sequence:

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

Public/global operations MUST use an explicit public/global scope.

## 7. Canonical Routing Identity

```text
RoutingIdentity = normalized_namespace + authorized_tenant_scope + logical_routing_key
Route(RoutingIdentity, routing_epoch) → logical_shard
```

Encoding/hash is implementation-defined but MUST be deterministic, versioned, collision-safe for its declared namespace, and independent of untrusted authorization claims.

## 8. State Ownership

Every mutable authoritative state has exactly one logical owner at a valid epoch. Logical shards and physical D1 databases remain distinct concepts.

Control metadata covering ownership, routing, epoch/fence, placement, migration, schema compatibility, security policy, AI authority, or recovery MUST have explicit semantic ownership, versioning, integrity protection, and recovery semantics.

## 9. Cache / Derived State

Cache and derived state are downstream of authorization and authoritative state. They MUST NOT bypass authorization, tenant isolation, ownership, epoch, consistency, schema compatibility, or recovery requirements.

## 10. Retry / Idempotency

Reliability owns retry semantics. Performance measures retry cost. Security protects replay. Runtime integrates the single semantic rule:

```text
retryable mutation
→ idempotency identity
→ bounded attempts
→ deadline/backoff/jitter
→ outcome resolution
```

No second retry semantic may be introduced by another module.

## 11. Commit and Response

Commit outcome is independent of response delivery:

```text
Commit succeeds
→ response may fail
→ later retry resolves existing outcome
```

Ambiguous commit MUST be resolved before replay.

## 12. Cross-Shard Operations

Every cross-shard operation declares fan-out, parallelism, deadline, resource budget, consistency, partial-failure semantics, atomicity semantics, and merge behavior. No global atomicity is implied without an explicit protocol.

## 13. Recovery

Recovery restores distributed invariants, not only bytes:

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

## 14. Schema / Deployment

```text
Expand
→ Compatible Readers/Writers
→ Migrate/Backfill
→ Verify
→ Switch
→ Contract
```

Destructive schema changes require proof that old readers/writers, recovery paths, and rollback requirements are retired or satisfied.

## 15. AI Authority

AI is subordinate to all frozen safety and correctness boundaries. The minimum candidate gate is:

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

AI cannot execute arbitrary D1, bypass authorization, ownership/fencing, consistency, resource limits, recovery verification, schema semantics, or audit/evidence.

The hot path MUST NOT require remote AI inference, global coordination, or unbounded metadata lookup.

## 16. Semantic Contract Map

Before every non-trivial implementation or material AI optimization, create a compact map of:

```text
capability
contract/version
semantic owner per concern
state/state owner
untrusted vs verified input
routing identity
epoch/fencing
security/tenant boundary
consistency/idempotency
resource budgets
failure/recovery
compatibility
verification obligations
forbidden behavior
```

The map is not a new authority. It is a traceability artifact. Every applicable contract MUST obligation must map to verification evidence before completion.

## 17. Contract-Driven Adversarial Verification

Independent verification MUST derive critical negative tests from contract obligations rather than relying only on implementation-authored tests. Applicable cases include stale epoch, wrong owner, cross-tenant access, duplicate mutation, ambiguous commit, partial failure, migration interruption, schema mismatch, cache poisoning, resource exhaustion, invalid AI candidate, expired knowledge, and authority downgrade.

## 18. Contract Evolution

Frozen semantics are immutable for their declared version. Changes to a MUST, invariant, semantic owner, protocol meaning, schema compatibility, security boundary, routing/epoch meaning, recovery rule, or AI authority require revision:

```text
Change Proposal
→ Evidence / Reason
→ Semantic Impact Analysis
→ Compatibility Analysis
→ Migration/Rollback Plan
→ Adversarial Verification
→ Review / Approval
→ New Contract Version
→ Implementation
→ Revalidation
→ Deprecate / Retire Old Version
```

Implementation agents cannot create semantic revisions implicitly.

## 19. AI Knowledge Evolution

AI optimization memory is evidence, not authority. Every learned result has version, workload/applicability, expiration, and revalidation semantics. Historical success becomes invalid when materially changed conditions invalidate its evidence.

Allowed knowledge lifecycle:

```text
VALID
→ EXPIRED / INVALIDATED / SUPERSEDED / REGRESSED
→ REVALIDATION_REQUIRED
→ VALID
```

## 20. AI Authority Auto-Downgrade

AI authority MUST be able to decrease without human timing dependencies when configured safety thresholds are violated:

```text
L3 → L2 → L1 → L0
```

Security/correctness violations MAY force immediate L0 and block further automation. Promotion requires fresh evidence.

## 21. Release Interpretation

`CONTRACT-FROZEN` means architecture semantics are frozen, not that software is production-ready.

```text
Implementation
→ Targeted Verification
→ Adversarial Verification
→ Full Verification
→ Failure/Recovery
→ Security
→ Performance/Cost
→ Evidence Review
→ Capability Gate
→ Release Gate
```

## 22. Final Baseline Law

> **One architecture, one semantic owner per concern, one authoritative state owner, one security boundary, one routing interpretation, one recovery interpretation, one compatibility contract, and one evidence-driven evolution path.**
