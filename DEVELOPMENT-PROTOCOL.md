# D1-Fabric Development Protocol

**Version:** 1.2
**Status:** ACTIVE
**Authority:** D1-FABRIC-1.0-CONTRACT-BASELINE.md

## 1. Purpose

Single execution protocol for implementing D1-Fabric capabilities.

> One capability, one appropriate contract set, one Semantic Contract Map when semantics change, one scoped change manifest, one verification record, one evidence trail.

The protocol is intentionally proportional: trivial changes use a light path; semantic changes use the full path.

## 2. Source of Truth

```text
1. Contract Baseline
2. Applicable versioned contracts
3. AGENTS.md
4. DEVELOPMENT-PROTOCOL.md
5. Existing verified implementation
6. Execution Packet / Change Manifest
7. Chat discussion
```

Chat cannot override repository contracts.

## 3. Change Classification

Every task MUST be classified before implementation:

```text
T0 — Non-semantic
    docs, formatting, comments, mechanical renames with proven no behavior change

T1 — Local semantic
    one bounded module/path, no contract meaning change, no cross-boundary ownership/routing/recovery/security change

T2 — Cross-boundary / safety-critical
    state ownership, routing, epoch/fencing, security, consistency, retry semantics, migration, recovery, public protocol, schema compatibility, performance-sensitive hot path, or architecture change
```

Required workflow:

```text
T0 → scoped inspect → change → targeted check → commit
T1 → routed contracts → scoped map → scoped manifest → implement → targeted verification → evidence → commit
T2 → full workflow below
```

Never use T0/T1 to bypass a correctness, security, ownership, recovery, or compatibility requirement.

## 4. Standard T2 Lifecycle

```text
READ ROUTED CONTRACTS
→ RESOLVE CONTRACT
→ BUILD SEMANTIC CONTRACT MAP
→ DEFINE EXECUTION PACKET
→ FREEZE CHANGE MANIFEST
→ IMPLEMENT
→ TARGETED VERIFY
→ CONTRACT-DRIVEN ADVERSARIAL VERIFY
→ FULL APPLICABLE VERIFY
→ GENERATE EVIDENCE
→ INDEPENDENT REVIEW
→ UPDATE STATUS
→ COMMIT
```

## 5. Read and Resolve

Inspect `AGENTS.md`, Contract Baseline, routed contracts, relevant implementation/tests, and current capability status.

Load the smallest relevant contract set. Expand only when the Semantic Contract Map proves another concern is affected.

If authoritative requirements conflict, STOP. Do not invent a compromise in code.

## 6. Semantic Contract Map

Required for T1/T2 changes that affect behavior; compact for T1, complete for T2:

```text
capability
contract/version
semantic owner per concern
authoritative state/state owner
untrusted vs verified input
routing identity
epoch/fencing
authorization/tenant scope
consistency/idempotency
resource budgets
failure/recovery
compatibility
verification obligations
forbidden behavior
```

The map is an interpretation artifact, not a new authority. Every applicable contract MUST map to verification evidence.

## 7. Execution Packet

Required for T2 and optional for T1 when useful. Use `templates/EXECUTION-PACKET.md` for:

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
Security
Failure/recovery
Compatibility
Verification plan
Evidence required
```

## 8. Frozen Change Manifest

T1/T2 changes MUST declare relevant files, schema, dependencies, public interfaces, configuration, runtime behavior, and verification artifacts.

Anything outside the manifest requires re-evaluation before implementation. Necessary contract-compatible corrections MUST be recorded rather than silently absorbed.

## 9. Minimum Implementation

Implement the smallest complete solution. Do not add abstractions, Workers, queues, retries, caches, persistent state, dependencies, network hops, or coordinators without requirement + invariant + measurable benefit + real boundary + verification method.

## 10. Hot Path

Hot-path execution MUST be deterministic and bounded. Runtime AI MUST NOT be required for correctness. AI-derived configuration may be consumed only after deterministic validation and within explicit validity/version bounds.

## 11. Implementation Order

Prefer:

```text
state model
→ ownership
→ validation/security
→ deterministic routing
→ bounded execution
→ commit semantics
→ failure handling
→ observability
→ verification
→ optimization
```

Do not start with framework plumbing or speculative abstractions.

## 12. Immediate Targeted Verification

After each coherent implementation unit, run the smallest relevant verification immediately. Do not accumulate a large unverified diff.

## 13. Contract-Driven Adversarial Verification

Required for T2 and for any T1 change touching a protected boundary. Derive dangerous tests from contract obligations rather than only from implementation-authored tests.

Applicable cases:

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

## 14. Full Applicable Verification

Determine applicability of:

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
V9 Soak
```

