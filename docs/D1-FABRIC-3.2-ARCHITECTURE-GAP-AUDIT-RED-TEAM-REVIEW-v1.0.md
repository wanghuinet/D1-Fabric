# D1-Fabric 3.2 Architecture Gap Audit & Red-Team Review

Version: 1.0  
Status: REVIEW FINDINGS / NOT YET PASS  
Target: `D1-FABRIC-3.2-INFRASTRUCTURE-ARCHITECTURE-CONTRACT-v1.0.md`  
Review posture: production-grade distributed infrastructure / failure-first / adversarial architecture review  
Review date: 2026-09-12

## 0. Executive Verdict

**Verdict: NO-GO for 3.2 implementation freeze.**

The 3.2 contract is directionally strong and correctly elevates D1-Fabric from D1 sharding middleware toward a Cloudflare-native distributed application infrastructure substrate. The contract already establishes capability abstraction, six-worker deployment discipline, control/data separation, desired/actual state, reconciliation, explicit consistency, event/outbox, centralized reliability, machine-enforced governance, bounded AI autonomy and the Super Management Center.

However, a production-grade review finds several architectural contracts that are still implicit. If implementation starts before these are made explicit, the highest risk is not that individual components fail; it is that the system acquires contradictory sources of truth, unsafe control-plane behavior, ambiguous consistency semantics, weak tenant isolation, incomplete disaster recovery, non-deterministic reconciliation, retry amplification, unbounded fan-out, or an operational dashboard that reports state without a trustworthy freshness/authority model.

The contract therefore requires a **3.2.1 architecture amendment set** before it can become ACTIVE.

## 1. Review Standard

The review uses the following principles:

- failure-first design
- explicit SLO/SLA and error-budget ownership
- control-plane independence from normal data-plane availability
- deterministic state transitions
- explicit source of truth and authority
- bounded concurrency and backpressure
- tenant isolation and security by construction
- disaster recovery and restore verification
- safe rollout and rollback
- observability as an operational contract, not a dashboard feature
- measurable capacity and cost assumptions
- continuous verification and failure injection
- AI bounded by deterministic policy and auditable evidence

Google SRE emphasizes reliability, monitoring, automation and error budgets, and its large-system design guidance requires concrete resource, scaling, failure-domain and degradation analysis rather than abstract diagrams. Meta's shard-manager architecture similarly separates control from serving and explicitly allows applications to continue in degraded mode when the central control plane is unavailable. Alibaba's reliability guidance emphasizes failure-oriented design, isolation, degradation and fine-grained operability. These principles are used as review criteria, not as implementation dependencies.

## 2. P0 Findings — Must Close Before Implementation

### P0-01 — No explicit Source-of-Truth / Authority Model

**Finding:** Capability Registry, Resource Registry, Topology, Placement, Version Metadata, Desired State and Actual State are named, but the contract does not define which store is authoritative for each object, who may write it, how versions are ordered, or how conflicting observations are resolved.

**Failure mode:** W06 believes shard version N is current while W04 has cached version N-1; reconciliation sees contradictory state; an operator or AI agent writes a stale desired state and causes a rollback or split-brain configuration.

**Required amendment:** Add an Authority Model defining:

- authoritative object types
- authoritative writer
- read replicas/caches
- monotonic version / epoch rules
- compare-and-swap or equivalent conditional mutation
- stale-reader behavior
- conflict resolution
- bootstrap source of truth
- recovery source of truth
- audit source of truth

### P0-02 — Control Plane Bootstrap / Self-Dependency Gap

**Finding:** W06 is the infrastructure decision system, but no bootstrap contract explains how W06 starts, discovers its own state, recovers after total loss, or operates when its dependencies are unavailable.

**Failure mode:** Control plane depends on Data Plane; Data Plane depends on Control Plane; both cannot bootstrap during outage.

**Required amendment:** Define a bootstrap dependency graph and a minimal recovery root. Control-plane state required for normal data serving MUST have a low-dependency recovery path. Normal request serving MUST have a cached/last-known-good operating mode where safe.

