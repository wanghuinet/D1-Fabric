# D1-Fabric 3.2 Infrastructure Architecture Contract

Version: 1.0  
Status: DRAFT FOR ARCHITECTURE REVIEW  
Supersedes: 3.1 architecture planning as the forward-looking 3.2 planning baseline; does not authorize implementation until review PASS.  
Purpose: define the complete 3.2 architecture direction for D1-Fabric as a Cloudflare-native distributed application infrastructure substrate.

## 0. Executive Decision

D1-Fabric 3.2 SHALL evolve from a D1 sharding middleware into a Cloudflare-native distributed application infrastructure substrate.

D1 sharding remains an important implementation capability, but it SHALL NOT remain the top-level product abstraction.

The top-level abstraction is:

Application Intent → Capability → Policy → Placement → Execution → Data/State → Reliability → Governance

D1 is one storage provider inside the Data Plane. Cloudflare Workers, D1, Durable Objects, KV, R2, Queues and Workflows are infrastructure primitives selected through explicit contracts and policies.

3.2 SHALL preserve the Open Core rule: the foundational kernel must operate correctly without Advanced or Frontier capabilities enabled.

## 1. Product Definition

D1-Fabric is a Cloudflare-native, policy-driven, control-plane-based distributed application infrastructure substrate for AI applications, content platforms, SaaS, games, social applications, APIs and other high-concurrency workloads.

The substrate provides:

- application gateway and request context
- execution orchestration
- transactional write safety
- relational and non-relational data capability routing
- consistency policy
- reliability policy
- topology and placement
- expansion, migration and rebalance
- governance and machine-enforced architecture rules
- observability and cost intelligence
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
Consistency, retry, placement, cost, capacity and rollout behavior SHALL be represented as policies with versioned contracts.

### 2.3 Control Plane / Data Plane Separation
Control decisions SHALL be separated from request-serving data execution. Control-plane failures MUST NOT unnecessarily become synchronous data-plane availability dependencies.

### 2.4 Desired State / Actual State
Infrastructure changes SHALL use desired state, observed actual state, diff, policy evaluation, change manifest, safe execution and reconciliation.

### 2.5 AI Is Advisory Before It Is Autonomous
AI SHALL NOT be a synchronous availability dependency of Open Core. AI actions SHALL pass through policy and governance controls.

### 2.6 Deployment Boundaries Are Not Logical Boundaries
Logical planes MAY exceed six workers. The deployment topology SHALL remain deliberately small. New workers require explicit architectural justification.

### 2.7 Governance Is Executable
Architecture rules SHALL be represented as machine-checkable registries, ownership rules, dependency rules, change manifests and CI gates.

### 2.8 Cost Is a First-Class Constraint
Performance, reliability and cost SHALL be evaluated together. The platform SHALL expose cost-aware routing and capacity decisions where the underlying provider permits them.

## 3. Logical Architecture

D1-Fabric 3.2 consists of the following logical planes:

1. Application Plane
2. Gateway Plane
3. Execution Plane
4. Write Plane
5. Data Plane
6. Reliability Plane
7. Control Plane
8. Governance Plane
9. Observability Plane
10. AI Plane
11. Management Plane

These are logical responsibilities, not a requirement for eleven deployed workers.

## 4. Deployment Baseline: W01-W06

### W01 Gateway

Owns:

- request ingress
- authentication/authorization integration
- tenant/application context
- request identity and correlation
- API contract enforcement
- rate limiting hooks
- admission control

MUST NOT own storage placement or migration decisions.

### W02 Execution

Owns:

- query/command execution orchestration
- execution context
- capability invocation
- bounded fan-out
- request budget enforcement
- execution result normalization

MUST NOT become the system-wide control plane.

### W03 Write

Owns:

- write execution
- transaction boundaries
- idempotency
- commit semantics
- outbox/event publication boundary
- write failure classification

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

Owns the reliability contract:

- timeout/deadline
- retry/backoff
- failure classification
- circuit breaker
- cancellation
- bulkhead/admission controls
- idempotency enforcement hooks
- recovery
- replay/dead-letter strategy
- consistency protection
- degradation policy

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

