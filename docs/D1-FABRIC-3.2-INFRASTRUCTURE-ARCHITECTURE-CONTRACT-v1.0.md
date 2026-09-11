# D1-Fabric 3.2 Infrastructure Architecture Contract

Version: 1.1  
Status: DRAFT FOR ARCHITECTURE REVIEW — HARDENED  
Supersedes: 3.1 architecture planning as the forward-looking 3.2 planning baseline; does not authorize implementation until review PASS.  
Purpose: define the production-grade 3.2 architecture for D1-Fabric as a Cloudflare-native distributed application infrastructure substrate, with explicit authority, isolation, overload, state, event, recovery, evolution and verification contracts.

## 0. Executive Decision

D1-Fabric 3.2 SHALL evolve from a D1 sharding middleware into a Cloudflare-native, policy-driven distributed application infrastructure substrate.

D1 sharding remains an important implementation capability, but it SHALL NOT remain the top-level product abstraction.

The top-level execution model is:

`Application Intent → Identity/Tenant → Capability → Policy → Admission → Placement → Execution → State → Events → Reliability → Observability → Governance`

This sequence is architectural, not a requirement for separate workers.

D1 is one storage provider inside the Data Plane. Cloudflare Workers, D1, Durable Objects, KV, R2, Queues and Workflows are infrastructure primitives selected through explicit contracts and policies.

3.2 SHALL preserve the Open Core rule: the foundational kernel must operate correctly without Advanced or Frontier capabilities enabled.

### 0.1 Architecture Verdict for v1.1

This version incorporates the mandatory architecture-hardening findings from the 3.2 Red-Team review.

It remains `DRAFT FOR ARCHITECTURE REVIEW` until the review gate in Section 31 is PASS.

No production implementation may claim 3.2 architecture conformance before that gate passes.

## 1. Product Definition

D1-Fabric is a Cloudflare-native, policy-driven, control-plane-based distributed application infrastructure substrate for AI applications, content platforms, SaaS, games, social applications, APIs and other high-concurrency workloads.

The substrate provides:

- application gateway and request context
- identity, tenant and namespace isolation
- execution orchestration
- transactional write safety
- relational and non-relational data capability routing
- consistency policy
- reliability policy
- admission and backpressure
- topology and placement
- expansion, migration and rebalance
- event and outbox semantics
- governance and machine-enforced architecture rules
- observability and causality
- capacity and cost intelligence
- AI-assisted diagnosis, recommendation and bounded automation
- a Super Management Center for infrastructure operations

## 2. Architectural Principles

### 2.1 Capability over Provider

Applications declare required capabilities and policies, not Cloudflare resource identities.

Bad:

`use D1 database 17`

Good:

`capability=relational.sql, consistency=sequential, workload=read-heavy`

Provider selection is an infrastructure concern.

### 2.2 Policy over Hard-Coded Behavior

Consistency, retry, placement, admission, cost, capacity, rollout, security and recovery behavior SHALL be represented as policies with versioned contracts.

### 2.3 Control Plane / Data Plane Separation

Control decisions SHALL be separated from request-serving data execution.

Control-plane failures MUST NOT unnecessarily become synchronous data-plane availability dependencies.

Every data-plane dependency on control information MUST define a stale-data window and explicit fail-open/fail-closed behavior.

### 2.4 Authority over Ambiguity

Every mutable infrastructure object SHALL have exactly one authoritative writer, an explicit version/generation/epoch, and a defined read authority.

Caches, replicas, projections and management views SHALL never silently become competing authorities.

### 2.5 Desired State / Actual State

Infrastructure changes SHALL use desired state, observed actual state, diff, policy evaluation, change manifest, safe execution, verification and reconciliation.

### 2.6 Admission before Work

The platform SHALL detect and control overload before work amplifies system pressure.

Admission control is a first-class substrate capability, not an implementation detail of individual workers.

### 2.7 AI Is Advisory Before It Is Autonomous

AI SHALL NOT be a synchronous availability dependency of Open Core.

AI actions SHALL pass through deterministic policy, scope and verification gates.

### 2.8 Deployment Boundaries Are Not Logical Boundaries

