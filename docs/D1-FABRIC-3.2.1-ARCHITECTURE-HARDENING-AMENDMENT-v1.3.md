# D1-Fabric 3.2.1 Architecture Hardening Amendment

Version: 1.3  
Status: DRAFT FOR ARCHITECTURE REVIEW  
Parent Contract: `docs/D1-FABRIC-3.2-INFRASTRUCTURE-ARCHITECTURE-CONTRACT-v1.0.md`  
Supersedes: `docs/D1-FABRIC-3.2-ARCHITECTURE-HARDENING-AMENDMENT-v1.2.md` for the active hardening baseline after approval  
Related Gate: `docs/D1-FABRIC-3.2-FINAL-ARCHITECTURE-GATE-v1.0.md`  
Red-Team Source: `docs/D1-FABRIC-3.2-ARCHITECTURE-GAP-AUDIT-RED-TEAM-REVIEW-v1.0.md`

## 0. Purpose and admission boundary

This amendment closes the P0/P1 architecture gaps identified by the independent red-team review. It does not authorize runtime implementation by itself.

The architecture remains `BLOCKED` until:
1. every P0 requirement below has machine-verifiable acceptance evidence;
2. every mandatory P1 requirement below has machine-verifiable acceptance evidence or an explicitly approved, time-bounded exception;
3. the Final Architecture Gate passes;
4. Code Development Admission passes.

No section of this amendment may be interpreted as permission to weaken an existing governance, evidence, ownership, dependency, or admission rule.

## 1. Authority and source-of-truth contract

### A-11 Authority tuple
Every mutable infrastructure object SHALL have exactly one authority tuple: `(object_type, object_id, authoritative_store, authoritative_writer, generation)`. The tuple SHALL be registered before the object can be mutated. Caches, projections, observations and AI outputs SHALL NOT be authorities.

### A-12 Generation and compare-and-set
Every authoritative mutation SHALL carry expected generation, policy version, change ID, actor identity and target scope. The mutation MUST fail closed if the expected generation is stale or incompatible. Generations are monotonic within an authority domain; older generations MUST NOT overwrite newer generations.

### A-13 Conflict resolution
Conflicts are resolved only by the registered authority and policy. Same-level competing writes are not automatically merged. Unresolved conflict is a STOP condition.

### A-14 Four-state control model
The system SHALL distinguish `Intent → Authoritative State → Observed State → Evidence State`. No single mutable record may represent all four states.

## 2. Bootstrap and control-plane independence

### A-15 Bootstrap root
W06 SHALL have a documented bootstrap dependency graph with a minimal recovery root that does not require normal data-plane serving. The root SHALL identify immutable configuration, control-state recovery source, identity/authentication root, minimum provider bindings, last-known-good state and recovery authority.

### A-16 W06 outage behavior
Normal data-plane operations MUST NOT synchronously require W06 when a safe last-known-good decision exists. When W06 is unavailable, safe reads may continue from verified last-known-good state; mutations requiring fresh authority MUST be rejected; topology-changing operations MUST be rejected; stale state MUST carry generation and age; recovery MUST be verified before W06 becomes authoritative again.

### A-17 Bootstrap cycle prohibition
The dependency DAG MUST reject `W06 → runtime dependency → W06` cycles for bootstrap-critical paths.

## 3. Reliability objectives

### A-18 SLO contract
Every production-authoritative capability SHALL declare availability SLO, success-rate definition, latency SLO, freshness/consistency objective where applicable, durability objective, RPO, RTO, error budget, alert thresholds, owner and consequence when the error budget is exhausted.

### A-19 Error-budget policy
Exhausted error budget SHALL constrain or block risky migrations, architecture changes, progressive rollout and autonomous production mutation unless an explicit emergency exception records owner, reason, scope and expiry.

## 4. Failure-domain contract

### A-20 Failure-domain hierarchy
The minimum model is `request → isolate/runtime → Worker → coordination object → database → shard → region/location → provider subsystem → account/control scope`. Every retry, fan-out, migration, reconciliation and autonomous action SHALL declare its maximum failure-domain scope.

### A-21 Correlated failure
Placement and capacity decisions MUST identify correlated failure domains. A placement that can fail together MUST NOT be treated as independent redundancy.

### A-22 Blast-radius budget
Every control-plane mutation SHALL declare maximum blast radius. Exceeding the registered budget is an admission failure.

## 5. Tenant isolation

### A-23 Tenant identity binding
Tenant/application identity MUST survive authorization, placement, execution, storage, cache, queue/event and management boundaries.

### A-24 Tenant budgets
Each tenant scope SHALL have enforceable concurrency, rate, storage/capacity and queue budgets where applicable, plus cost attribution and data-access namespace.

### A-25 Noisy-neighbor isolation
Shared capacity SHALL have per-tenant protection. One tenant cannot consume an unbounded portion of shared D1, Worker, queue, connection, subrequest or control-plane capacity. Violations MUST degrade or shed the violating workload before unrelated tenants.

## 6. Admission, backpressure and overload

