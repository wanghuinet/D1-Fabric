# D1-Fabric 3.1 Governance & Evolution Contract v1.0

**Status:** PROPOSED / GOVERNANCE / NON-RUNTIME
**Authority:** subordinate to the 3.0 Master Contract until explicitly promoted
**Scope:** capability governance, architecture evolution, phase planning, anti-drift controls, future capability inventory, release discipline
**Implementation target:** `workers/v2/`
**Runtime behavior:** UNCHANGED BY THIS DOCUMENT

> 3.1 is the governance layer for controlled growth. It does not redefine 3.0 runtime semantics by itself.

---

## 0. Purpose

D1-Fabric must become more capable without becoming less understandable.

The primary 3.1 objective is therefore not feature count. It is **scientific capability growth with bounded change, explicit ownership, reproducible verification, and minimal rework**.

The governing principle is:

```text
More capabilities
      ↓
More explicit ownership
      ↓
More explicit contracts
      ↓
More machine-verifiable dependencies
      ↓
Smaller controlled changes
      ↓
Stronger evidence
      ↓
Lower architectural drift
      ↓
Less large-scale rework
```

3.1 is designed around public engineering practices such as canarying, progressive rollout, health validation, monitoring, version history, and rapid rollback. It must not be described as reproducing proprietary internal implementations of Google, Meta, Apple, Alibaba, ByteDance, Baidu, NetEase, or Tencent.

---

## 1. Authority and non-retroactivity

The current 3.0 authority remains:

```text
AGENTS.md
→ docs/D1-FABRIC-3.0-MASTER-CONTRACT-v1.0.md
→ explicitly referenced non-conflicting annex / phase packet
```

3.1 is a governance proposal until formally promoted.

3.1 MUST NOT silently:

```text
change 3.0 public API
change 3.0 runtime semantics
promote W05/W06 into 3.0 authority
split/merge Workers
move ownership
change database semantics
change security guarantees
change quota guarantees
change capacity claims
```

Any authority conflict remains:

```text
FAIL_CONTRACT_AUTHORITY
STOP
```

The existing W01-W06 architecture reconciliation remains the required prerequisite for formally promoting W05/W06 into the normative architecture.

---

## 2. The core 3.1 law: code existence is not architecture approval

The following states are distinct:

```text
IDEA
PROPOSED
CONTRACTED
IMPLEMENTED
TESTED
VERIFIED
CANARY
ACTIVE
```

Therefore:

```text
code exists != contract approved
code passes tests != architecture approved
contracted != implemented
implemented != production ready
production ready != active
```

This rule exists specifically to prevent implementation-first architecture drift.

---

## 3. Capability Registry

Every capability MUST have a unique stable `capabilityId` before implementation.

Required fields:

```text
capabilityId
name
category
purpose
owner
worker
contractId
contractVersion
architectureId
dependencies
stateOwner
publicSurface
securityBoundary
resourceBudget
failureModel
rollbackPlan
verificationPlan
status
phase
priority
```

Minimum lifecycle:

```text
PROPOSED
→ ARCHITECTURE_REVIEW
→ CONTRACTED
→ READY
→ IMPLEMENTING
→ TESTING
→ AUDITING
→ CANARY
→ ACTIVE
```

Exceptional states:

```text
BLOCKED
REJECTED
DEPRECATED
ROLLED_BACK
RETIRED
```

No runtime may consume a capability in `PROPOSED`, `ARCHITECTURE_REVIEW`, or `CONTRACTED` state.

---

## 4. Ownership law

Every semantic capability MUST have exactly one authoritative owner.

Current target ownership model:

| Capability | Target owner |
|---|---|
| Gateway admission | W01 Gateway |
| Execution planning/execution boundary | W02 Execution |
| Mutation + idempotency state | W03 Write |
| Runtime control snapshot / epoch / LKG | W04 Runtime Control |
| Retry / deadline / timeout / circuit / failure policy / recovery policy | W05 Reliability |
| Placement / topology / shard metadata / expansion / migration / rebalance planning | W06 Topology Control |

