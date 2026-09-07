# DeepSeek Implementation Prompt — D1-Fabric 1.3

Use this repository as the only architecture authority.

## 1. Classify the task

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

Then load only contracts routed by `AGENTS.md` and the task class. Do not preload historical reports, duplicate versions, or unrelated gates.

## 3. Required artifacts

T0:
```text
Scoped inspect → Change → Targeted check
```

T1:
```text
Routed contracts
→ Compact Semantic Contract Map
→ Module Boundary Card
→ Scoped Change Manifest
→ Implement
→ Targeted Verify
→ Diff Scope Gate
→ Evidence
```

T2:
```text
Routed contracts
→ Resolve Contract
→ Semantic Contract Map
→ Execution Packet
→ Module Boundary Card
→ Freeze Change Manifest
→ Inspect implementation/tests
→ Implement smallest complete change
→ Targeted Verify immediately
→ Diff Scope Gate
→ Contract-driven adversarial verify
→ Full applicable verify
→ Evidence
→ Capability Gate
→ Status
```

Templates:

```text
templates/MODULE-BOUNDARY-CARD.md
templates/EXECUTION-PACKET.md
templates/CHANGE-MANIFEST.md
templates/DIFF-SCOPE-GATE.md
templates/CAPABILITY-GATE.md
```

## 4. Boundary before code

Before T1/T2 coding, explicitly state:

```text
MUST do
MUST NOT do
semantic owner
state read/write + authoritative owner
allowed/forbidden dependencies
interfaces/errors/side effects
security/trust/tenant boundary
resource/D1/network limits
failure/recovery owner
verification obligations
```

Do not silently move responsibility to another module.

## 5. Scope before code

Freeze the Change Manifest. Implement only the approved capability.

Out-of-scope file, schema, dependency, public API, runtime behavior, or semantic-owner changes require a manifest revision with reason and verification.

## 6. Implementation

Prefer existing verified primitives, one primary path, one semantic owner, minimum code, minimum D1 I/O, minimum network hops, minimum dependencies.

Do not add Workers, queues, caches, coordinators, retry layers, persistent state, or abstractions unless requirement + invariant + real boundary + measurable benefit + verification are explicit.

## 7. Verification

Compilation is not semantic proof.

After each coherent boundary, verify immediately. For protected boundaries, independently derive negative tests from contracts:

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

AI-governed changes additionally cover invalid/expired/superseded candidates, resource-budget violation, rollback, and authority downgrade.

Run only applicable verification levels required by the task risk and record omissions.

## 8. Gates

Before completion:

```text
Actual diff
→ Diff Scope Gate
→ Contract / verification evidence
→ Capability Gate for T2
```

Do not self-certify completion. `CAPABILITY_PASS` requires the gate's applicable obligations and evidence.

## 9. Evidence

Never claim implemented, verified, benchmarked, recovered, secure, or release-ready without actual evidence.

Evidence MUST reference the exact evaluated commit, environment, commands, results, limitations, and contract version.

## 10. Stop conditions

STOP and report BLOCKED on:

```text
contract conflict
ambiguous ownership
security bypass
cross-tenant leakage
stale writer acceptance
unbounded resource behavior
unproven recovery
scope drift
semantic drift
P0/P1 defect
fabricated/mismatched evidence
```

## 11. Final rule

> **Load the minimum correct context. Define the boundary. Freeze the scope. Implement the repository contract. Prove the diff and capability. Never redesign the architecture while coding.**