Logical planes MAY exceed six workers. The deployment topology SHALL remain deliberately small. New workers require explicit architectural justification, failure-domain analysis and operational ownership.

### 2.9 Governance Is Executable

Architecture rules SHALL be represented as machine-checkable registries, ownership rules, dependency rules, change manifests and CI gates.

### 2.10 Cost Is a First-Class Constraint

Performance, reliability, capacity and cost SHALL be evaluated together.

### 2.11 Recovery Is Part of Correctness

A capability is not production-ready merely because the happy path works. Startup, partial failure, degraded mode, restore, replay, rollback and corruption recovery SHALL be contractually defined and verifiable.

### 2.12 Evolution Is a Controlled State Transition

Schema changes, deployment changes, topology changes, provider changes and contract changes SHALL use explicit compatibility, rollout, verification and rollback semantics.

## 3. Logical Architecture

D1-Fabric 3.2 consists of the following logical planes:

1. Application Plane
2. Gateway Plane
3. Identity/Tenant Plane
4. Execution Plane
5. Write Plane
6. Admission/Flow-Control Plane
7. Data Plane
8. Event Plane
9. Reliability Plane
10. Control Plane
11. Governance Plane
12. Observability Plane
13. AI Plane
14. Management Plane

These are logical responsibilities, not a requirement for fourteen deployed workers.

## 4. Deployment Baseline: W01-W06

### W01 Gateway

Owns:

- request ingress
- authentication/authorization integration
- tenant/application context
- request identity and correlation
- API contract enforcement
- rate limiting hooks
- admission control entry point
- protocol normalization

MUST NOT own storage placement, migration policy or global topology decisions.

### W02 Execution

Owns:

- query/command execution orchestration
- execution context
- capability invocation
- bounded fan-out
- request budget enforcement
- result normalization
- dependency-aware execution scheduling

MUST NOT become the system-wide control plane or policy authority.

### W03 Write

Owns:

- write execution
- transaction boundaries
- idempotency authority integration
- commit semantics
- outbox/event publication boundary
- write failure classification
- write-audit correlation

A publish/write operation MUST fail closed when the required durable write contract is not satisfied.

### W04 Data Plane

Owns:

- storage capability adapters
- D1 routing
- D1 sharding
- D1 read-replica/session-aware routing where applicable
- Durable Objects coordination integration where justified
- KV access patterns
- R2 object storage integration
- future provider adapters behind stable contracts

D1 sharding is a W04 capability, not the system-wide architecture.

### W05 Reliability

Owns the cross-cutting reliability contract:

- timeout/deadline
- retry/backoff
- failure classification
- circuit breaker
- cancellation
- bulkhead controls
- idempotency enforcement hooks
- recovery
- replay/dead-letter strategy
- consistency protection
- degradation policy
- failure-domain-aware recovery

W05 SHALL provide reusable policy primitives rather than ad-hoc retry code in every worker.

### W06 Control Plane

Owns:

- capability registry
- resource registry
- tenant/application registry where required
- topology
- placement
- shard metadata
- version metadata
- desired state
- expansion
- migration
- rebalance
- reconciliation
- rollout/cutover control
- control-state authority and generation management

W06 is the infrastructure decision system.

W06 MUST NOT become a synchronous dependency for every normal request.

## 5. Capability Registry

Capability Registry is a first-class 3.2 architectural contract.

A capability definition SHALL include at minimum:

- stable capability ID
- semantic version
- provider/adapter
- consistency classes
- durability class
- latency characteristics
- capacity constraints
- cost model
- failure model
- placement constraints
- security requirements
- tenant/isolation requirements
- ownership
- dependency DAG position
- bootstrap dependencies
- verification contract
- recovery contract
- compatibility contract

Initial capability families include:

- relational.sql
- object.storage
- edge.cache
- coordination
- distributed.lock
- event.queue
- durable.workflow
- realtime.state
- ai.inference

The registry MUST permit additional providers without changing application contracts.

## 6. Authority and Source-of-Truth Contract

Every mutable infrastructure object SHALL declare:

- object type
- authoritative writer
- authoritative store
- version/generation/epoch
- read models/projections
- cache rules
- freshness bound
- conflict resolution policy
- bootstrap source
- recovery source
- audit source

