# D1-Fabric AI Engineering Instructions

**Version:** 9.5
**Status:** ACTIVE / 3.0 MASTER-LOCKED / 3.2 FOUNDATION GOVERNANCE R1 CLOSURE / COMPLETE FOUNDATION BASELINE
**Role:** AI唯一入口 / Router。

## 1. Repository authority

The repository is the source of truth. Chat is never an authority.

For 3.0, the single normative authority is:

```text
AGENTS.md
→ docs/D1-FABRIC-3.0-MASTER-CONTRACT-v1.0.md
→ applicable non-conflicting annex / phase packet
```

For 3.2 foundation-governance work:

```text
AGENTS.md
→ Foundation 1.0 Master Capability & Implementation Plan
→ approved Foundation Blueprint amendments
→ Complete Foundation Capability Map / Complete Foundation Contract
→ Open Core Architecture Contract
→ Function Catalog / Capability Registry
→ ADR Registry + ADR records
→ Ownership / Data Ownership
→ Dependency DAG
→ Binding Ownership
→ Contract Registry
→ Runtime Envelope / Release Policy / Exception Registry
→ applicable Module / Task Contract
→ Change Manifest
```

The Foundation 1.0 Master Plan and Complete Foundation Capability Map define the complete long-term planning baseline. The Complete Foundation Contract defines the acceptance and compatibility model. None of these documents independently authorize implementation of every mapped capability until the applicable capability is promoted through the Foundation Freeze / machine governance gates.

Historical documents and code under paths declared by `.d1-fabric/registry/legacy.json` have no active 3.2 authority and are read-only historical material.

## 2. Mandatory read order

For every 3.2 foundation task:

```text
AGENTS.md
→ Foundation 1.0 Master Capability & Implementation Plan
→ Foundation Blueprint / approved amendment
→ Complete Foundation Capability Map / Contract
→ relevant ADR
→ Capability Registry
→ Ownership + Data Ownership
→ Dependency DAG
→ Binding Ownership
→ Contract Registry
→ Runtime Envelope / Release Policy / Exceptions
→ exact task scope
→ minimum relevant source/tests
→ Change Manifest
```

If any active authority is missing or contradictory, STOP. Never substitute a historical file by guess.

## 3. AI authority boundary

GPT is the primary implementation and verification agent for the current development cycle. GPT is an implementation executor, not an authority to redesign architecture, product semantics, ownership, security policy, or scope.

GPT MUST NOT independently add, split, or merge Workers; create speculative infrastructure; change semantic ownership; invent protocol semantics; put business meaning into middleware; implement future-phase features; weaken/delete tests; modify a contract merely to fit code; or fabricate evidence.

Conflict or genuine architecture defect:

```text
STOP → record exact conflict → versioned proposal/change approval → implement
```

## 4. Current runtime topology

The currently approved independently deployable execution boundaries are exactly W01 Fabric Gateway, W02 Execution Fabric, W03 Write Fabric and W04 Control Plane. Reliability and placement/migration are capability domains, not additional Workers at the current foundation baseline. W05/W06 MUST NOT be created or deployed without an approved topology ADR.

## 5. Non-negotiable 3.0 locks

All eight Master Contract hardening controls remain release-blocking: H01 Single Master Contract Authority; H02 Budget Reservation / Consumption / Hard-Stop; H03 Atomic Idempotency; H04 Distributed Quota Guarantee Levels; H05 Control-Plane Epoch + LKG Fencing; H06 Cache / Cursor / Extension Security Binding; H07 Numeric Capacity Envelope; H08 Executable Phase Packets + Machine-Verifiable Evidence.

## 6. 3.2 Foundation Governance Law

The canonical machine authorities are:

```text
.d1-fabric/registry/capabilities.json
.d1-fabric/registry/adrs.json
.d1-fabric/registry/ownership.json
.d1-fabric/registry/data-ownership.json
.d1-fabric/registry/dependencies.json
.d1-fabric/registry/bindings.json
.d1-fabric/registry/legacy.json
.d1-fabric/registry/contracts.json
.d1-fabric/registry/runtime-envelope.json
.d1-fabric/registry/release-policy.json
.d1-fabric/registry/exceptions.json
.d1-fabric/change-manifest.json
```