W06 is the infrastructure decision system. It MUST NOT become a synchronous dependency for every normal request.

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
- ownership
- dependency DAG position
- verification contract

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

## 6. Consistency Contract

3.2 SHALL standardize consistency as an explicit policy dimension.

Initial classes:

- eventual
- read-your-writes
- sequential
- strong
- serializable

Applications and internal services MUST NOT infer consistency solely from a provider name.

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

## 7. Workload Model

3.2 SHALL classify workload characteristics before making placement or capacity decisions.

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

Workload classification MAY be static, observed or AI-assisted. AI-derived classification MUST remain bounded and auditable.

## 8. Desired State and Reconciliation

All infrastructure mutations SHALL follow:

Desired State
→ Control Plane
→ Observe Actual State
→ Compute Diff
→ Policy Evaluation
→ Change Manifest
→ Ownership/Dependency Validation
→ Safe Execution
→ Verification
→ Actual State
→ Reconciliation

The Reconciliation Engine SHALL detect drift and SHALL distinguish:

- expected drift
- transient drift
- policy violation
- ownership violation
- infrastructure failure
- unsafe change

No autonomous mutation may bypass the Change Manifest and Diff Scope Gate.

## 9. Event and Outbox Contract

Reliable state change publication SHALL use an explicit transactional boundary.

Baseline pattern:

Transaction
→ durable application state
→ outbox record
→ commit
→ queue/event transport
→ consumers

Queues SHALL be treated as event transport/buffering. Workflows SHALL be used for durable multi-step processes when justified.

Events MUST support idempotent consumption.

## 10. Reliability Contract

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

Retry MUST NOT be used to amplify overload.

## 11. Topology, Placement and Scaling

Control Plane SHALL manage logical topology independently from physical provider identities.

Placement inputs MAY include:

- workload class
- tenant constraints
- locality
- latency
- capacity
- hotness
- consistency
- cost
- failure domains

Scaling SHALL prefer safe monotonic expansion. Shrink/destructive consolidation requires explicit policy and verification.

Migration and rebalance SHALL be verifiable and interruptible.

## 12. Migration and Cutover

Migration SHALL be a state machine rather than a single imperative action.

Baseline states:

planned → prepared → dual/read-shadow → copying → verified → cutover-ready → cutover → stabilized → completed

Failure transitions SHALL support pause, rollback or compensating recovery according to the migration contract.

Policy-Gated Cutover SHALL remain a formal safety boundary.

## 13. Governance Plane

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

CI SHALL reject unauthorized ownership changes, dependency violations, out-of-scope changes and contract-breaking changes according to these rules.

## 14. Observability Plane

Observability SHALL be cross-cutting and SHALL expose at minimum:

- request rate
- latency percentiles
- errors
- saturation
- capacity
- shard health
- replication/consistency indicators where available
- migration state
- queue/event health
- control-plane reconciliation state
- cost indicators
- audit events

Observability data SHALL be suitable for both humans and machine agents.

## 15. AI Plane

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

L0 Observe
L1 Recommend
L2 Simulate
L3 Auto-Execute low-risk changes
L4 Autonomous within explicitly bounded policy domains

AI execution flow:

Agent
→ Proposal
→ Policy Engine
→ Change Manifest
→ Diff Scope Gate
→ Approval/Auto-Approval
→ Execution
→ Verification
→ Audit

AI MUST NOT bypass governance or become an unbounded production mutation mechanism.

## 16. Super Management Center

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

The Command Center SHALL provide a real-time infrastructure overview, including health, traffic, latency, errors, capacity, cost, topology and AI-agent state.

## 17. Super Management Center Visual Direction

The initial product visual direction is a dark, high-density, green/purple AI infrastructure command center.

Green represents healthy/active/confirmed state.
Purple represents AI/automation/intelligence.
Blue may represent data flow.
Yellow represents warning.
Red represents critical state.

The visual layer MUST remain a projection of real management APIs and control-plane state. Decorative state MUST NOT be presented as operational truth.

## 18. Cost Intelligence