Rules:

1. Exactly one component owns mutation authority for each object type.
2. Read caches MUST carry authority/version metadata where required for safety.
3. A stale projection MUST NOT silently override authoritative state.
4. Cross-system writes MUST use explicit ownership boundaries; no hidden dual-write authority.
5. Authority transfer MUST itself be a versioned, policy-gated change.

## 7. Control-Plane Bootstrap and Recovery Contract

The control plane SHALL define a minimal bootstrap dependency graph.

The bootstrap graph MUST identify:

- root configuration
- minimal identity and security dependencies
- authoritative control-state store
- last-known-good configuration
- cache/projection recovery path
- service startup ordering
- control-plane self-dependency boundaries

The system MUST provide a degraded operating mode for cases where W06 is temporarily unavailable but previously verified data-plane state remains safe to use.

No request path may depend on an unavailable control-plane operation when a verified safe cached/last-known-good state is explicitly permitted by policy.

Recovery from corrupted or incomplete control state SHALL require verification before reactivation.

## 8. Identity, Tenant and Isolation Contract

Every application request SHALL have an explicit identity and tenant context unless the capability contract explicitly allows anonymous operation.

Tenant isolation SHALL cover:

- identity
- authorization namespace
- resource ownership
- quota
- concurrency
- storage access
- cost attribution
- event ownership
- cache isolation
- management visibility
- noisy-neighbor controls

Cross-tenant access SHALL require explicit authorization and auditable policy.

Tenant-specific limits SHALL NOT be enforced solely at the UI layer.

## 9. SLO, Error Budget and Reliability Objective Contract

Every production capability SHALL declare measurable reliability objectives appropriate to its role.

The contract SHALL support:

- availability objective
- success-rate objective
- latency objectives such as P50/P95/P99 where meaningful
- freshness/consistency objective
- durability objective
- RPO
- RTO
- saturation thresholds
- alert thresholds
- ownership
- error-budget accounting
- release/migration policy impact

No production readiness claim may rely only on average latency or aggregate success rate.

Error-budget exhaustion SHALL be able to restrict risky releases, migrations or autonomous changes according to policy.

## 10. Failure-Domain Contract

The platform SHALL model failure domains explicitly.

Baseline hierarchy:

`request → isolate/runtime → Worker → coordination object → database → shard → region/location → provider subsystem → account/control scope`

Each capability SHALL define:

- failure domains it can tolerate
- correlated failure boundaries
- retry scope
- recovery scope
- isolation boundary
- blast-radius limit

A failure-domain boundary MUST NOT be crossed implicitly by retry, fan-out or migration behavior.

## 11. Admission, Backpressure and Flow-Control Contract

Admission SHALL occur before expensive work is admitted into constrained resources.

The contract SHALL define:

- overload detection
- concurrency limits
- queue thresholds
- per-tenant budgets
- priority classes
- reject / shed / queue behavior
- pressure propagation
- dependency pressure handling
- retry interaction
- bulkhead boundaries
- recovery when pressure drops

The system MUST prefer controlled rejection or degradation over unbounded queue growth or retry amplification.

Admission decisions SHALL be attributable to a concrete policy/version.

## 12. Consistency Contract

3.2 SHALL standardize consistency as an explicit policy dimension.

Initial classes:

- eventual
- read-your-writes
- sequential
- strong
- serializable

Each class SHALL have formal semantic meaning within D1-Fabric, not merely a label.

The policy engine SHALL map consistency requirements to appropriate Cloudflare primitives, including D1 Sessions/Bookmarks, D1 primary/replica behavior and Durable Objects where strong per-entity coordination is justified.

Consistency policy SHALL expose:

- required guarantee
- allowed staleness
- read path
- write path
- failover behavior
- recovery behavior
- cost/latency trade-off
- verification method
- provider-specific caveats

D1 replica reads SHALL explicitly account for asynchronous replication and session/bookmark semantics.

## 13. Workload Model

3.2 SHALL classify workload characteristics before making placement, admission or capacity decisions.

Initial workload classes:

- read-heavy
- write-heavy
- hot-key
- transactional
- event-driven
- realtime
- large-object
- AI-inference
- batch
- stream