The canonical validator is:

```text
python3 tools/governance/validate_foundation.py
```

A governance PASS means these rules were actually evaluated. Documentation-presence checks alone are not architecture enforcement.

### 6.1 Legacy isolation

Paths declared in `legacy.json` are historical and read-only. New-version code MUST NOT import, depend on, register, bind, deploy, or use them as implementation authority. Any legacy mutation is FAIL unless an explicit, scoped, expiring legacy-repair authorization is present. There are no permanent legacy exceptions.

### 6.2 Contract law

Contracts are versioned and backward-compatible by default. Breaking changes require a new version, ADR, migration plan and verification evidence.

### 6.3 Data ownership law

Every authoritative mutable state has exactly one logical owner. Cross-owner direct mutation is forbidden. Cache is never authoritative. Unregistered authoritative state is forbidden.

### 6.4 Runtime envelope law

Fan-out and retry behavior are bounded by the registered runtime envelope. A task may declare tighter limits but may not silently expand the registered ceiling.

### 6.5 Release law

Release admission requires governance PASS, applicable tests, architecture review and reproducible evidence. Major-stage completion requires GPT STOP and explicit user approval before the next stage.

### 6.6 Exception law

Exceptions default to DENY. Any approved exception requires an owner, reason, scope, expiry and rollback/recovery intent. Permanent exceptions are forbidden; expired exceptions are invalid.

### 6.7 Complete Foundation Law

The Foundation 1.0 Master Plan defines the complete capability discovery, dependency ordering and implementation sequence. The Complete Foundation Capability Map defines the target capability surface. The Complete Foundation Contract defines acceptance and compatibility. These documents are planning/contract authorities but are not blanket implementation authorization.

Every capability must move through:

```text
PLAN
→ GAP / DEPENDENCY REVIEW
→ CONTRACT
→ REGISTRY
→ OWNERSHIP / DAG / BINDINGS
→ CHANGE MANIFEST
→ IMPLEMENT
→ TEST
→ RUNTIME / SECURITY / COST VERIFICATION
→ EVIDENCE
→ INDEPENDENT REVIEW
→ PASS
```

## 7. Scope discipline

Every T1/T2 task requires a Change Manifest and Diff Scope Gate. No drive-by refactor, dependency, schema, API, Worker, or infrastructure change. Every changed file must be justified by the active manifest.

## 8. Mandatory post-task independent review gate

```text
IMPLEMENT
→ TEST
→ SCOPE / ARCHITECTURE CHECK
→ COMMIT
→ PUSH TO GITHUB
→ VERIFY EXACT SHA
→ GPT INDEPENDENT REVIEW
→ FIX ONLY IDENTIFIED CONTRACT-PRESERVING DEFECTS
→ TEST AGAIN
→ FINAL PASS / FAIL EVIDENCE
→ STOP
```

## 9. Current foundation sequence

```text
R0 Authority Reconciliation = PASS
→ R1 Executable Governance Foundation = CLOSURE IN PROGRESS
→ Complete Foundation Capability Baseline = RECONCILED / PROPOSED FOR FREEZE
→ R2 Contract + Runtime Enforcement = LOCKED
→ R3 Reliability + Cost + Observability = LOCKED
→ R4 Full Foundation CI = LOCKED
→ R5 Blueprint APPROVED / FROZEN = LOCKED
→ explicit user approval
→ R6 GPT implementation stages
```

No new major product implementation stage may be inferred from a governance or planning PASS.

## 10. Final rule

> Use the authoritative contract and executable foundation governance as the source of truth. Solve only the declared task, implement the minimum correct boundary, prove all release-blocking invariants, push the verified commit, run the mandatory review gate, record reproducible evidence, and stop.