Cost SHALL be visible as an infrastructure dimension alongside performance and reliability.

The system SHOULD expose:

- current estimated infrastructure cost
- cost per request/workload where measurable
- storage cost
- compute cost
- read/write cost
- cache savings
- optimization opportunities
- projected cost under scaling plans

Cost recommendations MUST be explainable and policy-bounded.

## 19. Provider Adapter Strategy

3.2 SHALL keep provider abstraction behind capability contracts.

Phase 1 remains Cloudflare-native.

Future provider adapters MAY support external databases or additional infrastructure providers, but multi-cloud support MUST NOT be allowed to distort the Cloudflare-native Open Core.

Provider abstraction is a strategic extension point, not a 3.2 requirement for broad multi-cloud implementation.

## 20. Open Core / Advanced / Frontier Boundary

Open Core MUST include only capabilities required for a correct, deterministic, testable infrastructure kernel.

Advanced includes mature high-end capabilities such as online movement, migration proof, workload-aware placement, hotspot management, safe schema change and policy-gated rollout.

Frontier includes prediction, AI-assisted RCA, adaptive optimization and bounded autonomy.

No Advanced or Frontier capability may become an implicit synchronous dependency of Open Core.

## 21. Security and Safety

All management actions MUST be authenticated, authorized, attributable and auditable.

High-risk operations SHALL require explicit policy and, where configured, human approval.

Management APIs MUST NOT expose raw provider credentials or secrets to AI agents.

## 22. Versioning and Compatibility

3.2 contracts SHALL be versioned.

Breaking changes require:

- ADR
- contract impact analysis
- dependency DAG update
- ownership review
- migration plan
- compatibility strategy
- regression evidence

Old 1.x/2.x and historical architecture artifacts SHALL remain immutable reference material and SHALL NOT silently affect current 3.2 development.

## 23. Development Order

Phase 0 — architecture and governance freeze

Phase 1 — machine governance enforcement

Phase 2 — Capability Registry

Phase 3 — Consistency Contract

Phase 4 — Desired/Actual State and Reconciliation

Phase 5 — W01-W06 contract integration

Phase 6 — Management API

Phase 7 — Super Management Center

Phase 8 — AI infrastructure agents

Phase 9 — advanced adaptive optimization

No implementation phase may begin until its prerequisite contracts pass review.

## 24. Admission Gate for New Capabilities

A new capability requires:

1. problem statement
2. classification
3. industry provenance or original rationale
4. capability ID
5. module ownership
6. dependency DAG placement
7. contract impact
8. runtime impact
9. security impact
10. cost impact
11. verification plan
12. rollback/recovery strategy
13. release classification
14. governance rule

## 25. Non-Goals for 3.2

3.2 does not authorize:

- uncontrolled multi-cloud implementation
- arbitrary additional workers
- AI bypass of governance
- autonomous destructive migrations
- replacing Cloudflare primitives without evidence
- speculative distributed-database features with no defined workload
- UI-first development that creates fake operational state

## 26. Architecture Review Checklist

The 3.2 proposal passes review only if all are true:

- [ ] D1 sharding is correctly positioned as a Data Plane capability
- [ ] W01-W06 ownership is non-overlapping
- [ ] Capability Registry is contract-driven
- [ ] Consistency is explicit and provider-independent
- [ ] Desired/Actual State and reconciliation are defined
- [ ] Event/outbox semantics are explicit
- [ ] Reliability policies are centralized
- [ ] Governance is machine-enforceable
- [ ] AI is bounded and auditable
- [ ] Super Management Center is a projection of real state
- [ ] Cost is a first-class signal
- [ ] Provider adapters remain optional extension points
- [ ] Open Core remains independently operable
- [ ] No new worker is introduced merely for logical separation
- [ ] 1.x/2.x historical material cannot affect 3.2 development
- [ ] Implementation order is contract-first

## 27. Review Status

Current status: DRAFT FOR ARCHITECTURE REVIEW.

This document intentionally captures the complete 3.2 architectural direction before implementation. Review findings MUST be recorded as ADRs or explicit amendments before the contract becomes ACTIVE.
