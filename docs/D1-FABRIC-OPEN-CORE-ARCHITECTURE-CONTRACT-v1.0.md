# D1-Fabric Open Core Architecture Contract v1.0

Status: FROZEN FOR ARCHITECTURE BASELINE  
Product: D1-Fabric Open Core 1.0

## 1. Mission

Open Core is the complete open-source foundational middleware product of D1-Fabric. It provides a deterministic, auditable and production-oriented distributed data access layer over Cloudflare D1 and related Cloudflare primitives.

Open Core MUST remain independently runnable and MUST NOT require Advanced for normal operation.

## 2. Product Boundary

Open Core owns foundational data-plane and control-plane capabilities. Advanced owns higher-order optimization, migration intelligence and differentiated policy capabilities.

Worker is a deployment/runtime boundary. Capability is the product architecture boundary.

## 3. Core Layers

### 3.1 Data Plane

Gateway → Admission/Validation → Routing → Execution → Write → Result/Termination.

### 3.2 Shard Foundation

Shard Key → Deterministic Hash → Shard ID → Versioned Registry Lookup → Physical Target.

A routing decision MUST be deterministic for the same logical database, business key and routing-map version.

### 3.3 Control Foundation

Topology, placement, shard metadata, version publication, health/state transitions, expansion planning, migration foundations and rebalance foundations.

### 3.4 Reliability Foundation

Timeout, deadline, retry, bounded backoff, failure classification, circuit breaker, cancellation, recovery and idempotency.

## 4. Dependency Direction

Dependencies flow from higher-level capabilities toward lower-level contracts and adapters. Core MUST NOT depend on Advanced. Circular dependencies are forbidden.

Recommended direction:

Gateway → Execution → Routing/Registry → Core Contracts → Cloudflare Adapters.

Control and Reliability capabilities may serve Data Plane through explicit contracts but MUST NOT bypass ownership boundaries.

## 5. Contract Rules

Public interfaces are versioned. Breaking changes require a new contract version or an approved migration path. API, data, event, security, performance and dependency contracts are explicit.

A module MUST declare owner, responsibility, provides, dependencies, data ownership, events and forbidden dependencies.

## 6. Data Ownership

Every persistent data object has one authoritative owner. Cross-module direct database access is forbidden. Data access MUST pass through the approved routing/data-access policy.

A shard MUST remain inside its logical-database boundary.

## 7. Routing Safety

Routing MUST include logical database isolation and an explicit routing-map version or pinned version context. A query with multiple legs MUST use one coherent published routing version. Silent mixing of versions is forbidden.

Caches are latency optimizations, not authority. Cross-isolate state required for correctness MUST use an appropriate shared authoritative substrate.

## 8. Lifecycle Safety

Shard registration and readiness are separate concepts. A newly provisioned shard MUST NOT become routable until schema, placement, health and required metadata checks pass.

State transitions are explicit and validated. Irreversible states cannot transition backward without a new approved protocol.

## 9. Cloudflare Boundary

Cloudflare bindings, subrequest limits, execution limits, D1 capabilities and deployment topology are architectural constraints, not implementation details. The adapter layer MUST expose only capabilities that can be proven on the target runtime.

Dynamic physical-shard expansion MUST NOT assume that a Worker can materialize arbitrary static D1 bindings at request time. The physical-target strategy must be explicitly contracted before live expansion or migration.

## 10. Reliability Invariants

Retries MUST be bounded and error-class aware. Retry MUST NOT amplify non-idempotent writes. Deadlines propagate downward. Cancellation and timeout terminate work within the declared boundary. Recovery MUST preserve data ownership and version fences.

## 11. Extension Boundary

Open Core exposes stable extension points for Advanced. Advanced implementations may observe, recommend or request controlled operations through contracts, but cannot silently mutate Core state.

Advanced MUST NOT be required for Core availability.

## 12. Verification Gate

A Core capability is PASS only when applicable build, unit, contract, static-analysis, dependency, security, integration, regression and runtime verification gates pass. Conditional capabilities additionally require load, stress, chaos, migration, compatibility or consistency evidence as applicable.

## 13. Release Gate

Open Core 1.0 requires:

1. architecture contract frozen;
2. capability registry reconciled;
3. ownership and dependency DAG verified;
4. all Core modules mapped to contracts;
5. end-to-end data path verified;
6. reliability path verified;
7. Cloudflare runtime constraints verified;
8. full regression green;
9. rollback and recovery procedures evidenced;
10. architecture audit PASS.

## 14. Explicit Non-Goals

Open Core 1.0 does not include AI-driven autonomous optimization, predictive control, hidden proprietary policy engines, or Advanced-only migration intelligence. Such capabilities belong to Advanced and must enter through the extension boundary.

## 15. Authority

This contract is the architecture baseline for Open Core 1.0. A lower-level implementation document, prompt or agent suggestion cannot override it. Any architectural change requires an explicit versioned amendment and impact review.