Run only levels required by the change classification and Semantic Contract Map. Applicability and omissions MUST be recorded.

## 15. Evidence

T1/T2 evidence MUST identify exact commit, contract/version, environment, commands, inputs, outputs, metrics where relevant, limitations, and status. Evidence MUST be generated from the actual evaluated commit.

Never report PASS from source inspection, compilation, model confidence, or unrun tests.

## 16. Independent Review

T2 capabilities require an independent verification path able to challenge requirements, semantic ownership, invariants, test completeness, evidence provenance, performance, recovery, and security claims. T1 requires independent review when risk or contract boundaries justify it.

The independent reviewer MUST NOT treat implementation-authored tests as the only oracle.

## 17. Status

```text
READY
→ IN_PROGRESS
→ LOCAL_PASS
→ CONTRACT_PASS
→ INTEGRATION_PASS
→ REGRESSION_PASS
→ CAPABILITY_PASS
→ RELEASE_READY
→ RELEASED
```

Failure or unsafe uncertainty moves to `FAILED` or `BLOCKED`.

## 18. Commit

A capability commit contains only the approved change set plus required evidence/documentation. No unrelated cleanup.

## 19. Contract Evolution

A change to a `MUST`, invariant, semantic owner, protocol meaning, schema compatibility, security boundary, routing/epoch meaning, recovery rule, or AI authority boundary requires contract revision:

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

Implementation agents may not modify frozen semantics as a convenience.

## 20. AI Coding Rule

DeepSeek is an implementation agent, not architecture authority. It MUST follow the change classification and only load the routed contract set required for that class.

For T1/T2 it MUST build the appropriate Semantic Contract Map, freeze scope, implement the smallest complete change, verify immediately, and stop on semantic conflict.

## 21. AI Optimization Rule

Runtime optimization follows:

```text
Observe
→ Analyze
→ Hypothesize
→ Candidate
→ Validate
→ Benchmark
→ Canary
→ Measure
→ Promote/Reject
→ Learn
```

Material optimization also requires bounded resource budget, expiration, rollback, and authority-downgrade behavior.

## 22. No Fabricated Completion

The agent MUST NOT claim implemented, verified, benchmarked, recovered, secure, or release-ready unless corresponding evidence exists.

## 23. Efficiency

Prefer one complete capability over artificial fragmentation. Use the smallest contract set, artifact set, and test set that completely covers the task's actual risk and obligations.

## 24. Stop Conditions

Stop immediately on:

```text
contract conflict
ambiguous ownership
auth bypass
cross-tenant leakage
stale writer acceptance
unbounded D1 I/O/fan-out/retry/queue
corruption/loss risk
unproven recovery
schema incompatibility
fabricated/wrong-commit evidence
P0/P1 defect
architecture/semantic drift
```

## 25. Final Gate

A T1/T2 capability is complete only when scope, applicable contracts, required semantic map, invariants, negative paths, resource bounds, security, applicable recovery, compatibility, performance claims, regression, evidence, and status are justified.

> **Use the smallest workflow that is safe for the change. Build against the contract, prove semantics where required, then move on.**
