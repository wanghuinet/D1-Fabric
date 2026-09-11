# D1-Fabric AI Engineering Instructions

**Version:** 9.2
**Status:** ACTIVE / 3.0 MASTER-LOCKED / 3.2 FOUNDATION GOVERNANCE R1
**Role:** AI唯一入口 / Router。

## 1. Repository authority

The repository is the source of truth. Chat is never an authority.

For 3.0, the single normative authority is:

```text
AGENTS.md
→ docs/D1-FABRIC-3.0-MASTER-CONTRACT-v1.0.md
→ applicable non-conflicting annex / phase packet
```

For the 3.2 foundation-governance workstream, the current authority is:

```text
AGENTS.md
→ approved Foundation Blueprint amendments
→ Open Core Architecture Contract
→ Function Catalog / .d1-fabric/registry/capabilities.json
→ .d1-fabric/registry/adrs.json + docs/adr/
→ .d1-fabric/registry/ownership.json
→ .d1-fabric/registry/dependencies.json
→ .d1-fabric/registry/bindings.json
→ applicable Module / Task Contract
→ .d1-fabric/change-manifest.json
```

Historical documents under `archive/` and `workers/old1.0/` have no active 3.0/3.2 authority.

## 2. Mandatory read order

For every 3.0 task:

```text
AGENTS.md
→ D1-FABRIC-3.0-MASTER-CONTRACT-v1.0.md
→ applicable architecture/resilience annex
→ exact phase packet
→ minimum relevant source/tests
→ Change Manifest
```

For every 3.2 foundation task:

```text
AGENTS.md
→ Foundation Blueprint / approved amendment
→ relevant ADR
→ Capability Registry
→ Ownership Map
→ Dependency DAG
→ Binding Ownership
→ Module / Contract definition
→ exact task scope
→ minimum relevant source/tests
→ Change Manifest
```

If any referenced active document is missing or contradictory, STOP. Never substitute a historical file by guess.

## 3. AI authority boundary

GPT is the primary implementation and verification agent for the current development cycle.

GPT is an implementation executor, not an authority to redesign architecture, product semantics, ownership, security policy, or scope.

GPT MUST NOT independently add, split, or merge Workers; create speculative infrastructure; change semantic ownership; invent protocol semantics; put business meaning into middleware; implement future-phase features; weaken/delete tests; modify a contract merely to fit code; or fabricate evidence.

Conflict or genuine architecture defect:

```text
STOP → record exact conflict → versioned proposal/change approval → implement
```

## 4. Current runtime topology

The currently approved independently deployable execution boundaries are exactly:

- W01 Fabric Gateway
- W02 Execution Fabric
- W03 Write Fabric
- W04 Control Plane

Reliability and placement/migration are capability domains, not additional Workers at the current foundation baseline. W05/W06 MUST NOT be created or deployed without an approved topology ADR establishing the independent deployment boundary.

Cache is a read-path capability, not a mandatory standalone network hop. Observability is emitted by the executing boundary, not a synchronous telemetry Worker.

No additional Worker is justified merely because a capability has a separate name.

## 5. Non-negotiable 3.0 locks

All eight Master Contract hardening controls are release-blocking:

```text
H01 Single Master Contract Authority
H02 Budget Reservation / Consumption / Hard-Stop
H03 Atomic Idempotency
H04 Distributed Quota Guarantee Levels
H05 Control-Plane Epoch + LKG Fencing
H06 Cache / Cursor / Extension Security Binding
H07 Numeric Capacity Envelope
H08 Executable Phase Packets + Machine-Verifiable Evidence
```

A failure in any H01-H08 means 3.0 is NOT production-ready.

Additional invariants:

- One semantic concern has one owner.
- One authoritative mutable state has one owner.
- Business owns meaning; middleware owns generic capability.
- No unbounded D1 I/O, fan-out, retries, payloads, or synchronous side-effect cascades.
- No mandatory global coordinator on the hot path without explicit approval.
- Partial failure must not corrupt committed state.
- Recovery must restore invariants before normal admission.
- Public compatibility cannot silently change.
- Public APIs never expose shard/physical D1/SQL/internal Worker details.
- Every execution has explicit resource budgets.
- Cache HIT with terminal permission produces zero D1 execution.
- AI-generated operations are validated against the same runtime contracts.
- No middleware Worker contains business semantics.
- D1 overload must not become retry amplification.
- Noisy-neighbor behavior must remain within its declared quota guarantee.
- Saturation acceptance is bounded degradation, never an infinite-throughput promise.

## 6. Budget enforcement law

Budget fields are not advisory.

Every execution MUST enforce reservation, consumption, release and hard-stop semantics before downstream dispatch/retry. No downstream path may bypass the budget ledger.

```text
DECLARED → RESERVED → IN_FLIGHT → CONSUMED
                         ↘ RELEASED
```

## 7. Idempotency law

Retryable mutations require an idempotency contract. Single-shard exactly-once-effect mutations require idempotency state and authoritative mutation to share the same atomic D1 transaction boundary where applicable. Unknown timeout outcomes MUST NOT be blindly retried as fresh writes.

Cross-shard retryable mutations require a separately approved contract.

## 8. Quota / isolation law

Every quota declares a guarantee level. Local counters MUST NOT be represented as global hard limits. Tenant/application/caller/object limits must declare scope and degradation semantics.

## 9. Control epoch law

Every execution uses one immutable control epoch. LKG use requires validation, non-expiry, and no revocation/fencing. Stale or retired write routes are rejected, never guessed.

## 10. Security state-binding law