### A-26 Pressure model
The system SHALL define overload signals, queue thresholds, concurrency ceilings, priority classes, reject/queue/shed decisions, pressure propagation, retry interaction and recovery hysteresis.

### A-27 Positive-feedback prohibition
When capacity is exhausted, retries MUST NOT increase effective pressure without an explicit bounded retry budget. Queue growth, retry amplification and fan-out amplification SHALL be observable and bounded.

### A-28 Load-shedding classes
At minimum distinguish optional/background work, best-effort reads, normal writes, control-plane mutations and recovery/safety operations. Safety and recovery traffic SHALL have explicit reserved capacity.

## 7. Universal idempotency

### A-29 Idempotency contract
Commands, queue consumers, outbox publication, migrations and management mutations SHALL define key scope, authority, deduplication window, result replay behavior, expiration, duplicate handling and failure semantics.

### A-30 Durable result rule
A retried mutation MUST resolve to one unambiguous durable outcome. A timeout after provider-side acceptance MUST be recoverable through idempotency/result lookup rather than blind re-execution.

## 8. Event and queue semantics

### A-31 Delivery
The default event model is at-least-once unless a stronger provider-specific guarantee is explicitly verified. Consumers MUST be idempotent.

### A-32 Event identity and ordering
Every event SHALL have immutable event ID, aggregate/resource ID, schema version, causality/change ID and producer generation. Ordering guarantees MUST specify scope; global ordering MUST NOT be assumed unless explicitly proven.

### A-33 Retry and poison messages
Every consumer SHALL define retry owner, maximum retry budget, backoff, DLQ/quarantine policy, poison-message detection, replay authorization, retention and replay evidence. Replay is a new governed operation and cannot bypass the original authorization boundary.

## 9. Migration and schema evolution

### A-34 Rollback class
Every migration step SHALL declare exactly one: `REVERSIBLE`, `COMPENSATABLE`, `FORWARD_ONLY`, `DESTRUCTIVE`.

### A-35 Destructive checkpoint
A destructive transition requires verified backup/restore capability, restore evidence, explicit irreversible checkpoint, dependency drain, owner approval and recovery plan. A nominal `ROLLBACK` state MUST NOT be used when physical reversal is impossible.

### A-36 Expand/contract schema evolution
Schema changes SHALL define compatibility window, reader/writer version matrix, expand phase, backfill, validation, contract phase, retirement checkpoint and rollback or forward-recovery boundary.

## 10. Disaster recovery

### A-37 Recovery contract
Every production resource class SHALL declare RPO, RTO, backup/recovery source, dependency order, restore procedure, restore verification, corruption scenario, recovery owner and game-day cadence.

### A-38 Restore proof
Backup existence is not restore capability. A recovery path is production-ready only after successful restore verification against defined integrity checks. Cross-resource recovery order MUST be deterministic.

## 11. Provider constraint contract

### A-39 Provider constraints
Provider limits SHALL be machine-readable and versioned. Each record SHALL include provider, service, resource, hard limit, unit, applicable plan, source/reference, observed/effective date, review date, degradation policy and admission consequence. Provider limits MUST NOT be represented only in prose.

### A-40 Constraint freshness
A stale provider constraint MUST be marked `UNKNOWN` and MUST NOT silently authorize a capacity-sensitive mutation.

## 12. Consistency and replica contract

### A-41 Consistency semantics
Each consistency class SHALL define scope, guarantee, allowed anomalies, maximum duration, failure behavior and verification method. The labels `eventual`, `read-your-writes`, `sequential`, `strong` and `serializable` are not sufficient by themselves.

### A-42 Replica routing
Replica reads SHALL declare acceptable staleness, session/bookmark requirement, fallback to primary and behavior when the guarantee cannot be satisfied. The router MUST NOT claim a stronger guarantee than the provider and session state can establish.

## 13. Cache contract

### A-43 Cache authority
Caches are never authoritative for infrastructure state or durable application truth. Every cache entry SHALL define source authority, generation/version, TTL/freshness, invalidation trigger, tenant scope, negative-cache policy, stampede protection and stale-read policy. A stale cache MUST fail closed for operations requiring fresh authority.

## 14. Hot-resource protection

### A-44 Hotness contract
Hot-key and hot-shard controls SHALL define detection window, threshold, hysteresis, mitigation, request shedding, isolation scope, migration correctness, verification and rollback/forward recovery. Hotness detection alone does not authorize relocation.

## 15. Deployment safety

### A-45 Progressive delivery
Production deployment SHALL support staged exposure, canary scope, health predicates, automatic pause, rollback criteria, blast-radius budget, stabilization window and post-deploy evidence. A failed health predicate blocks progression.

## 16. Security architecture

### A-46 Threat model
The security contract SHALL cover tenant escape, privilege escalation, replay, confused deputy, management-plane abuse, AI-agent abuse, secret exposure, cross-tenant cache/event leakage and control-plane impersonation.

### A-47 Least privilege
Every Worker and automation identity SHALL have explicit principal, resource scope, action allowlist, credential scope, expiry/rotation and audit requirements. AI agents use the same authorization boundary and cannot create a new authority domain.

