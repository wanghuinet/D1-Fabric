# D1-Fabric Development Protocol

**Version:** 1.0
**Status:** ACTIVE
**Authority:** D1-FABRIC-1.0-CONTRACT-BASELINE.md

## 1. Purpose

This is the single execution protocol for implementing D1-Fabric capabilities.

It does not replace the 1.0 contracts. It operationalizes them.

Core law:

> **One capability, one execution packet, one frozen change manifest, one verification record, one evidence trail.**

## 2. Source of Truth

Use this precedence:

```text
1. Contract Baseline
2. Applicable 1.0 Contracts
3. AGENTS.md
4. DEVELOPMENT-PROTOCOL.md
5. Existing verified implementation
6. Execution Packet
7. Chat discussion
```

Chat cannot override repository contracts.

## 3. Standard Lifecycle

Every non-trivial capability follows:

```text
READ
→ RESOLVE CONTRACT
→ DEFINE EXECUTION PACKET
→ FREEZE CHANGE MANIFEST
→ IMPLEMENT
→ TARGETED VERIFY
→ FULL APPLICABLE VERIFY
→ GENERATE EVIDENCE
→ INDEPENDENT REVIEW
→ UPDATE STATUS
→ COMMIT
```

Do not skip a stage because implementation appears simple.

## 4. READ

Before coding, inspect:

- repository tree
- AGENTS.md
- Contract Baseline
- applicable contracts
- relevant implementation
- relevant tests
- current capability status

Do not infer missing architecture from conversation history when repository contracts exist.

## 5. RESOLVE CONTRACT

Identify:

```text
capability
applicable contracts
requirements
invariants
state touched
semantic owners
hot path/control path
resource budgets
security boundary
failure/recovery behavior
compatibility boundary
verification obligations
```

If requirements conflict, stop and resolve the contract before coding.

## 6. EXECUTION PACKET

Every non-trivial task MUST have a compact packet using `templates/EXECUTION-PACKET.md`.

It defines the smallest complete implementation and its acceptance criteria.

## 7. CHANGE MANIFEST

Before implementation, freeze:

```text
files allowed to change
files explicitly forbidden
schema changes
dependencies
public interfaces
configuration
tests/evidence to add
```

Anything outside the manifest requires re-evaluation before implementation.

## 8. MINIMUM IMPLEMENTATION

Implement the smallest complete solution that satisfies the contracts.

Do not add:

```text
abstractions
Workers
queues
retries
caches
persistent state
dependencies
network hops
coordinators
```

unless the requirement, invariant, measurable benefit, and boundary are explicit.

## 9. HOT PATH RULE

Hot-path execution MUST remain deterministic and bounded.

Runtime AI MUST NOT be required for correctness.

The baseline path MUST remain functional when AI, cache, control-plane optimization, or non-authoritative derived state is unavailable.

## 10. IMPLEMENTATION ORDER

Prefer:

```text
correct state model
→ ownership
→ validation/security
→ deterministic routing
→ bounded execution
→ commit semantics
→ failure handling
→ observability
→ optimization
```

Do not optimize an unverified semantic design.

## 11. IMMEDIATE TARGETED VERIFICATION

After each coherent implementation unit, run the smallest relevant verification immediately.

Do not accumulate a large unverified diff.

If targeted verification fails, diagnose and correct before expanding scope.

## 12. FULL APPLICABLE VERIFICATION

After implementation, execute the verification levels required by the Verification and Evidence Contract.

At minimum determine applicability of:

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

## 13. NEGATIVE-FIRST REVIEW

Before declaring completion, explicitly test the dangerous paths:

```text
wrong tenant
unauthorized request
stale epoch
wrong owner
duplicate write
ambiguous commit
partial shard failure
migration interruption
schema mismatch
cache poisoning
resource exhaustion
```

Only applicable cases need execution, but applicability MUST be recorded.

## 14. EVIDENCE

Create the evidence record using `templates/EVIDENCE-RECORD.md`.

Evidence MUST identify the exact commit, environment, commands, inputs, outputs, limitations, and status.

Never write evidence from memory.

## 15. INDEPENDENT REVIEW

Critical capabilities require an independent verification path.

The reviewer MUST be able to challenge:

```text
requirements
state ownership
invariants
test completeness
evidence provenance
performance claims
recovery claims
security claims
```

## 16. STATUS TRANSITION

Status moves only when evidence satisfies its definition.

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

## 17. COMMIT

A capability commit MUST contain only the approved change set plus required evidence/documentation.

Commit message SHOULD identify capability and completion stage.

Do not commit unrelated cleanup.

## 18. STOP CONDITIONS

Stop immediately on:

```text
contract conflict
ambiguous ownership
auth bypass
cross-tenant leakage
stale writer acceptance
unbounded D1 I/O
unbounded fan-out/retry/queue
corruption/loss risk
unproven recovery
schema incompatibility
fabricated evidence
wrong-commit evidence
P0/P1 defect
```

## 19. AI CODING RULE

DeepSeek MUST behave as an implementation agent, not an architecture authority.

It may propose alternatives, but it MUST NOT silently change frozen contracts or architecture.

When the repository and prompt disagree, repository authority wins according to the source-of-truth order.

## 20. AI OPTIMIZATION RULE

Optimization follows:

```text
observe
→ analyze
→ hypothesis
→ candidate
→ validate
→ benchmark
→ canary
→ measure
→ promote/reject
→ learn
```

No AI optimization is production-valid solely because it has higher model confidence.

## 21. No Fabricated Completion

The agent MUST NOT claim:

```text
implemented
verified
benchmarked
recovered
secure
release-ready
```

unless the corresponding evidence exists.

## 22. Efficiency Rule

The protocol is intentionally compact.

Prefer one complete capability implementation over a chain of artificially fragmented subtasks.

Use the smallest test set that completely covers the applicable contracts and boundaries.

## 23. Final Gate

A capability is complete only when:

```text
scope satisfied
contracts satisfied
invariants verified
negative paths covered
resource bounds proven
security covered
failure/recovery covered where applicable
compatibility covered where applicable
performance/cost claims evidenced where applicable
regression passed
evidence recorded
status justified
```

Final law:

> **Build once against the contract, verify immediately, prove with evidence, then move on.**