Cache keys and cursors must bind the minimum required tenant, authorization scope, operation, and contract/query version. Cursor integrity and bounded lifetime are mandatory. Extension metadata is data, never executable authority.

## 11. Capacity law

A capacity claim is invalid without a numeric baseline including RPS, burst, concurrency, duration, workload mix, latency targets, error ceiling, retry amplification, and resource ceilings. Qualification must prove bounded degradation and recovery.

## 12. Executable phase law

P01-P16 are executable gates. Each phase must have a committed packet with allowed/forbidden files, exact invariants, failure/security/resource cases, test commands, thresholds, evidence schema, and stop condition.

A PASS must bind contract IDs, architecture IDs, changed files, tests, commit SHA, CI/result reference, and reproducible evidence.

## 13. Mandatory post-task independent review gate

Every completed implementation task MUST stop for GPT review before the next task or phase begins.

The required loop is:

```text
IMPLEMENT
→ TEST
→ SCOPE / ARCHITECTURE CHECK
→ COMMIT
→ PUSH TO GITHUB
→ VERIFY EXACT PUSHED SHA
→ GPT INDEPENDENT REVIEW
→ FAIL? FIX ONLY THE IDENTIFIED CONTRACT-PRESERVING DEFECT
→ TEST AGAIN
→ COMMIT / PUSH
→ GPT RE-REVIEW
→ PASS + REPRODUCIBLE EVIDENCE
→ ONLY THEN NEXT TASK
```

A passing implementation test is not sufficient. Review MUST inspect contract conformance, architecture ownership, correctness, failure behavior, security, resource budgets, regression risk, and evidence. A task without GPT review is `FAIL_REVIEW_GATE` and MUST NOT advance.

The reviewer MUST treat the pushed GitHub SHA as the review input. Review is not a design rewrite and cannot silently expand scope.

## 14. Scope discipline

Every T1/T2 task requires a Change Manifest and Diff Scope Gate. No drive-by refactor, dependency, schema, API, Worker, or infrastructure change.

Every changed file must be justified by the manifest. The machine gate is `tools/governance/validate_foundation.py` and MUST fail the workflow when a changed file is outside the active manifest.

## 15. GPT delivery law

```text
Master Contract + Foundation Governance
→ GPT implementation
→ local verification
→ machine governance gate
→ diff/scope gate
→ commit
→ PUSH TO GITHUB
→ exact commit SHA
→ independent verification of pushed SHA
→ GPT review gate
→ contract-preserving fix only if required
→ final PASS / FAIL evidence
→ STOP
```

GPT MUST NOT automatically continue to the next major stage after a successful review.

## 16. Worker package/file rule

Every independently deployable Worker retains its own package boundary:

```text
workers/v2/<worker>/
  package.json
  wrangler.toml
  src/index.ts
  tests/
```

Shared TypeScript contracts belong under `workers/v2/contracts/`.

Worker runtime code is TypeScript. PowerShell is not a substitute for Worker runtime code. Dependencies must not be collapsed into a giant root package.

## 17. Independent verification

Verification MUST inspect the exact pushed commit and independently check:

```text
package/file layout
architecture ownership
Master Contract → Code → Test mapping
resource reservation/consumption/hard-stop
security and state binding
failure/concurrency/idempotency
control epoch/LKG fencing
quota guarantee level
capacity envelope
regression
Architecture → Contract mapping
Contract → Architecture mapping
API completeness
adversarial/extreme-traffic matrix
noisy-neighbor isolation
D1 overload containment
backpressure/degradation
evidence reproducibility
```

Verification may perform only contract-preserving refactoring. It may not add product/business functionality or change architecture.

## 18. 3.2 Foundation Governance Law

The 3.2 foundation work exists to make architecture rules executable rather than dependent on GPT memory.

The following are now machine-readable governance authorities:

```text
.d1-fabric/registry/capabilities.json
.d1-fabric/registry/adrs.json
.d1-fabric/registry/ownership.json
.d1-fabric/registry/dependencies.json
.d1-fabric/registry/bindings.json
.d1-fabric/change-manifest.json
```

The repository MUST enforce:

- capability registration and required capability metadata;
- ADR ID/status/record integrity;
- Worker/module ownership;
- dependency DAG acyclicity and forbidden import direction;
- least-privilege Cloudflare service bindings;
- reserved W05/W06 deployment rejection;
- Change Manifest / Diff Scope Gate;
- reproducible governance evidence.

The canonical validator is:

```text
python3 tools/governance/validate_foundation.py
```

A governance PASS means these rules were actually evaluated. Documentation-presence or keyword-presence checks MUST NOT be represented as architecture enforcement.

Foundation implementation proceeds in this order:

```text
R0 Authority Reconciliation
→ R1 Executable Governance Foundation
→ R2 Contract + Runtime Enforcement
→ R3 Reliability + Cost + Observability
→ R4 Full Foundation CI
→ R5 Blueprint APPROVED / FROZEN
→ explicit user approval
→ R6 GPT implementation stages
```

Until R5 is PASS, no new major product implementation stage may be inferred.

## 19. Foundation stage stop rule

Within an explicitly approved foundation stage GPT may implement continuously within the frozen scope.

At the end of the stage:

```text
all applicable CI green
→ architecture audit PASS
→ evidence captured
→ GPT STOP
→ explicit user approval required
```

No user approval may be inferred from a prior approval of a different stage.

## 20. Final rule

> Use the authoritative contract and executable foundation governance as the source of truth. Solve only the declared task, implement the minimum correct boundary, prove all release-blocking invariants, push the verified commit, run the mandatory review gate, record reproducible evidence, and stop.
