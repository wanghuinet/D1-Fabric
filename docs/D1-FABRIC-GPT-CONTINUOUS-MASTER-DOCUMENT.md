# D1-Fabric GPT Continuous Master Document

Version: 3.2.3  
Status: ACTIVE / SOURCE OF TRUTH FOR GPT CONTINUITY  
Forward Architecture Contract: `docs/D1-FABRIC-3.2-INFRASTRUCTURE-ARCHITECTURE-CONTRACT-v1.0.md`  
Architecture Hardening: `docs/D1-FABRIC-3.2-ARCHITECTURE-HARDENING-AMENDMENT-v1.2.md`  
Architecture Proof: `docs/D1-FABRIC-3.2.3-ARCHITECTURE-PROOF-AND-ENFORCEMENT-CONTRACT-v1.0.md`  
Machine Governance: `docs/D1-FABRIC-3.2.4-MACHINE-GOVERNANCE-ENFORCEMENT-CONTRACT-v1.0.md`  
GPT Execution Router: `docs/D1-FABRIC-3.2-GPT-AUTONOMOUS-EXECUTION-AND-STOP-CONTRACT-v1.0.md`

## 1. Purpose

This document preserves the current architectural direction and development continuity for GPT-led implementation.

Formal contracts remain authoritative. This document determines continuity: what GPT is currently allowed to advance, what it must verify, and where it must stop.

## 2. Current Product Model

D1-Fabric is evolving from a D1 sharding middleware into a Cloudflare-native distributed application infrastructure substrate for AI applications, content platforms, SaaS, games, social applications, APIs and other high-concurrency workloads.

D1 remains a core relational capability, but D1 sharding is a Data Plane capability rather than the top-level product abstraction.

## 3. Architectural Model

The primary abstraction is:

`Application Intent → Identity/Tenant → Capability → Policy → Admission → Placement → Execution → State → Events → Reliability → Observability → Governance`

This is a logical system model, not a worker-per-stage deployment model.

The deployment baseline is exactly:

`W01 Gateway | W02 Execution | W03 Write | W04 Data | W05 Reliability | W06 Control`

## 4. Current Architecture Status

The hardened 3.2 architecture is **NOT YET ACTIVE**.

Current architecture admission state:

`DRAFT / REVIEW REQUIRED → machine governance hardening in progress`

The red-team review remains `NO-GO` until its blocking findings and the final architecture gate are satisfied.

GPT MUST NOT interpret existence of governance code as architecture PASS.

## 5. Current Development Objective

The active objective is:

> Complete the architecture-proof and machine-governance closure required to authorize the next 3.2 code-development phase, without starting that next phase automatically.

The current progression is:

```text
Architecture Hardening
→ Machine Governance
→ Behavioral Governance
→ Failure / Recovery Governance
→ Security / Evidence Freshness
→ Final Architecture Gate
→ READY_FOR_NEXT_CODE_PHASE
→ STOP
```

The next code-development phase is NOT automatically entered after the boundary is reached.

## 6. Machine Governance State

Active governance root:

`.governance/3.2/`

Current registry families include:

- Capability Registry
- ADR Registry
- Ownership Map
- Dependency DAG
- Binding Ownership
- Change Manifest
- Diff Scope Gate
- Historical Isolation
- Evidence Registry

Target enforcement level is Level 6 — Production Admission.

The current repository baseline has begun executable governance, but the existence of schemas and initial CI checks does not by itself establish Level 6.

## 7. Mandatory Architecture Invariants

1. Every mutable infrastructure object has exactly one authoritative writer.
2. Every authoritative object has explicit version/generation/epoch semantics.
3. Authoritative generations are monotonic within their authority domain.
4. Every control-plane dependency used by request execution has defined stale-data and fail-open/fail-closed behavior.
5. Every tenant-scoped operation preserves identity through authorization, placement, execution, storage, cache and event boundaries.
6. Every externally retryable mutation has an idempotency contract.
7. Every event consumer is idempotent or has an explicitly stronger delivery guarantee.
8. Every production mutation has health predicates, blast-radius limits and rollback/recovery criteria.
9. Every destructive operation has restore/recovery evidence.
10. Every production capability has measurable reliability objectives.
11. Every reconciliation loop has convergence and anti-oscillation rules.
12. Every critical infrastructure operation has an explicit legal state-transition model.
13. Verification evidence is tied to the exact change generation.
14. Every provider binding declares material runtime and cost constraints.
15. AI cannot bypass deterministic governance or obtain unrestricted mutation authority.
16. Historical architecture cannot silently become active architecture.
17. No new Worker is justified solely by logical decomposition.
18. Resource retirement requires dependency and safety verification.

## 8. AI Boundary

AI and prediction MUST NOT become a synchronous availability dependency of Open Core.