## 17. Management center truth model

### A-48 Projection semantics
Every management-plane value SHALL expose source, authority, observed timestamp, freshness, generation, confidence, aggregation scope and actionability. A dashboard is a projection, not an authority.

### A-49 Management action evidence
Every management action SHALL expose change ID, policy version, target generation, blast radius, verification status and recovery class.

## 18. Observability and causality

### A-50 Correlation identity
Critical flows SHALL propagate request ID, trace ID, tenant/application ID, operation ID, change ID, migration ID, event ID, policy version and control generation. A mutation without causal identity is not production-authoritative.

## 19. Capacity and cost model

### A-51 Multi-dimensional capacity
Capacity SHALL model CPU/runtime, memory, storage, database size, reads, writes, network, subrequests, connections, queue depth, concurrency, hotness, control-plane capacity and cost budget.

### A-52 Admission based on limiting dimension
The limiting safety-critical dimension, not average utilization, determines admission. Capacity models SHALL provide workload envelopes, saturation thresholds, scaling units, cost assumptions and load-test acceptance criteria.

## 20. Reconciliation convergence

### A-53 Deterministic reconciliation
Every reconciler SHALL define deterministic input snapshot, generation/epoch, idempotent apply, convergence predicate, retry ceiling, oscillation detection, stuck-state classification and operator escape hatch. A reconciler that can oscillate indefinitely is not production-ready.

## 21. AI operational safety

### A-54 AI sandbox
Every autonomous agent SHALL declare tools, resource namespaces, maximum blast radius, allowed mutations, rate/time budgets, approval class, rollback/recovery, kill switch, credential scope and audit retention.

### A-55 Evidence-before-action
AI may propose actions, but production execution requires deterministic machine evidence and the same admission chain as human actions. Low-confidence diagnosis cannot authorize production mutation.

## 22. Data locality and object lifecycle

### A-56 Data locality
Where required, tenant data and control metadata SHALL declare residency/locality constraints. Replication, caching, events and AI processing must preserve those constraints.

### A-57 Object lifecycle
R2/media objects SHALL have governed lifecycle `referenced → active → draining → retention → deletable → deleted`. Deletion requires reference checks, retention policy, orphan handling and audit evidence.

## 23. Retirement and garbage collection

### A-58 Retirement protocol
Resources, schemas, queues, objects, caches, bindings and control-state records SHALL not be physically retired until dependency discovery, traffic drains, data safety checks, reference checks, rollback/forward-recovery criteria and tombstone/grace period all pass.

## 24. Machine-enforcement mapping

The following requirements are not documentation-only. The governance system SHALL map them to machine rules:

| Contract area | Machine authority |
|---|---|
| Authority | Authority Registry + validator |
| Generation | Change Manifest + validator |
| Failure domains | Failure-Domain Registry |
| Tenant budgets | Capability/Policy Registry |
| Backpressure | Capacity/Policy Registry |
| Idempotency | Capability Contract + test probes |
| Events | Event Contract + schema compatibility rules |
| Migration | Recovery Classification Registry |
| DR | Recovery Registry + evidence |
| Provider limits | Provider Constraint Registry |
| Consistency | Compatibility/Consistency Registry |
| Cache | Capability/Policy Registry |
| Deployment | Release Classification + Gate |
| Security | Authority/Ownership/Policy Registry |
| Observability | Evidence/Correlation rules |
| Capacity | Capacity-Cost-Provider Registry |
| Reconciliation | Dependency DAG + state-machine rules |
| AI | Agent capability sandbox + admission |
| Legacy isolation | Historical Isolation Rules |

A contract without a corresponding machine authority is classified `DOCUMENTED_ONLY` and cannot satisfy Architecture Gate requirements.

## 25. Required acceptance evidence

Before Architecture Admission, the following evidence classes MUST exist for the current change generation:

1. authority/source-of-truth probe;
2. bootstrap/dependency-cycle probe;
3. SLO/error-budget policy validation;
4. failure-domain isolation probe;
5. tenant quota/noisy-neighbor probe;
6. overload/backpressure probe;
7. idempotency duplicate-delivery probe;
8. event retry/DLQ/replay probe;
9. migration rollback-class validation;
10. restore verification;
11. provider-constraint registry validation;
12. replica/consistency verification;
13. cache freshness/authority probe;
14. hot-resource protection probe;
15. progressive deployment safety probe;
16. security boundary probe;
17. management freshness/authority probe;
18. correlation/causality probe;
19. capacity-envelope/load test;
20. reconciliation convergence probe;
21. AI sandbox/admission probe;
22. data locality/lifecycle probe;
23. retirement safety probe.

Missing evidence is `NOT_PASS`, never `PASS`.

## 26. Final invariant

The architecture is considered hardened only when:

`Contract → Machine Rule → CI Gate → Evidence → Final Architecture Gate → Code Development Admission`

is complete for every P0 and mandatory P1 requirement.

No implementation convenience, AI suggestion, cached state, dashboard state, prior evidence or historical contract may bypass this chain.
