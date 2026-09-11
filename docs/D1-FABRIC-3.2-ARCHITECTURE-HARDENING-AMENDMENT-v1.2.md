# D1-Fabric 3.2 Architecture Hardening Amendment

Version: 1.2  
Status: DRAFT FOR ARCHITECTURE REVIEW — AMENDMENT  
Scope: 3.2 architecture hardening beyond the P0/P1/P2 gate set  
Parent Contract: `docs/D1-FABRIC-3.2-INFRASTRUCTURE-ARCHITECTURE-CONTRACT-v1.0.md`  
Gate: `docs/D1-FABRIC-3.2-FINAL-ARCHITECTURE-GATE-v1.0.md`

## 0. Decision

This amendment closes the next class of architecture risks discovered after the initial P0/P1 hardening pass.

The purpose is not feature expansion. The purpose is to make the substrate:

- explicit about data/control authority;
- safe under policy and identity changes;
- verifiable at state-machine and invariant level;
- operable across resource lifecycle transitions;
- resistant to stale, conflicting or partially applied changes;
- capable of producing evidence rather than assertions;
- safe for future AI-assisted operation without creating an AI control-plane dependency.

3.2 remains `DRAFT FOR ARCHITECTURE REVIEW` until the parent contract and this amendment pass the final architecture gate.

## 1. New Architecture Invariants

The following invariants are mandatory.

### A-01 Authority Invariant

Every mutable object has exactly one mutation authority at any generation.

### A-02 Generation Monotonicity

Authoritative generations MUST be monotonic within an authority domain. Older generations MUST NOT overwrite newer generations.

### A-03 Policy/Object Compatibility

A mutation MUST identify the policy version under which it was evaluated. A policy-incompatible mutation MUST be rejected or explicitly re-evaluated.

### A-04 Identity-to-Data Binding

Every tenant-scoped data operation MUST preserve tenant/application identity through authorization, placement, execution, storage, cache and event boundaries.

### A-05 Data-Flow Purpose Limitation

Sensitive or policy-constrained data MUST carry machine-readable purpose/classification metadata where required. A downstream operation MUST NOT weaken an upstream data restriction without an explicit policy transition.

### A-06 State-Machine Safety

Infrastructure operations MUST be represented by explicit states and legal transitions. Illegal transitions MUST be rejected by the control layer.

### A-07 Evidence Completeness

A production state transition is not complete until the declared verification evidence exists and is attributable to the exact change generation.

### A-08 Convergence

Every reconciliation controller MUST have a defined target state, convergence predicate, retry envelope and stuck-state exit condition.

### A-09 Bounded Autonomy

Every autonomous action MUST have a finite scope, time budget, resource budget and maximum blast radius.

### A-10 Retirement Safety

A resource, schema, provider binding or capability MUST NOT be physically retired until dependency discovery, traffic drain, data safety and rollback/forward-recovery criteria are satisfied.

## 2. Control-Plane State Authority Model

The control plane SHALL distinguish four concepts:

1. **Intent** — what should exist.
2. **Authoritative State** — the versioned state owned by the control authority.
3. **Observed State** — what providers/runtime currently report.
4. **Evidence State** — verified facts proving whether the transition succeeded.

The system MUST NOT collapse these concepts into one mutable record.

Required transition:

`Intent → Evaluation → Authorized Generation → Execution → Observation → Verification Evidence → Committed Actual State`

A failed execution MUST NOT be represented as successful merely because the intent was accepted.

## 3. State-Machine Contract

Critical operations SHALL define explicit state machines.

Minimum operations:

- deployment
- migration
- shard expansion
- shard rebalance
- schema evolution
- provider binding change
- resource retirement
- control-plane recovery
- AI-generated infrastructure mutation

Each state machine SHALL define:

- states
- legal transitions
- transition owner
- preconditions
- postconditions
- timeout
- retry semantics
- compensation/recovery
- evidence required
- terminal states
- operator intervention state

