# D1-Fabric Development Protocol

**Version:** 1.1
**Status:** ACTIVE
**Authority:** D1-FABRIC-1.0-CONTRACT-BASELINE.md

## 1. Purpose

Single execution protocol for implementing D1-Fabric capabilities.

> One capability, one Semantic Contract Map, one execution packet, one frozen change manifest, one verification record, one evidence trail.

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

Chat cannot override repository contracts.

## 3. Standard Lifecycle

```text
READ
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

Do not skip a stage because implementation appears simple.

## 4. Read and Resolve

Inspect repository tree, AGENTS.md, Contract Baseline, applicable contracts, relevant implementation/tests, and current capability status.

Identify capability, requirements, invariants, state touched/owners, hot/control path, budgets, security, failure/recovery, compatibility, and verification obligations.

If authoritative requirements conflict, STOP. Do not invent a compromise in code.

## 5. Semantic Contract Map

Before coding, create a compact map covering:

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

The map is an interpretation artifact, not a new authority. Every contract MUST in the map must map to verification evidence before completion.

## 6. Execution Packet

Use `templates/EXECUTION-PACKET.md` for:

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

## 7. Frozen Change Manifest

Freeze files, schema, dependencies, public interfaces, configuration, runtime behavior, and verification artifacts. Anything outside the manifest requires re-evaluation before implementation.

## 8. Minimum Implementation

Implement the smallest complete solution. Do not add abstractions, Workers, queues, retries, caches, persistent state, dependencies, network hops, or coordinators without requirement + invariant + measurable benefit + real boundary + verification method.

## 9. Hot Path

Hot-path execution MUST be deterministic and bounded. Runtime AI MUST NOT be required for correctness. AI-derived configuration may be consumed only after deterministic validation and within explicit validity/version bounds.

## 10. Implementation Order

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

## 11. Immediate Targeted Verification

After each coherent implementation unit, run the smallest relevant verification immediately. Do not accumulate a large unverified diff.

## 12. Contract-Driven Adversarial Verification

Independent verification MUST derive dangerous tests from contract obligations rather than only from implementation-authored tests.

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

A compilation/test pass cannot override an unverified contract obligation.

## 13. Full Applicable Verification

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

Applicability and omissions MUST be recorded.

## 14. Evidence

Evidence MUST identify exact commit, contract/version, environment, commands, inputs, outputs, metrics, limitations, and status. Evidence MUST be generated from the actual evaluated commit.

Never report PASS from source inspection, compilation, model confidence, or unrun tests.

## 15. Independent Review

Critical capabilities require an independent verification path able to challenge requirements, semantic ownership, invariants, test completeness, evidence provenance, performance, recovery, and security claims.

The independent reviewer MUST NOT treat implementation-authored tests as the only oracle.

## 16. Status

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

## 17. Commit

A capability commit contains only the approved change set plus required evidence/documentation. No unrelated cleanup.

## 18. Contract Evolution

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

## 19. AI Coding Rule

DeepSeek is an implementation agent, not architecture authority. It MUST read repository contracts, build the Semantic Contract Map, freeze scope, implement only the manifest, verify immediately, run adversarial verification, trace MUST obligations to evidence, and stop on semantic conflict.

## 20. AI Optimization Rule

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

## 21. No Fabricated Completion

The agent MUST NOT claim implemented, verified, benchmarked, recovered, secure, or release-ready unless corresponding evidence exists.

## 22. Efficiency

Prefer one complete capability over artificial fragmentation. Use the smallest test set that completely covers applicable contracts and boundaries.

## 23. Stop Conditions

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

## 24. Final Gate

A capability is complete only when scope, contracts, semantic map, invariants, negative paths, resource bounds, security, applicable recovery, compatibility, performance claims, regression, evidence, and status are all justified.

> **Build against the contract, prove semantics independently, then move on.**
