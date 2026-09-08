# D1-Fabric Development Protocol

**Version:** 1.3
**Status:** ACTIVE
**Authority:** `D1-FABRIC-1.0-CONTRACT-BASELINE.md`

## 1. Purpose

Single execution protocol with proportional rigor. The process must prevent semantic drift without turning local work into repository-wide ceremony.

> One capability, one appropriate contract set, one boundary, one declared scope, one proof trail.

## 2. Development Modes

```text
T0 Trivial:
inspect → change → targeted check → commit

T1 Local semantic:
route contracts → Semantic Map → Module Boundary Card → scoped Manifest
→ implement → targeted verify → Diff Scope Gate → evidence → commit

T2 Material / safety-critical:
route contracts → Semantic Map → Execution Packet → Module Boundary Card
→ Change Manifest → implement → targeted verify → Diff Scope Gate
→ adversarial/full applicable verification → evidence → Capability Gate → status → commit
```

Use the lowest safe mode. A task touching security, state ownership, routing/epoch, recovery, public compatibility, schema compatibility, cross-shard correctness, or hot-path performance MUST NOT be downgraded below T1/T2 as applicable.

## 3. Read and Resolve

Inspect `AGENTS.md`, Contract Baseline, routed contracts, relevant code/tests, and current status. Load the smallest relevant contract set and expand only when the boundary proves another concern is affected.

If authoritative requirements conflict, STOP. Never invent a compromise in code.

## 4. Semantic Contract Map

T1/T2 behavior changes require a compact map covering capability, contracts/version, semantic owners, authoritative state, trust boundary, routing/epoch, authorization, consistency/idempotency, resource budgets, failure/recovery, compatibility, verification obligations, and forbidden behavior.

The map is an interpretation artifact, not authority. Every applicable MUST must map to evidence.

## 5. Module Boundary Card

T1/T2 work requires `templates/MODULE-BOUNDARY-CARD.md` before implementation. It defines responsibility/non-responsibility, semantic ownership, interfaces, state, dependencies, resource limits, security boundary, failure/recovery ownership, and verification obligations.

No silent transfer of semantics between modules.

## 6. Execution Packet and Change Manifest

T2 requires `templates/EXECUTION-PACKET.md`. T1/T2 require `templates/CHANGE-MANIFEST.md` before coding. Freeze relevant files, schema, dependencies, public interfaces, configuration, runtime behavior, and verification artifacts.

Necessary contract-compatible corrections outside the manifest require an explicit revision with reason and verification.

## 7. Implementation

Implement the smallest complete solution. Prefer existing correct primitives, one primary execution path, one authoritative owner, minimal D1 operations, minimal network hops, and minimal dependencies.

No speculative Workers, queues, caches, coordinators, retry layers, persistent state, dependencies, or abstractions without requirement + invariant + measurable benefit + real boundary + verification.

## 8. Immediate Verification

Verify each coherent implementation boundary immediately. Do not accumulate a large unverified diff.

## 9. Diff Scope Gate

Before completion, evaluate `templates/DIFF-SCOPE-GATE.md` against the actual diff.

`SCOPE_DRIFT` or `BLOCKED` prevents completion until the scope is corrected or formally revised.

## 10. Contract-Driven Adversarial Verification

Required for T2 and any T1 change touching a protected boundary. Derive critical negative tests independently from contract obligations, including where applicable:

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
expired/superseded knowledge
authority downgrade
```

## 11. Full Applicable Verification

Select only applicable levels:

```text
V0 Static
V1 Unit
V2 Integration
V3 Runtime
V4 Contract/Invariant
V5 Concurrency/Overload
V6 Failure/Recovery
V7 Security/Isolation
V8 Performance/Cost/Regression
V9 Soak/Operational
```

Omitted levels and reasons must be recorded. Unknown/unproven is not PASS.

## 12. Evidence

Evidence identifies the exact evaluated commit, contract/version, environment, commands, inputs/outputs, metrics where relevant, limitations, and status. Wrong-commit or fabricated evidence is invalid.

## 13. Capability Gate

T2 capabilities MUST pass `templates/CAPABILITY-GATE.md` before `CAPABILITY_PASS` or `RELEASE_READY`.

The gate verifies scope, contract obligations, module boundary, security, routing/epoch/ownership, idempotency/retry, resource bounds, recovery, compatibility, negative paths, applicable performance/cost claims, regression, and evidence provenance.

The implementation agent cannot self-certify completion without evidence.

## 14. Independent Review

T2 capabilities require an independent verification path able to challenge contract interpretation, module ownership, invariants, security, recovery, performance claims, and evidence provenance. T1 review is risk-based.

## 15. Contract Evolution

Changes to MUSTs, invariants, semantic owners, protocol meaning, schema compatibility, security boundaries, routing/epoch semantics, recovery rules, or AI authority require versioned contract evolution before implementation.

## 16. AI Coding Rule

DeepSeek is an implementation agent, not architecture authority. It MUST obey the change classification, route only required context, define the boundary, freeze scope, implement only the approved change, verify immediately, pass the Diff Scope Gate, and pass the Capability Gate when T2.

## 17. Efficiency

Use the smallest safe mode, smallest routed contract set, smallest artifact set, smallest complete implementation, and smallest verification set that completely covers the actual risk and obligations.

## 18. Stop Conditions

Stop on contract conflict, ambiguous ownership, auth bypass, cross-tenant leakage, stale writer acceptance, corruption/loss risk, unbounded D1 I/O/fan-out/retry/queue, unproven recovery, schema incompatibility, scope drift, fabricated evidence, P0/P1 defect, regression, or semantic/architecture drift.

## 19. Final Gate

```text
T0 → targeted proof
T1 → Diff Scope Gate
T2 → Diff Scope Gate + Capability Gate
```

> **Use the smallest workflow that is safe. Prove the boundary. Prove the diff. Prove the capability.**