### P0-03 — SLO / Error Budget / Reliability Objective Contract Missing

**Finding:** Observability lists metrics, but there is no formal definition of service-level objectives, availability/error budgets, latency objectives, consistency objectives or recovery objectives.

**Failure mode:** The system optimizes whatever is easiest to measure rather than user-visible reliability.

**Required amendment:** Add SLO contract with at least:

- availability SLO
- success-rate definition
- latency SLOs
- freshness/consistency SLO where applicable
- RPO
- RTO
- durability objective
- error-budget policy
- alert thresholds
- ownership
- release/migration consequences when budget is exhausted

### P0-04 — Failure-Domain Model Is Incomplete

**Finding:** Placement mentions failure domains but does not define the hierarchy or isolation contract.

**Required amendment:** Define failure domains such as request, isolate, Worker, Durable Object, database, shard, region, provider subsystem and account/control-plane scope, and specify which failures may be correlated.

### P0-05 — Tenant Isolation Is Under-Specified

**Finding:** Tenant/application context exists, but there is no complete isolation contract covering authorization, quotas, noisy-neighbor protection, data boundaries, rate limits, per-tenant capacity, audit scope and failure containment.

**Failure mode:** One tenant's hot workload consumes shared D1/query/subrequest/queue capacity and degrades unrelated tenants.

**Required amendment:** Add Tenant Isolation Contract covering identity, authorization, namespace, quotas, concurrency, cost attribution, storage isolation, data access policy and noisy-neighbor controls.

### P0-06 — Admission Control / Backpressure Is Not a Complete System Contract

**Finding:** W01/W05 mention admission and bulkhead controls, but the system does not define where overload is detected, what is rejected, what is queued, what is shed, and how pressure propagates across W01-W06 and Cloudflare primitives.

**Failure mode:** Queue growth + retries + fan-out create positive feedback and turn partial overload into global failure.

**Required amendment:** Define global backpressure semantics, per-tenant budgets, queue depth thresholds, concurrency limits, load shedding classes, priority classes and retry interaction.

### P0-07 — Idempotency Semantics Are Not Strong Enough

**Finding:** Idempotency appears in W03 and reliability, but there is no universal idempotency key scope, lifecycle, deduplication window, result replay rule or storage authority.

Cloudflare Queues explicitly provides at-least-once delivery, meaning duplicate delivery is possible; Cloudflare recommends unique IDs and idempotency keys for duplicate-safe processing. citeturn1search0

**Required amendment:** Define idempotency as a first-class contract for commands, outbox publication, queue consumption, migrations and management operations.

### P0-08 — Event Semantics Need Delivery / Ordering / Poison-Message Contracts

**Finding:** Outbox and queue are present, but event ordering, delivery semantics, retry behavior, poison messages, DLQ retention and replay semantics are not fully defined.

Cloudflare Queues defaults to at-least-once delivery; failed messages can be retried and, without a configured DLQ, can be deleted after the retry limit. citeturn1search0turn1search5

**Required amendment:** Explicitly define:

- at-least-once semantics
- ordering scope, if any
- event identity
- consumer idempotency
- retry ownership
- DLQ policy
- replay authorization
- poison-message quarantine
- schema compatibility
- event versioning

### P0-09 — Migration Rollback Is Not Always Physically Reversible

**Finding:** The migration state machine allows rollback/compensation but does not distinguish reversible from irreversible operations.

**Failure mode:** After destructive cleanup or schema mutation, a nominal rollback state exists but the original data/state cannot be reconstructed.

**Required amendment:** Every migration step must declare rollback class: reversible, compensatable, forward-only, or destructive. Destructive operations require backup/restore evidence and an explicit irreversible checkpoint.

### P0-10 — Disaster Recovery / Restore Verification Missing

**Finding:** D1 Time Travel and backups are not represented as a formal recovery architecture. Restore is treated as an operational detail rather than a tested contract.

