# DeepSeek Implementation Prompt — D1-Fabric 1.2

Use this repository as the only architecture authority.

## 1. First classify the task

```text
T0 — Non-semantic
    docs, formatting, comments, mechanical changes with proven no behavior change

T1 — Local semantic
    one bounded module/path, no contract meaning change, no cross-boundary safety semantics

T2 — Cross-boundary / safety-critical
    state ownership, routing, epoch/fencing, security, consistency, retry, migration, recovery,
    public protocol, schema compatibility, hot-path performance, or architecture change
```

Use the smallest safe workflow. Never use a lower class to avoid a real safety or contract obligation.

## 2. Route the context

Always read:

```text
AGENTS.md
D1-FABRIC-1.0-CONTRACT-BASELINE.md
```

Then load only the contracts routed by `AGENTS.md` and the task classification. Do not preload historical reports, duplicate v2 documents, or unrelated gates.

## 3. Workflow

T0:

```text
SCOPED INSPECT
→ CHANGE
→ TARGETED CHECK
→ COMMIT
```

T1:

```text
ROUTED CONTRACTS
→ COMPACT SEMANTIC MAP
→ SCOPED MANIFEST
→ INSPECT IMPLEMENTATION/TESTS
→ IMPLEMENT
→ TARGETED VERIFY
→ EVIDENCE
→ COMMIT
```

T2:

```text
ROUTED CONTRACTS
→ RESOLVE CONTRACT
→ SEMANTIC CONTRACT MAP
→ EXECUTION PACKET
→ FREEZE CHANGE MANIFEST
→ INSPECT IMPLEMENTATION/TESTS
→ IMPLEMENT SMALLEST COMPLETE CHANGE
→ TARGETED VERIFY IMMEDIATELY
→ CONTRACT-DRIVEN ADVERSARIAL VERIFY
→ FULL APPLICABLE VERIFY
→ EVIDENCE
→ INDEPENDENT REVIEW
→ STATUS
```

## 4. Semantic Contract Map

For T1/T2 behavior changes, state:

```text
capability
contract/version
semantic owner per concern
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

If authoritative contracts conflict, STOP. Do not invent a compromise.

## 5. Scope and implementation

Implement only the approved capability and manifest.

Do not silently add:

```text
Workers
queues
caches
coordinators
dependencies
persistent state
retry layers
network hops
abstractions
```

unless the requirement, protected invariant, real boundary, measurable benefit, and verification method are explicit.

Prefer existing verified primitives, one primary path, one semantic owner, minimal D1 I/O, minimal serialization, and minimal dependencies.

## 6. Verification

Compilation is not semantic proof.

Derive verification from the routed contracts. For protected boundaries, independently test applicable negative paths:

```text
wrong tenant
unauthorized request
stale epoch
wrong owner
duplicate mutation
ambiguous commit
partial failure
migration interruption
schema mismatch
cache poisoning
resource exhaustion
```

For AI-governed changes additionally test invalid/expired/superseded candidates, resource-budget violation, rollback, and authority downgrade.

Run only the applicable verification levels required by the task's risk.

## 7. Evidence

Never claim implemented, verified, benchmarked, recovered, secure, or release-ready without actual evidence.

Evidence MUST reference the exact evaluated commit and applicable contract version.

## 8. Stop conditions

STOP and report BLOCKED on:

```text
contract conflict
ambiguous ownership
security bypass
cross-tenant leakage
stale writer acceptance
unbounded resource behavior
unproven recovery
semantic drift
P0/P1 defect
fabricated or mismatched evidence
```

## 9. Final rule

> **Load the minimum correct context. Implement the repository contract. Prove the semantics required by the change. Never redesign the architecture while coding.**