Workload classification MAY be static, observed or AI-assisted.

AI-derived classification MUST remain bounded, versioned and auditable.

## 14. Cache Contract

Every cacheable capability SHALL declare:

- cache key schema
- namespace/isolation scope
- freshness/TTL
- invalidation strategy
- stale-while-revalidate behavior if supported
- negative-cache rules
- consistency interaction
- stampede protection
- failure behavior
- cost policy

Caches MUST NOT silently weaken an explicitly requested consistency guarantee.

Cache authority SHALL remain subordinate to the authoritative data contract.

## 15. Hot-Key and Hot-Shard Protection Contract

The platform SHALL detect and bound concentration on hot resources.

Required controls MAY include:

- hot-key detection
- request admission on hot resources
- per-key/per-shard concurrency limits
- load spreading where semantics permit
- read replication/routing where safe
- write serialization where required
- temporary isolation
- workload shedding
- hotspot-triggered scaling or migration proposals

A hotspot response MUST define its consistency impact and blast radius.

## 16. Desired State, Actual State and Reconciliation Contract

All infrastructure mutations SHALL follow:

`Desired State → Control Plane → Observe Actual State → Compute Diff → Policy Evaluation → Change Manifest → Ownership/Dependency Validation → Safe Execution → Verification → Actual State → Reconciliation`

The Reconciliation Engine SHALL detect and classify:

- expected drift
- transient drift
- policy violation
- ownership violation
- infrastructure failure
- unsafe change
- stuck state
- oscillation

Reconciliation SHALL be:

- deterministic
- idempotent
- generation-aware
- bounded
- observable
- resistant to oscillation

Each controller SHALL define convergence criteria and a maximum retry/repair envelope.

## 17. Event, Outbox, Delivery and Replay Contract

Reliable state change publication SHALL use an explicit transactional boundary.

Baseline pattern:

`Transaction → durable application state → outbox record → commit → queue/event transport → consumers`

Events SHALL define:

- event identity
- producer authority
- schema/version
- delivery semantics
- ordering scope
- deduplication key
- retry ownership
- consumer idempotency
- poison-message handling
- dead-letter behavior
- replay authorization
- replay range/scope
- retention
- compatibility policy

Cloudflare Queues SHALL be treated as an at-least-once transport where duplicates are possible; consumers MUST be idempotent.

A permanently failing consumer MUST NOT block unrelated event processing indefinitely.

Replay SHALL be auditable and policy-gated.

## 18. Idempotency Contract

Every externally retryable mutation SHALL define idempotency semantics.

The contract SHALL include:

- idempotency key source
- scope
- canonical request identity
- deduplication authority
- lifecycle and expiration
- duplicate detection behavior
- result replay semantics
- concurrent duplicate handling
- failure-before-commit behavior
- recovery behavior

Idempotency SHALL distinguish:

- same request repeated
- same logical operation with different transport retries
- conflicting reuse of an idempotency key

Idempotency records SHALL have a declared authoritative store.

## 19. Reliability Contract

Reliability behavior SHALL be policy-driven.

Required dimensions:

- timeout
- deadline
- retry eligibility
- retry budget
- exponential backoff
- jitter
- circuit state
- cancellation
- idempotency
- deduplication
- recovery
- replay
- dead-letter handling
- degradation
- consistency protection
- failure-domain scope

Retry MUST NOT be used to amplify overload.

Retries MUST respect admission, tenant budget and error-budget policy.

## 20. Provider Constraint Contract

Provider limitations SHALL be explicit and executable where practical.

Each provider binding SHALL declare relevant constraints such as:

- request/CPU/runtime ceiling
- memory ceiling
- subrequest/concurrency limits
- storage capacity
- read/write cost dimensions
- transaction limitations
- replication behavior
- rate limits
- operation timeout
- recovery behavior

The scheduler MUST account for provider constraints before creating work that cannot complete safely.

Provider constraints SHALL be versioned because provider behavior may change over time.

## 21. Capacity and Cost Model Contract

Capacity planning SHALL model at minimum:

- request rate
- concurrency
- CPU/runtime budget
- memory
- storage growth
- read/write volume
- hotness distribution
- queue depth
- fan-out
- failure headroom
- scaling thresholds