**Important:** W05 and W06 remain subject to the 3.0 authority reconciliation gate. This table is a 3.1 target model, not retroactive 3.0 authorization.

Duplicate semantic ownership is a P1 architecture defect unless an explicit contract proves the second component is an adapter, cache, projection, or non-authoritative view.

---

## 5. Dependency law

The target semantic dependency graph is:

```text
W01 Gateway
    ↓
W02 Execution
    ↓
W05 Reliability
    ↓
W03 Write

W04 Runtime Control
    ↓
W06 Topology Control
```

This is a semantic boundary model, not permission for private cross-Worker imports.

Worker interactions MUST remain contract-mediated.

Forbidden examples:

```text
W03 → W05 private implementation
W05 → W03 idempotency ownership
W02 → W06 private topology state
W06 → W05 private retry implementation
W04 → W06 duplicate placement authority
circular Worker dependencies
```

Any dependency cycle is:

```text
FAIL_DEPENDENCY_CYCLE
```

---

## 6. Change Manifest and blast-radius control

Every non-trivial change MUST declare:

```text
changeId
phaseId
capabilityIds
contractIds
architectureIds
allowedFiles
forbiddenFiles
expected changed files
expected changed APIs
expected changed contracts
expected test changes
runtime/data impact
security impact
resource impact
rollback target
```

Every change receives a blast-radius class:

```text
L0 documentation/governance only
L1 isolated implementation
L2 one Worker/package
L3 multiple Workers
L4 public API / compatibility
L5 data or control-plane semantics
L6 architecture / authority
```

Default gates:

```text
L0-L1 → normal verification
L2   → scope + architecture review
L3   → architecture review + integration qualification
L4   → contract compatibility gate
L5   → safety + recovery + data/control review
L6   → Master Contract authority review
```

A large increase from expected scope is not accepted as “complexity”; it is `FAIL_SCOPE_DRIFT` until explained and re-approved.

---

## 7. Anti-rework law

The project MUST prefer additive contract evolution over invasive rewrites.

Default order:

```text
New capability
→ capability registration
→ ownership decision
→ contract addition/version
→ compatibility adapter if required
→ isolated implementation
→ verification
```

Not allowed:

```text
New feature
→ modify several old Workers immediately
→ opportunistic refactor
→ change APIs to make tests green
→ rewrite architecture after implementation
```

A refactor is valid only if it preserves the existing contract, ownership, security, budgets, error classes, idempotency semantics, observability, epoch/LKG behavior, and rollback semantics.

Behavioral changes require a separate contract change.

---

## 8. Current capability ledger: already present vs not yet active

### 8.1 Existing implementation that must be governed

Current repository work includes W01-W06 packages. The 3.0 normative authority currently approves W01-W04 only. Therefore:

| Area | Repository state | 3.1 governance state |
|---|---|---|
| W01 Gateway | implemented | active subject to 3.0 gates |
| W02 Execution | implemented | active subject to 3.0 gates |
| W03 Write | implemented | active subject to 3.0 gates |
| W04 Runtime Control/LKG/Epoch | implemented | active subject to 3.0 gates |
| W05 Reliability | implementation present | **BLOCKED pending authority reconciliation** |
| W06 Topology Control | implementation present | **BLOCKED pending authority reconciliation** |

The blocked status is intentional. It prevents code from silently becoming normative architecture.

### 8.2 W05 capability inventory

Target capabilities:

```text
CAP-W05-RETRY
CAP-W05-DEADLINE
CAP-W05-TIMEOUT
CAP-W05-FAILURE-CLASSIFICATION
CAP-W05-CIRCUIT-BREAKER
CAP-W05-CANCELLATION
CAP-W05-RECOVERY-POLICY
```

Hard requirements:

```text
finite attempts
finite elapsed time
original deadline preserved
no retry of non-idempotent writes
fresh downstream request per retry
fresh AbortSignal per attempt
no swallowed failure
no retry amplification
no false-ready state
```

W03 remains the authoritative owner of idempotency state.