Current D1 documentation exposes Time Travel recovery and per-database restore limits, so the substrate needs a policy layer over those provider capabilities rather than assuming generic recovery. citeturn1search2

**Required amendment:** Add DR contract with RPO/RTO, backup source, restore procedure, dependency order, cross-resource recovery, restore verification, corruption scenario and game-day testing.

## 3. P1 Findings — Must Close Before Production Readiness

### P1-01 — Cloudflare Runtime Limits Are Not Yet First-Class Constraints

The architecture says bounded fan-out and request budgets, but it does not bind those budgets to real platform constraints.

Current Workers documentation lists 10,000 subrequests/request on paid plans, six simultaneous outgoing connections/request, 128 MB memory and a configurable CPU limit with a 5-minute ceiling; HTTP duration is not hard-limited while connected, but runtime updates have a 30-second grace period. citeturn1search1

**Required amendment:** Create a Provider Constraint Contract and make runtime limits part of admission, execution planning and verification.

### P1-02 — D1 Capacity and Billing Constraints Need Explicit Scheduling Semantics

Current D1 limits include 10 GB maximum database size on Workers Paid, 1 TB account storage, 1,000 queries per Worker invocation and 2 MB maximum string/BLOB/table-row size. D1 billing is based on rows read/written and storage. citeturn1search2turn1search9

**Required amendment:** Capacity planner and cost intelligence MUST reason about actual provider constraints, not abstract capacity alone.

### P1-03 — Read-Replica Consistency Needs a Precise Session Contract

D1 global read replication is asynchronous; writes remain on primary, and Sessions API provides sequential consistency within a logical session. citeturn1search3

**Required amendment:** Define when the router may use replicas, what a read-your-writes guarantee means across requests, how session/bookmark state is carried, and what happens when a required consistency guarantee cannot be satisfied.

### P1-04 — Consistency Taxonomy Is Too Broad Without Formal Semantics

`eventual`, `read-your-writes`, `sequential`, `strong`, and `serializable` are useful labels but are not sufficient contracts by themselves.

**Required amendment:** Each class needs formal guarantees, allowed anomalies, scope, duration, failure behavior and verification tests. Do not claim `strong` or `serializable` where only a provider-specific narrower guarantee exists.

### P1-05 — Cache Contract Is Missing

KV/cache appears as capability families, but cache invalidation, TTL, stale-while-revalidate, negative caching, stampede protection, consistency interaction and cache authority are undefined.

**Required amendment:** Add Cache Contract. Cache MUST NEVER silently become the source of truth for authoritative state.

### P1-06 — Hot-Key / Hot-Shard Protection Needs Runtime Mechanics

Hotness is an input, but the contract does not define detection windows, thresholds, hysteresis, isolation strategy, request shedding or whether a hot key can be moved without changing its correctness semantics.

**Required amendment:** Add Hotspot Protection Contract with detection, mitigation, verification and rollback.

### P1-07 — Schema Evolution Is Missing from the Core Lifecycle

The function catalog already lists safe schema change pipeline and database change request capabilities, but the 3.2 contract does not connect schema evolution to capability versions, migration, compatibility and rollout gates. fileciteturn9file0

**Required amendment:** Add Schema Evolution Contract: expand/contract migration, compatibility window, reader/writer version matrix, rollback boundary and data backfill policy.

### P1-08 — API / Contract Compatibility Needs a Concrete Version Matrix

Versioning is stated, but there is no compatibility matrix for Worker-to-Worker contracts, capability contracts, event schemas, management APIs, configuration schemas and state schemas.

**Required amendment:** Define backward/forward compatibility rules and supported-version windows.

### P1-09 — Safe Deployment / Progressive Delivery Is Under-Specified

Progressive rollout exists in the 3.1 function catalog, but the 3.2 contract does not make deployment health checks, canarying, automatic rollback and change freeze conditions part of the core lifecycle.