Cost modeling SHALL distinguish:

- authoritative billing data
- estimated cost
- projected cost
- optimization opportunity

Cost recommendations MUST identify their source, assumptions, confidence and policy constraints.

## 22. Topology, Placement and Scaling

Control Plane SHALL manage logical topology independently from physical provider identities.

Placement inputs MAY include:

- workload class
- tenant constraints
- locality/data residency
- latency
- capacity
- hotness
- consistency
- cost
- failure domains

Scaling SHALL prefer safe monotonic expansion.

Shrink/destructive consolidation requires explicit policy, verification and recovery evidence.

No topology operation may exceed its declared blast-radius limit.

## 23. Migration, Cutover and Rollback Contract

Migration SHALL be a state machine rather than a single imperative action.

Baseline states:

`planned → prepared → dual/read-shadow → copying → verified → cutover-ready → cutover → stabilized → completed`

Each migration SHALL be classified as one of:

- reversible
- compensatable
- forward-only
- destructive

Destructive migration steps SHALL require restore/backup evidence before the destructive boundary.

Failure transitions SHALL support pause, rollback or compensating recovery according to the migration classification.

Policy-Gated Cutover SHALL remain a formal safety boundary.

Rollback SHALL specify whether it restores data, routing, configuration or only execution behavior.

## 24. Schema Evolution Contract

Schema changes SHALL be managed as compatibility-aware state transitions.

Required stages SHALL support, where applicable:

- design
- compatibility analysis
- expand
- dual-read/dual-write where required
- backfill
- verification
- cutover
- contraction/removal

Consumers and producers SHALL have a version compatibility matrix.

Destructive schema operations require explicit proof that no active consumer depends on the removed contract.

## 25. Deployment Safety Contract

Production changes SHALL support:

- preflight validation
- dependency-aware verification
- staged rollout
- health predicates
- blast-radius limit
- progressive exposure
- automatic rollback where policy permits
- error-budget interaction
- post-change stabilization window

A deployment SHALL NOT be considered healthy merely because the new process starts successfully.

Health evaluation SHALL include user-visible and dependency-level signals appropriate to the changed capability.

## 26. Disaster Recovery and Restore Contract

3.2 SHALL define recovery objectives before production readiness:

- RPO
- RTO
- backup source
- retention
- restore ordering
- dependency restoration order
- control-plane recovery
- data-plane recovery
- event replay
- credential/key recovery process
- integrity verification

Restore verification SHALL be an executable test, not a document-only claim.

The platform SHALL support failure scenarios including:

- resource loss
- control-state corruption
- partial region/location loss
- provider subsystem failure
- stale or missing metadata
- event duplication after restore

Recovery MUST return through a verified state before normal autonomous reconciliation resumes.

## 27. Governance Plane

The following become machine-enforced architectural registries/contracts:

- Capability Registry
- ADR Registry
- Ownership Map
- Dependency DAG
- Binding Ownership
- Change Manifest
- Diff Scope Gate
- module contracts
- contract compatibility rules
- release classification
- authority registry
- policy registry
- recovery classification

CI SHALL reject:

- unauthorized ownership changes
- dependency violations
- out-of-scope changes
- contract-breaking changes
- undeclared provider bindings
- unversioned policy changes
- unsafe destructive operations
- historical-document mutation in locked scopes

## 28. Observability and Causality Contract

Observability SHALL be cross-cutting and SHALL expose at minimum:

- request rate
- latency percentiles
- errors
- saturation
- capacity
- tenant attribution
- shard health
- replication/consistency indicators where available
- migration state
- queue/event health
- control-plane reconciliation state
- deployment state
- cost indicators
- audit events

Every production request and infrastructure mutation SHALL support correlation across relevant stages using stable trace/request/change identifiers.

Observability SHALL preserve enough causality to answer:

`what changed → what dependency changed → what traffic was affected → what policy acted → what failed → what recovered`

Observability data SHALL be suitable for both humans and machine agents.

## 29. Security and Threat Model Contract

All management actions MUST be authenticated, authorized, attributable and auditable.

Security SHALL cover:

- identity and tenant isolation
- least privilege
- management-plane authorization
- provider credential isolation
- secret handling
- audit integrity
- policy tamper resistance
- replay protection
- change attribution
- AI-agent authorization boundaries

Management APIs MUST NOT expose raw provider credentials or secrets to AI agents.

Security-impacting architecture changes require threat-model review before activation.

## 30. AI Plane and Agent Sandbox Contract

AI capabilities SHALL include, in controlled stages:

- anomaly detection
- capacity prediction
- AI-assisted root cause analysis
- policy recommendation
- workload fingerprinting
- simulation/shadow analysis
- adaptive routing
- adaptive cache policy
- adaptive retry recommendations
- bounded autonomous optimization

AI autonomy levels:

`L0 Observe`

`L1 Recommend`

`L2 Simulate`

`L3 Auto-Execute low-risk changes`

`L4 Autonomous within explicitly bounded policy domains`

Every AI action SHALL execute through:

`Agent → Proposal → Policy Engine → Change Manifest → Diff Scope Gate → Approval/Auto-Approval → Execution → Verification → Audit`

AI agents SHALL receive:

- capability-scoped permissions
- tenant/resource scope
- action allowlist
- blast-radius limit
- time limit
- budget limit
- approval policy
- rollback/recovery path

AI MUST NOT:

- bypass governance
- obtain raw provider credentials
- become the sole source of diagnosis
- directly perform unrestricted destructive operations
- silently change authoritative control state

## 31. Architecture Review and Hard-Gate Matrix

3.2 SHALL NOT move to ACTIVE until all P0 architecture contracts are PASS.

### P0 Hard Gates

- [ ] Authority / Source-of-Truth Contract
- [ ] Control-Plane Bootstrap / Recovery Contract
- [ ] SLO / Error-Budget Contract
- [ ] Failure-Domain Contract
- [ ] Identity / Tenant Isolation Contract
- [ ] Admission / Backpressure Contract
- [ ] Idempotency Contract
- [ ] Event Delivery / Replay Contract
- [ ] Migration Rollback Contract
- [ ] Disaster Recovery / Restore Contract

### P1 Hard Gates

- [ ] Provider Constraint Contract
- [ ] Precise Consistency Contract
- [ ] Cache Contract
- [ ] Hot-Key / Hot-Shard Protection Contract
- [ ] Schema Evolution Contract
- [ ] Deployment Safety Contract
- [ ] Security / Threat Model Contract
- [ ] Observability / Causality Contract
- [ ] Capacity / Cost Model Contract
- [ ] Control-plane degraded-mode rules

### P2 Hardening Gates

- [ ] Deterministic reconciliation convergence proof
- [ ] AI Agent Sandbox Contract
- [ ] Data residency/locality policy
- [ ] Resource retirement / garbage-collection contract
- [ ] Platform upgrade / rollback contract
- [ ] Failure injection / chaos verification contract

A checklist item is PASS only when the contract, owner, implementation scope, verification method and machine-enforcement rule are all identified.

## 32. Super Management Center

3.2 SHALL define a Super Management Center as the operational management product for the infrastructure substrate.

It is a management/control surface, not a new execution plane.

Primary views:

1. Command Center
2. Global Infrastructure
3. Application Fleet
4. Live Topology
5. Data Fabric
6. Reliability
7. Capacity
8. Cost Intelligence
9. AI Agent Fleet
10. Governance
11. Security
12. Deployments
13. Migrations
14. Audit
15. Developer/Operator Center

Every displayed operational fact SHALL expose or derive from:

- source authority
- freshness
- timestamp/version
- confidence when estimated
- actionability

The Command Center SHALL provide a real-time infrastructure overview, including health, traffic, latency, errors, capacity, cost, topology and AI-agent state.

## 33. Super Management Center Visual Direction

The initial product visual direction is a dark, high-density, green/purple AI infrastructure command center.

Green represents healthy/active/confirmed state.
Purple represents AI/automation/intelligence.
Blue may represent data flow.
Yellow represents warning.
Red represents critical state.

The visual layer MUST remain a projection of real management APIs and control-plane state.

Decorative state MUST NOT be presented as operational truth.

## 34. Cost Intelligence