### 8.3 W06 capability inventory

Target capabilities:

```text
CAP-W06-PLACEMENT
CAP-W06-TOPOLOGY
CAP-W06-SHARD-METADATA
CAP-W06-EXPANSION-PLANNING
CAP-W06-MIGRATION-PLANNING
CAP-W06-REBALANCE-PLANNING
```

Hard requirements:

```text
versioned immutable control state
physical shard uniqueness
explicit lifecycle transitions
monotonic expansion
migration phase validation
stale-version rejection
no hidden data movement
no SQL execution ownership
```

W06 may plan control actions but cannot silently become the write executor.

---

## 9. Next development queue

The queue is ordered by safety dependency, not by novelty.

### Tier 0 — Governance closure

```text
3.1-G01 Authority Reconciliation
3.1-G02 Capability Registry
3.1-G03 Ownership Registry
3.1-G04 Dependency DAG Verification
3.1-G05 Bidirectional Architecture Audit
3.1-G06 Change Impact / Blast-Radius Gate
3.1-G07 Executable Phase Packet normalization
```

These are prerequisites for controlled feature growth.

### Tier 1 — Reliability hardening

```text
3.1-R01 Admission Control
3.1-R02 Backpressure
3.1-R03 Load Shedding
3.1-R04 Retry Amplification Guard
3.1-R05 Dependency Isolation
3.1-R06 Graceful Degradation
3.1-R07 Recovery Verification
3.1-R08 Overload Protection
```

### Tier 2 — Scale and topology execution

```text
3.1-S01 Shard Expansion Execution
3.1-S02 Migration Safety / Execution Boundary
3.1-S03 Rebalance Execution Boundary
3.1-S04 Hotspot Detection
3.1-S05 Capacity Planning
3.1-S06 Noisy-Neighbor Isolation
```

### Tier 3 — Security and tenancy

```text
3.1-S07 Tenant Isolation Hardening
3.1-S08 Replay Protection
3.1-S09 Control-Plane Auditability
3.1-S10 State-Binding Unification
3.1-S11 Privilege Boundary Verification
```

### Tier 4 — Cost and performance

```text
3.1-C01 Cost-aware Execution
3.1-C02 D1 Read/Write Cost Modeling
3.1-C03 Cache Economics
3.1-C04 Adaptive Query/Execution Planning
3.1-C05 Capacity-cost Forecasting
```

### Tier 5 — Adaptive intelligence

```text
3.1-A01 Workload Fingerprinting
3.1-A02 Anomaly Detection
3.1-A03 Capacity Prediction
3.1-A04 Policy Recommendation
3.1-A05 Simulation / Shadow Evaluation
3.1-A06 Adaptive Routing Candidate Policies
3.1-A07 Adaptive Cache Candidate Policies
3.1-A08 Adaptive Retry Candidate Policies
3.1-A09 AI-assisted Root Cause Analysis
3.1-A10 Autonomous Optimization under bounded policy gates
```

Tier 5 MUST NOT become a synchronous availability dependency.

---

## 10. Readiness gate for every new capability

Before a capability becomes `READY`, all of the following MUST exist:

```text
purpose
owner
boundary
contract
architecture mapping
dependencies
state owner
API/data contract
security boundary
resource budget
failure model
rollback target
test plan
evidence plan
```

Missing any required field:

```text
NOT_READY
```

---

## 11. Executable phase packet law

Every implementation phase MUST have a machine-readable or machine-checkable packet containing:

```text
phaseId
capabilityIds
objective
preconditions
allowedFiles
forbiddenFiles
contractIds
architectureIds
ownership
invariants
negative tests
failure tests
security tests
resource tests
integration tests
regression tests
acceptance thresholds
evidence schema
rollback procedure
stop condition
```

No implementation may begin from an informal feature sentence alone.

---

## 12. Failure-first engineering

For each new capability, failure behavior is designed before implementation completion.

Mandatory questions:

```text
What if downstream times out?
What if response is lost after commit?
What if control metadata is stale?
What if the dependency is unavailable?
What if the tenant exceeds quota?
What if the budget is exhausted?
What if the request is duplicated?
What if the Worker is restarted mid-operation?
What if a migration is interrupted?
What if the new version is wrong?
What is the safe degraded behavior?
What is the rollback target?
```

A capability without explicit failure semantics is not production-ready.

---

## 13. Security-first evolution

Every capability MUST state its security binding.

Reusable state MUST bind the minimum required:

```text
tenant
principal/authorization scope
operation
contract version
query/response version
```

No extension, AI policy, cache entry, cursor, placement record, or metadata object may become an implicit authority bypass.

Production controls MUST remain deterministic even when an advisory component fails.

---

## 14. Resource and cost governance

Every capability that consumes resources MUST declare limits for applicable dimensions:

```text
fanout
concurrency
D1 statements
rows read
rows written
payload bytes
retries
wall-clock time
batch items
response items
queue work
```

The system MUST prefer:

```text
bounded work
→ early rejection when necessary
→ no retry amplification
→ recovery
```

rather than:

```text
accept everything
→ queue everything
→ retry everything
→ amplify load
→ collapse
```

Capacity and cost claims require reproducible numeric baselines.

---

## 15. Progressive release law

No high-risk capability goes directly from implementation to universal production use unless explicitly classified as low risk by contract.

Default progression:

```text
OFF
→ SHADOW
→ CANARY
→ PROGRESSIVE
→ ACTIVE
```

Each stage requires health criteria and a rollback target.

The canary model is chosen because public Google SRE guidance describes gradual production rollout with monitoring and rapid rollback as a standard mitigation for release risk; Meta describes progressive rollouts with health checks and monitoring; Alibaba documents staged rollout, production canary traffic, version history, and rollback. citeturn849460search27turn849460search0turn849460search1

Blast radius MUST be measurable.

---

## 16. Rollback law

Rollback MUST be designed before promotion.

Every active version MUST identify:

```text
currentVersion
lastKnownGoodVersion
rollback trigger
rollback procedure
state compatibility requirements
rollback verification
```

A rollback is not complete merely because traffic moved away from the new version. The system MUST verify recovery invariants before normal admission returns.

Cross-version compatibility MUST be checked for all persisted or externally referenced artifacts used by rollback.

---

## 17. AI governance

AI/ML is an advisory and optimization mechanism, not the root authority for:

```text
authentication
authorization
tenant isolation
idempotency atomicity
hard budget limits
deadline enforcement
epoch/LKG fencing
data-loss prevention
destructive schema/data operations
production promotion
```

The default adaptive loop is:

```text
Telemetry
→ Feature Extraction
→ Detection
→ Candidate Policy
→ Simulation
→ Shadow
→ Canary
→ Evaluation
→ Policy Gate
→ Activate
→ Telemetry
```

AI unavailable, stale, uncertain, or degraded:

```text
use last valid deterministic policy
```

Never:

```text
AI unavailable
→ production unavailable
```

---

## 18. Incident-to-governance loop

Every serious failure MUST improve the engineering system, not only the implementation.

Required loop:

```text
Incident
→ Root Cause
→ Why test missed it?
→ Why contract missed it?
→ Why architecture missed it?
→ New invariant / guard
→ New negative test
→ New audit rule
→ Registry update
```

The goal is cumulative organizational memory encoded into the repository.

---

## 19. Definition of Ready

A capability may enter `READY` only if:

```text
architecture owner = known
semantic owner = unique
contract = versioned
dependencies = acyclic
security boundary = explicit
resource budget = finite
failure model = explicit
rollback = defined
phase packet = committed
test plan = executable
evidence schema = defined
scope = bounded
```

---

## 20. Definition of Done

A capability may enter `VERIFIED` only if:

```text
implementation complete
unit tests pass
contract tests pass
negative tests pass
failure tests pass
security tests pass
resource/budget tests pass
integration tests pass
regression passes
scope audit passes
architecture audit passes
bidirectional mapping passes
evidence is reproducible
exact commit SHA is verified
independent GPT review passes
```