Meta's recent deployment-safety work describes health checks integrated with phased rollouts and automatic rollback, demonstrating why deployment safety must be a control contract rather than an afterthought. citeturn0academia47

**Required amendment:** Add Deployment Safety Contract with canary, health predicates, blast radius, rollback trigger and post-deploy stabilization window.

### P1-10 — Control Plane Staleness and Degraded Mode Need Explicit Rules

The contract says W06 must not be a synchronous dependency, but does not specify how long stale topology/configuration can be used or which operations are forbidden under stale state.

**Required amendment:** Define freshness TTL/epoch, last-known-good state, safe read-only/degraded modes and fail-closed operations.

### P1-11 — Control-Plane State Storage Needs Its Own Reliability Contract

A global control plane should not depend on a fragile application database arrangement. Meta's Delos work highlights that control-plane storage has distinct requirements including strong consistency, high availability, low dependencies and independent restart/bootstrap. citeturn0search13

**Required amendment:** Define the minimum control-state substrate and its recovery/availability requirements before implementation.

### P1-12 — Security Architecture Is Too Thin

Authentication, authorization and audit are present, but there is no threat model, trust boundary map, least-privilege contract, service identity, key rotation, tenant boundary policy, management-plane isolation or AI tool permission model.

**Required amendment:** Add Security Architecture Contract and threat model.

### P1-13 — Management Center Needs Freshness / Authority / Action Semantics

The Super Management Center is well-defined as a projection, but not yet as an operational truth system.

**Required amendment:** Every dashboard value must have:

- source
- timestamp
- freshness
- authority
- confidence
- aggregation scope
- actionability

Actions must show expected blast radius, policy used, manifest ID and verification status.

### P1-14 — Observability Needs Trace and Causal Correlation Contract

Metrics are listed, but cross-plane correlation is missing.

**Required amendment:** Standardize request ID, trace ID, tenant ID, operation ID, change ID, migration ID, event ID and causality links across W01-W06 and management actions.

### P1-15 — Capacity Planning Is Not Quantified

The architecture mentions capacity but contains no workload envelope, scaling equations, budget ceilings, saturation targets or test methodology.

Google's NALSD guidance specifically stresses concrete resource estimates and failure-domain/capacity reasoning early in system design to avoid late physical-constraint redesign. citeturn0search2

**Required amendment:** Add Capacity Model Contract with measurable envelopes and load-test acceptance criteria.

## 4. P2 Findings — Important for Moat / Long-Term Evolution

### P2-01 — Provider Abstraction Could Become an Abstraction Tax

Capability-over-provider is strategically correct, but too much abstraction too early can erase provider-specific strengths and create lowest-common-denominator APIs.

**Recommendation:** Keep capability contracts semantic and narrow. Permit provider-specific extensions without leaking them into Open Core.

### P2-02 — Reconciliation Needs Deterministic Convergence Proof

The contract says reconciliation detects drift but does not specify convergence, idempotence or oscillation prevention.

**Recommendation:** Every reconciler needs:

- deterministic input snapshot
- generation/epoch
- idempotent apply
- convergence condition
- retry ceiling
- oscillation detection
- stuck-state classification
- operator escape hatch

### P2-03 — AI Should Never Be the Sole Source of Diagnosis

AI-assisted RCA is useful, but operational actions need deterministic evidence.

**Recommendation:** AI output must cite machine-observed evidence and confidence. A low-confidence AI proposal cannot cross an automatic execution threshold.

### P2-04 — AI L4 Needs a Formal Capability Sandbox

"Bounded policy domains" is not enough.

**Recommendation:** Define per-agent:

- tools
- resources
- namespaces
- maximum blast radius
- allowed mutations
- rate limits
- approval class
- rollback ability
- kill switch
- credential scope
- audit retention

### P2-05 — Cost Intelligence Needs Billing Truth vs Estimate Separation

Estimated cost can be misleading when provider billing metrics lag or differ from application attribution.

**Recommendation:** Every cost number must be labeled actual, provider-reported, estimated or forecast.