Cost SHALL be visible as an infrastructure dimension alongside performance, reliability and capacity.

The system SHOULD expose:

- current authoritative/estimated infrastructure cost
- cost per request/workload where measurable
- storage cost
- compute/runtime cost
- read/write cost
- cache savings
- optimization opportunities
- projected cost under scaling plans

Estimated values MUST be clearly distinguished from provider-authoritative billing data.

Cost recommendations MUST be explainable, versioned and policy-bounded.

## 35. Data Residency and Locality Contract

Applications MAY declare locality or residency requirements.

The placement policy SHALL be able to evaluate:

- allowed locations
- prohibited locations
- cross-location transfer constraints
- tenant policy
- consistency implications
- cost implications
- recovery implications

A provider adapter MUST NOT silently violate a declared residency policy.

## 36. Resource Retirement and Garbage-Collection Contract

Every provisioned resource SHALL have lifecycle state:

`requested → active → draining → retired → verified-deleted`

Retirement SHALL define:

- ownership
- dependencies
- drain conditions
- data-retention obligations
- backup requirements
- deletion authorization
- verification
- orphan detection

Garbage collection MUST NOT delete authoritative resources without explicit lifecycle proof.

## 37. Provider Adapter Strategy

3.2 SHALL keep provider abstraction behind capability contracts.

Phase 1 remains Cloudflare-native.

Future provider adapters MAY support external databases or additional infrastructure providers, but multi-cloud support MUST NOT be allowed to distort the Cloudflare-native Open Core.

Provider abstraction is a strategic extension point, not a 3.2 requirement for broad multi-cloud implementation.

Provider adapters SHALL translate provider-specific semantics into explicit capability contracts rather than hiding material behavioral differences.

## 38. Open Core / Advanced / Frontier Boundary

Open Core MUST include only capabilities required for a correct, deterministic, testable infrastructure kernel.

Advanced includes mature high-end capabilities such as online movement, migration proof, workload-aware placement, hotspot management, safe schema change and policy-gated rollout.

Frontier includes prediction, AI-assisted RCA, adaptive optimization and bounded autonomy.

No Advanced or Frontier capability may become an implicit synchronous dependency of Open Core.

## 39. Versioning, Compatibility and Historical Isolation

3.2 contracts SHALL be versioned.

Breaking changes require:

- ADR
- contract impact analysis
- dependency DAG update
- ownership review
- migration plan
- compatibility strategy
- regression evidence

Historical 1.x/2.x material SHALL remain immutable reference material.

Locked historical directories and artifacts MUST NOT:

- participate in active dependency DAGs
- be imported by new runtime code
- be used as active contract sources without explicit migration
- alter current ownership or capability state

Historical restoration or comparison may occur only through explicitly declared reference tooling.

## 40. Change Admission Contract

A new capability, policy, provider binding or architecture mutation requires:

1. problem statement
2. classification
3. industry provenance or original rationale
4. capability ID when applicable
5. module ownership
6. dependency DAG placement
7. authority declaration
8. contract impact
9. runtime impact
10. security impact
11. cost impact
12. failure-domain impact
13. verification plan
14. rollback/recovery strategy
15. release classification
16. governance rule
17. change manifest scope

No feature enters implementation merely because an agent generated a plausible design.

## 41. Non-Goals for 3.2

3.2 does not authorize:

- uncontrolled multi-cloud implementation
- arbitrary additional workers
- AI bypass of governance
- autonomous destructive migrations
- replacing Cloudflare primitives without evidence
- speculative distributed-database features with no defined workload
- speculative message-broker replacement
- universal distributed transactions before workload evidence
- automatic global rebalance without bounded blast radius
- UI-first development that creates fake operational state

## 42. Development Order

### Phase 0 — Architecture and governance hardening

Authority, bootstrap, SLO/error budget, failure domains, tenant isolation, admission, idempotency, event semantics, migration rollback, DR/restore.

### Phase 1 — Machine governance enforcement

Capability Registry, ADR Registry, Ownership Map, Dependency DAG, Binding Ownership, Change Manifest, Diff Scope Gate and historical isolation.

### Phase 2 — Core contracts