No operation may rely solely on prose such as "rollback if needed".

## 4. Change Transaction Contract

Every infrastructure mutation SHALL have a durable change identity.

Minimum fields:

- change ID
- initiator
- tenant/resource scope
- target object
- expected generation
- policy version
- dependency snapshot
- failure-domain scope
- blast-radius estimate
- desired diff
- recovery classification
- verification plan
- expiration/deadline
- audit identity

The change MUST fail if the authoritative generation changes incompatibly before execution.

This prevents stale operators, stale agents and stale control loops from applying obsolete decisions.

## 5. Verification Evidence Contract

Verification MUST be separated from execution.

Evidence SHALL identify:

- change ID
- generation
- test/check type
- observed result
- timestamp
- source authority
- environment
- verifier identity
- expiration/freshness where applicable

Evidence classes SHOULD include:

- static contract verification
- runtime health verification
- data integrity verification
- consistency verification
- capacity verification
- security verification
- recovery verification
- rollback verification

A green execution response without corresponding verification evidence SHALL NOT establish production state.

## 6. API and Contract Evolution Matrix

Every externally visible contract SHALL define compatibility across:

- request schema
- response schema
- event schema
- capability version
- policy version
- storage schema
- control-state schema

Required compatibility modes:

- backward compatible
- forward compatible
- dual-read
- dual-write
- migration-only
- breaking

Breaking changes require an explicit migration path and retirement checkpoint.

## 7. Data Lineage and Purpose Policy

The platform SHALL treat data movement as a governed operation, not merely a storage copy.

Where policy requires it, data objects/events SHALL expose:

- data classification
- tenant owner
- purpose
- residency/locality constraint
- retention class
- downstream restrictions
- deletion/erasure obligation

Data movement, caching, replication, event publication and AI processing MUST preserve applicable restrictions.

This is a platform contract, not merely an application privacy feature.

## 8. Resource Lifecycle Contract

Every infrastructure resource SHALL have a lifecycle:

`discovered → requested → provisioned → verified → active → degraded → draining → retired → archived/removed`

The lifecycle SHALL define ownership transfer, dependency handling, data retention, cleanup, billing implications and audit retention.

Resources MUST NOT become permanently orphaned because the owning application disappears.

## 9. Capacity as a Multi-Dimensional Safety Boundary

Capacity SHALL NOT be represented as one scalar percentage.

The platform SHALL model at minimum:

- CPU/runtime
- memory
- storage
- database size
- reads
- writes
- network
- subrequests
- connections
- queue depth
- concurrency
- hotness
- control-plane capacity
- cost budget

Admission and placement MUST consider the limiting dimension rather than average utilization alone.

A system is considered saturated when any safety-critical dimension crosses its policy threshold.

## 10. Control-Plane Staleness Contract

Every cached control decision SHALL declare:

- generation
- age
- maximum permitted staleness
- affected resources
- safe operations
- forbidden operations
- fail-open/fail-closed behavior

Examples:

- stale read routing MAY remain valid within a bounded window;
- stale placement MUST NOT initiate destructive migration;
- stale policy MUST NOT authorize a high-risk mutation;
- stale tenant authorization MUST fail closed.

## 11. Security as a Runtime Policy Plane

Security SHALL be enforced throughout the substrate rather than at ingress only.

Required policy boundaries include:

`Identity → Authorization → Tenant → Capability → Data → Event → Management → Automation`

The platform SHALL defend against:

- tenant escape
- confused deputy
- privilege escalation
- replay
- stale authorization
- cross-tenant cache leakage
- event leakage
- management-plane abuse
- AI-agent privilege escalation
- secret propagation

Security decisions SHALL be versioned and auditable when they materially affect infrastructure behavior.

## 12. Operational Safety Contract

Production operation SHALL define four classes of change:

1. **Routine** — low blast radius, pre-authorized.
2. **Controlled** — staged execution with automated verification.
3. **High Risk** — explicit approval and enhanced verification.
4. **Emergency** — constrained emergency path with mandatory retrospective evidence.