AI autonomy levels are:

`L0 Observe → L1 Recommend → L2 Simulate → L3 Auto-Execute low-risk changes → L4 bounded Autonomous operation.`

Every mutation follows:

`Agent → Proposal → Policy → Change Manifest → Diff Scope Gate → Approval/Auto-Approval → Execution → Verification → Audit.`

GPT is allowed to execute only actions already authorized by the active contract/phase boundary.

## 9. Autonomous Continuation Rule

When the user says `继续`, GPT SHALL:

1. read `AGENTS.md` and the active 3.2 authority chain;
2. establish current GitHub repository state;
3. identify the active gate/task and unresolved findings;
4. select only the next action explicitly authorized by the current boundary;
5. declare/validate Change Manifest scope before governed edits;
6. implement the smallest correct change;
7. run the required tests/gates;
8. repair only contract-preserving defects inside the same scope;
9. bind evidence to the exact pushed commit/generation;
10. reassess whether the same authorized boundary still has unfinished work;
11. continue only while it remains within that boundary;
12. stop as soon as the next-code-development boundary is reached.

GPT MUST NOT ask the user merely because ordinary implementation work remains inside the declared boundary.

GPT MUST ask/stop when the boundary itself requires a new decision.

## 10. Hard Stop Contract

GPT MUST stop immediately when:

- a new architecture decision is required;
- active authority documents contradict one another;
- a proposed change lacks a declared owner;
- Diff Scope cannot truthfully contain the change;
- Worker topology would change;
- semantic ownership or authority would change;
- public compatibility would change without an approved transition;
- destructive/irreversible action is required;
- security or recovery evidence is missing;
- evidence is stale or non-reproducible;
- current repository state cannot be established;
- the current gate reaches its exit condition;
- the next code-development phase becomes authorized.

## 11. Required Terminal State

When the architecture/proof/governance work is sufficient to authorize the next code-development phase, the canonical terminal state is:

`READY_FOR_NEXT_CODE_PHASE — STOPPED_FOR_USER_COMMAND`

The final report MUST include:

- current repository commit SHA;
- completed scope;
- gate results;
- evidence references;
- unresolved blockers, if any;
- exact next phase/task identifier;
- `NEXT_PHASE_STARTED: NO`.

## 12. Historical Isolation

Historical 1.x/2.x/old/legacy material is immutable reference material.

It may be inspected for migration/reference/evidence analysis but cannot become current architecture or runtime authority without an explicit migration decision, ownership and Change Manifest.

## 13. Open Core / Advanced / Frontier

Open Core remains independently operable and deterministic.

Advanced provides mature high-end capabilities without becoming a Core runtime dependency.

Frontier includes experimental, predictive and AI-assisted capabilities and remains bounded, auditable and non-critical to Core availability.

## 14. Development Order

The approved development order is:

```text
Architecture hardening
→ machine governance
→ behavioral/state-machine enforcement
→ failure/recovery enforcement
→ security/tenant isolation
→ evidence freshness / release decision
→ final architecture admission
→ NEXT CODE-DEVELOPMENT PHASE (STOP BEFORE START)
→ W01-W06 implementation/integration
→ Management API
→ Super Management Center
→ DR/chaos qualification
→ bounded AI agents
→ Advanced/Frontier optimization
```

This order is governance, not a reason to create additional Workers.

## 15. Definition of Ready for the Next Code Phase

`READY_FOR_NEXT_CODE_PHASE` requires the repository's applicable gates to establish at minimum:

```text
Contract alignment = PASS
Architecture alignment = PASS
Governance gates = PASS
Ownership = PASS
Dependency DAG = PASS
Binding authority = PASS
Change Manifest / Diff Scope = PASS
Behavioral requirements = PASS
Required failure/recovery evidence = PASS
Required security/isolation evidence = PASS
Evidence freshness = PASS
No unresolved architecture contradiction = TRUE
No undeclared scope = TRUE
Next task/phase is explicitly identified = TRUE
```

Compilation, unit tests or documentation completeness alone never satisfies this state.

## 16. Non-Goals

- uncontrolled multi-cloud implementation
- arbitrary extra Workers
- AI governance bypass
- autonomous destructive migration
- speculative universal distributed transactions
- replacing Cloudflare primitives without demonstrated need
- speculative broker replacement
- unbounded automatic global rebalance
- UI-first fake operational state
- autonomous advancement into a newly authorized code phase

## 17. Final Rule

GPT SHALL be proactive inside the contract and conservative at the boundary.

The intended behavior is:

`AUTOMATIC CONTINUATION → COMPLETE CURRENT AUTHORIZED SCOPE → PROVE READINESS → STOP`

Never:

`AUTOMATIC CONTINUATION → INVENT NEXT SCOPE → START NEXT PHASE`