Capability Registry, Consistency, Identity/Tenant, Provider Constraints, Cache, Workload, Capacity/Cost.

### Phase 3 — Runtime safety contracts

Admission/Backpressure, Idempotency, Event/Outbox, Reliability, Hotspot protection.

### Phase 4 — State and change control

Desired/Actual State, reconciliation, schema evolution, deployment safety, migration/cutover.

### Phase 5 — W01-W06 contract integration

Integrate only after all prerequisite architecture contracts are PASS.

### Phase 6 — Management API

Expose authoritative operational state with freshness/version semantics.

### Phase 7 — Super Management Center

Build the management surface only against real management APIs.

### Phase 8 — DR, chaos and continuous verification

Make recovery and failure injection executable release gates.

### Phase 9 — AI infrastructure agents

L0-L2 first, then bounded L3, then narrowly bounded L4 where deterministic safety proof exists.

### Phase 10 — Advanced adaptive optimization

Only after production evidence demonstrates the need and safety envelope.

No phase may begin until its prerequisite contracts pass review.

## 43. Mandatory Architecture Invariants

The following are non-negotiable invariants:

1. Every mutable infrastructure object has exactly one authoritative writer.
2. Every authoritative object has explicit version/generation/epoch semantics.
3. Every control-plane dependency used by request execution has defined stale-data and fail-open/fail-closed behavior.
4. Every tenant-scoped operation has explicit isolation and authorization semantics.
5. Every externally retryable mutation has an idempotency contract.
6. Every event consumer is idempotent or has an explicit stronger delivery guarantee.
7. Every production mutation has health predicates, blast-radius limits and rollback/recovery criteria.
8. Every destructive operation has restore/recovery evidence.
9. Every production capability has measurable reliability objectives.
10. Every reconciliation loop has convergence and anti-oscillation rules.
11. Every provider binding declares material runtime and cost constraints.
12. AI cannot bypass deterministic governance or obtain unrestricted mutation authority.
13. Historical architecture cannot silently become active architecture.
14. No new worker is justified solely by logical decomposition.

## 44. Architecture Review Checklist

The 3.2 proposal passes review only if all are true:

- [ ] Top-level abstraction is `Intent → Identity/Tenant → Capability → Policy → Admission → Placement → Execution → State → Events → Reliability → Observability → Governance`
- [ ] D1 sharding is correctly positioned as a Data Plane capability
- [ ] W01-W06 ownership is non-overlapping
- [ ] authority and source-of-truth are explicit
- [ ] control-plane bootstrap and degraded mode are explicit
- [ ] SLO/error-budget/RPO/RTO are measurable
- [ ] failure domains are explicit
- [ ] tenant isolation is enforceable
- [ ] admission/backpressure is enforceable
- [ ] idempotency is formalized
- [ ] event delivery/replay semantics are formalized
- [ ] Capability Registry is contract-driven
- [ ] Consistency is explicit and provider-independent
- [ ] cache semantics are explicit
- [ ] hotspot protection is defined
- [ ] Desired/Actual State and reconciliation are defined
- [ ] schema evolution is governed
- [ ] deployment safety is governed
- [ ] migration rollback is classified and verifiable
- [ ] DR/restore is executable and tested
- [ ] governance is machine-enforceable
- [ ] observability preserves causality
- [ ] security boundaries are explicit
- [ ] AI is sandboxed, bounded and auditable
- [ ] Super Management Center is a projection of real state
- [ ] cost is a first-class signal with estimate/authority separation
- [ ] provider adapters remain optional extension points
- [ ] Open Core remains independently operable
- [ ] no new worker is introduced merely for logical separation
- [ ] 1.x/2.x historical material cannot affect 3.2 development
- [ ] implementation order is contract-first
- [ ] all P0 hard gates are PASS

## 45. Review Status

Current status: `DRAFT FOR ARCHITECTURE REVIEW — HARDENED`.

This document incorporates the mandatory architecture-hardening direction identified by the 3.2 Red-Team review.

The next acceptance step is a formal architecture review against Sections 31, 43 and 44, followed by ADR/amendment closure for any remaining findings.

Implementation remains prohibited until the architecture review is PASS and the contract is explicitly promoted to `ACTIVE`.