Emergency procedures MUST NOT become an ungoverned bypass around normal ownership and audit controls.

## 13. Failure-Injection Contract

Reliability claims MUST be testable through controlled failure injection.

The verification system SHALL support, where applicable:

- dependency timeout
- dependency rejection
- stale control state
- duplicate event
- dropped event
- poison event
- partial write
- provider limit exhaustion
- hot resource
- control-state corruption
- migration interruption
- rollback failure
- restore failure
- tenant overload
- deployment regression

Each experiment SHALL define blast radius, stop condition, expected invariant and recovery evidence.

## 14. AI Infrastructure Safety Contract

AI is a proposal generator and bounded executor, never an implicit authority.

Every AI action SHALL declare:

- model/agent identity
- capability scope
- tenant/resource scope
- input evidence set
- policy version
- confidence/uncertainty where applicable
- action class
- budget
- blast radius
- expiry
- verification plan
- recovery path

AI MUST NOT infer permission from historical behavior.

AI MUST NOT mutate an object whose authoritative generation has changed since proposal creation.

AI-generated diagnosis MUST distinguish observation, hypothesis and verified fact.

## 15. Architecture Evidence Chain

The platform SHALL maintain an evidence chain:

`Requirement → ADR → Contract → Ownership → Dependency DAG → Implementation → Test → Runtime Evidence → Release Decision → Audit`

A capability lacking one of these required links is incomplete for its classification.

This prevents:

- undocumented feature invention;
- code-first architecture drift;
- test-only false confidence;
- ownership ambiguity;
- AI-generated undocumented behavior.

## 16. Required Machine Registries — Expanded

The machine governance system SHALL ultimately support:

1. Capability Registry
2. Authority Registry
3. Ownership Map
4. Dependency DAG
5. Binding Ownership
6. Policy Registry
7. Failure-Domain Registry
8. Tenant/Namespace Registry
9. Change Manifest Registry
10. Diff Scope Gate
11. Recovery Classification Registry
12. Compatibility Matrix
13. Provider Constraint Registry
14. Resource Lifecycle Registry
15. Evidence Registry
16. Release Classification Registry
17. Historical Isolation Rules
18. Data Classification/Lineage Registry where required

These registries are logical governance structures. They do not imply additional Workers.

## 17. Architecture-Level Red-Team Additions

The following scenarios are mandatory additions to the existing 15-scenario red-team set:

16. Stale policy attempts to mutate a newer generation.
17. Two control loops attempt to mutate the same object.
18. Tenant identity is lost between Gateway and Data Plane.
19. Cache serves data from the wrong tenant namespace.
20. Event carries an incompatible schema version.
21. Resource is retired while a hidden dependency remains.
22. Verification reports success for the wrong generation.
23. Reconciler oscillates between two valid-looking policies.
24. AI diagnosis is incorrect but presented as fact.
25. Emergency path is repeatedly used to bypass normal governance.

## 18. Final Architecture Principle

D1-Fabric SHALL optimize for **provable correctness under change**, not merely correctness at rest.

The architecture is considered mature only when it can answer, for every material production state:

- Who owns it?
- What generation is it?
- Why is it in this state?
- Which policy authorized it?
- Which dependencies constrain it?
- What failure domain contains it?
- What evidence proves it?
- How can it be recovered?
- What happens if the state becomes stale?
- What prevents an AI or automation loop from making it worse?

## 19. Admission Impact

This amendment does not authorize implementation by itself.

Before 3.2 becomes ACTIVE:

- parent contract MUST reference and absorb this amendment;
- all new invariants MUST have machine-enforcement targets;
- required state machines MUST have contract definitions;
- evidence-chain fields MUST be represented in governance metadata;
- red-team scenarios MUST be executable or formally simulated;
- unresolved contradictions MUST be closed or explicitly accepted with expiry.

Verdict remains:

`HARDENED — NOT YET ACTIVE`