### P2-06 — Data Residency / Locality Policy Is Missing

Global application infrastructure needs explicit rules for where tenant data may reside and where control-plane metadata may be processed.

**Recommendation:** Add data residency and locality constraints to Capability/Placement/Security contracts.

### P2-07 — Object / Media Lifecycle Is Missing

R2 is listed, but lifecycle policy, retention, deletion guarantees, orphan cleanup, legal hold and reference integrity are not defined.

**Recommendation:** Add Object Lifecycle Contract.

### P2-08 — Resource Lifecycle / Garbage Collection Is Missing

The architecture covers expansion and migration but not safe deletion of obsolete shards, versions, queues, objects, caches, bindings or control-state records.

**Recommendation:** Add resource retirement protocol with grace periods, reference checks and reversible tombstones.

### P2-09 — Upgrade / Rollback of the Infrastructure Itself Is Missing

Application migration is covered, but upgrading D1-Fabric W01-W06, capability schemas and control-plane state is not.

**Recommendation:** Add platform upgrade contract with N/N-1 compatibility, staged rollout and rollback.

### P2-10 — Failure Injection / Chaos Verification Is Missing

The function catalog includes verification but 3.2 does not require recurring failure injection.

Meta's production engineering experience explicitly emphasizes failure injection, disaster readiness and continuous testing of failure behavior. citeturn0search4

**Recommendation:** Make failure injection a release and continuous-verification requirement.

## 5. Red-Team Scenarios

### RT-01 — W06 Completely Unavailable

Expected: existing applications continue using last-known-good routing where safe; control mutations stop; no stale destructive action; management center clearly shows degraded control state.

### RT-02 — W06 Returns Stale Placement

Expected: epoch/freshness check rejects stale mutation; data plane can continue only within a defined safe window.

### RT-03 — Queue Consumer Processes Event Twice

Expected: idempotency key prevents duplicate side effects; event remains auditable.

### RT-04 — Queue Consumer Permanently Fails

Expected: bounded retries → DLQ → alert → operator/AI review; no silent deletion.

### RT-05 — D1 Replica Is Arbitrarily Stale

Expected: router honors consistency policy and avoids replica when guarantee cannot be met. D1 read replication is asynchronous and replicas can lag. citeturn1search3

### RT-06 — Hot Shard During Traffic Spike

Expected: detect → protect → shed/queue → isolate → migrate/expand only when safe; no retry storm.

### RT-07 — Migration Cutover Fails Midway

Expected: deterministic state machine enters a known safe state; no ambiguous dual ownership; rollback or compensation path is explicit.

### RT-08 — AI Proposes Dangerous Migration

Expected: policy rejects it before execution; no provider credentials are exposed; proposal remains auditable.

### RT-09 — Control Database Corrupted

Expected: restore from authoritative recovery source; verify state; prevent stale/partial control state from issuing mutations.

### RT-10 — One Tenant Floods the System

Expected: per-tenant quotas/bulkheads contain blast radius; unrelated tenants remain within SLO.

### RT-11 — Provider Limit Reached

Expected: admission/capacity planner detects limit before hard failure; graceful degradation or scale-out occurs where possible.

### RT-12 — Deployment Introduces Regression

Expected: health checks detect regression, stop progression and automatically rollback according to deployment policy.

### RT-13 — Management Center Shows Stale Data

Expected: UI labels freshness and authority; it never displays stale telemetry as current truth.

### RT-14 — Reconciler Oscillates

Expected: generation/epoch and convergence safeguards stop repeated contradictory mutations and raise a stuck-state alert.

## 6. Required 3.2.1 Contract Additions

Before 3.2 can become ACTIVE, add or amend:

1. **Authority & Source-of-Truth Contract**
2. **Control-Plane Bootstrap & Recovery Contract**
3. **SLO / Error-Budget Contract**
4. **Failure-Domain Contract**
5. **Tenant Isolation & Quota Contract**
6. **Admission / Backpressure Contract**
7. **Idempotency Contract**
8. **Event Delivery & Replay Contract**
9. **Disaster Recovery / Restore Contract**
10. **Provider Constraint Contract**
11. **Cache Contract**
12. **Hotspot Protection Contract**
13. **Schema Evolution Contract**
14. **Deployment Safety Contract**
15. **Security / Threat Model Contract**
16. **Observability / Causality Contract**
17. **Capacity Model Contract**
18. **AI Agent Sandbox Contract**
19. **Data Residency / Locality Contract**
20. **Resource Retirement Contract**
21. **Platform Upgrade / Rollback Contract**
22. **Failure Injection / Chaos Verification Contract**

These do not imply 22 new workers. Most are cross-cutting contracts.

## 7. Architectural Changes Recommended to the 3.2 Contract

### Change A — Strengthen the top-level abstraction

Current:

`Application Intent → Capability → Policy → Placement → Execution → Data/State → Reliability → Governance`

Recommended:

`Intent → Identity/Tenant → Capability → Policy → Admission → Placement → Execution → State → Events → Reliability → Observability → Governance`

Reason: admission, identity/tenant isolation and event semantics are not secondary concerns in a multi-tenant infrastructure substrate.

### Change B — Make authority explicit

Add:

`Every mutable infrastructure object has exactly one authoritative writer and an explicit version/epoch.`

### Change C — Make degraded mode explicit

Add:

`Every control-plane dependency used by data-plane execution has a defined stale-data window and fail-open/fail-closed behavior.`

### Change D — Make reliability measurable

Add SLO/error-budget/RPO/RTO contracts before declaring production readiness.

### Change E — Make reconciliation mathematically operational

Add convergence, idempotence, generation, oscillation detection and stuck-state handling.

### Change F — Make provider constraints executable

Capability selection and scheduling must validate real Cloudflare limits before execution.

### Change G — Make deployment a safety system

Every production mutation must have health predicates, blast-radius limits and rollback criteria.

## 8. What Should NOT Be Added

Red-team review also rejects several tempting expansions:

- another Worker solely for dashboards
- another Worker solely for AI
- generic multi-cloud abstraction in Open Core
- home-grown message broker replacing Cloudflare Queues
- home-grown consensus system without a proven requirement
- universal distributed transaction layer before workload evidence
- automatic global rebalance without bounded blast radius
- AI-controlled production changes without deterministic policy gates
- speculative vector/search/graph/database capabilities without concrete workload contracts

## 9. 3.2 Readiness Gate

3.2 SHALL NOT be marked ACTIVE until:

- all P0 findings are closed
- all P1 findings have contracts or explicit accepted risk
- the red-team scenarios have executable verification plans
- provider constraints are represented in machine-checkable policy
- SLO/RPO/RTO are measurable
- control-plane bootstrap/recovery is proven
- reconciliation convergence is tested
- tenant isolation is tested
- deployment rollback is tested
- failure injection is part of continuous verification

## 10. Review Result

**Current result: NO-GO / CONDITIONAL PASS ONLY FOR ARCHITECTURE CONTINUATION.**

The direction is approved for continued design work, but the contract is not yet safe to freeze for production implementation.

The most important correction is not adding more features. It is making the existing architecture **provable, bounded, recoverable and measurable**.

### Priority order

P0: authority, bootstrap, SLO, failure domains, tenant isolation, backpressure, idempotency, event semantics, migration rollback, disaster recovery.

P1: provider constraints, consistency precision, cache, hotspot protection, schema evolution, deployment safety, control-plane staleness, security, observability causality, capacity model.

P2: AI sandbox, locality, object lifecycle, retirement, platform upgrade, chaos verification and long-term moat hardening.

## 11. Relationship to 3.2 Contract

This review does not silently change the 3.2 architecture contract. The 3.2 contract remains `DRAFT FOR ARCHITECTURE REVIEW` until the findings are incorporated through explicit amendments/ADRs. The review is intentionally a separate artifact so that architecture decisions and audit findings remain independently traceable.
