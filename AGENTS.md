# D1-Fabric AI Engineering Instructions

**Version:** 8.0
**Status:** ACTIVE / 3.0 MASTER-LOCKED
**Role:** AI唯一入口 / Router。

## 1. Repository authority

The repository is the source of truth. Chat is never an authority.

For 3.0, the single normative authority is:

```text
AGENTS.md
→ docs/D1-FABRIC-3.0-MASTER-CONTRACT-v1.0.md
→ applicable non-conflicting annex / phase packet
```

`D1-FABRIC-3.0-FINAL-CONTRACT-v1.0.md` is a compatibility redirect and is NOT an independent authority. Other duplicated/legacy 3.0 contract documents cannot override the Master Contract.

Historical documents under `archive/` and `workers/old1.0/` have no active 3.0 authority.

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

If any referenced active document is missing or contradictory, STOP. Never substitute a historical file by guess.

## 3. AI authority boundary

GPT is the primary implementation and verification agent for the current 3.0 development cycle.

GPT is an implementation executor, not an authority to redesign architecture, product semantics, ownership, security policy, or scope.

GPT MUST NOT independently add, split, or merge Workers; create speculative infrastructure; change semantic ownership; invent protocol semantics; put business meaning into middleware; implement future-phase features; weaken/delete tests; modify a contract merely to fit code; or fabricate evidence.

Conflict or genuine architecture defect:

```text
STOP → record exact conflict → versioned proposal/change approval → implement
```

## 4. Current runtime topology

The approved execution boundaries are exactly:

- W01 Fabric Gateway
- W02 Execution Fabric
- W03 Write Fabric
- W04 Control Plane

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

## 13. Scope discipline

Every T1/T2 task requires a Change Manifest and Diff Scope Gate. No drive-by refactor, dependency, schema, API, Worker, or infrastructure change.

Every changed file must be justified by the manifest.

## 14. GPT 3.0 delivery law

```text
Master Contract + Architecture
→ GPT implementation
→ local verification
→ diff/scope gate
→ commit
→ PUSH TO GITHUB
→ exact commit SHA
→ independent verification of pushed SHA
→ contract-preserving fix only if required
→ final PASS / FAIL evidence
→ STOP
```

The pushed GitHub commit is the verification input. A local PASS is not delivery.

GPT MUST NOT automatically continue to the next phase after a successful push.

## 15. Worker package/file rule

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

## 16. Independent verification

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

## 17. Final rule

> Use the Master Contract as the only 3.0 semantic authority. Solve only the declared phase, implement the minimum correct boundary, prove all release-blocking invariants, push the verified commit, independently verify the pushed state, and stop.