Compilation is never sufficient.

---

## 21. Mandatory post-task loop

The repository-wide delivery law remains:

```text
IMPLEMENT
→ TEST
→ SCOPE / ARCHITECTURE CHECK
→ COMMIT
→ PUSH
→ VERIFY EXACT SHA
→ GPT INDEPENDENT REVIEW
→ FIX ONLY CONTRACT-PRESERVING DEFECTS
→ RE-TEST
→ RE-PUSH
→ RE-REVIEW
→ PASS + EVIDENCE
→ STOP
```

No automatic continuation to the next task after PASS.

---

## 22. Machine-verifiable failure states

3.1 introduces the following governance failure classes:

```text
FAIL_CAPABILITY_UNREGISTERED
FAIL_OWNER_AMBIGUOUS
FAIL_DUPLICATE_OWNER
FAIL_DEPENDENCY_CYCLE
FAIL_CONTRACT_AUTHORITY
FAIL_ARCHITECTURE_DRIFT
FAIL_CONTRACT_DRIFT
FAIL_SCOPE_DRIFT
FAIL_UNDEFINED_FAILURE
FAIL_SECURITY_BOUNDARY
FAIL_RESOURCE_BOUNDARY
FAIL_ROLLBACK_UNDEFINED
FAIL_EVIDENCE
FAIL_READINESS
FAIL_REVIEW_GATE
FAIL_FUTURE_PHASE_LEAK
FAIL_AI_AUTHORITY_BYPASS
```

No release may be promoted while a blocking governance state exists.

---

## 23. Future Worker rule

A new Worker is never created merely because a capability has a new name.

A new Worker requires explicit proof that the capability needs:

```text
independent deployment boundary
independent failure domain
independent scaling domain
independent security boundary
independent resource budget
independent ownership
```

Otherwise the capability remains inside the existing Worker boundary.

This protects the system against accidental microservice fragmentation.

---

## 24. 3.1 phase order

The scientific default order is:

```text
3.1-G Governance closure
        ↓
3.1-R Reliability hardening
        ↓
3.1-S Scale/topology execution
        ↓
3.1-T Security/tenancy hardening
        ↓
3.1-C Cost/performance optimization
        ↓
3.1-A Adaptive intelligence
```

A later tier may not silently bypass an unresolved blocker in an earlier tier.

A justified exception requires an explicit dependency waiver and risk record.

---

## 25. Anti-chaos rule for future development requests

When a user or agent says:

```text
继续开发
```

the repository workflow MUST interpret this as:

```text
Read authority
→ read current state
→ read capability registry
→ identify blocking governance defects
→ select highest-priority READY capability
→ check dependencies
→ generate/validate phase packet
→ implement minimum required scope
→ verify
→ review
→ PASS
→ STOP
```

It MUST NOT mean:

```text
invent a new feature
pick the most interesting feature
modify architecture opportunistically
implement future-phase capabilities early
```

---

## 26. Promotion rule from 3.1 proposal to active governance

3.1 may become normative only after:

```text
3.0 authority conflict resolved
Master Contract update explicitly approved
AGENTS updated consistently
capability registry committed
ownership map committed
dependency DAG committed
phase queue committed
bidirectional audit passes
existing runtime unchanged unless separately contracted
exact SHA verified
CI/evidence recorded
independent GPT review passes
```

Until then:

```text
3.1 = governance proposal
3.0 = runtime authority
```

---

## 27. Final lock

> **Every future capability must be traceable from purpose → capabilityId → owner → architecture → contract → dependency → phase packet → code → tests → evidence → rollout → rollback → telemetry.**

> **No feature enters production because it exists. It enters production because its ownership is singular, its boundary is explicit, its contract is versioned, its resource and security constraints are bounded, its failure behavior is proven, its rollout is controlled, its rollback is verified, and its evidence is reproducible.**

The purpose of 3.1 is therefore not to predict every future feature. It is to make future feature growth safe even when the exact feature has not yet been invented.
