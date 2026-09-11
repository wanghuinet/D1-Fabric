# D1-Fabric Open Core Architecture Contract v1.1

Status: FROZEN FOR ARCHITECTURE BASELINE  
Product: D1-Fabric Open Core 1.0  
Amends: v1.0 architecture baseline

## 1. Mission

Open Core is the complete open-source foundational middleware product of D1-Fabric. It provides a deterministic, auditable and production-oriented distributed data access layer over Cloudflare D1 and related Cloudflare primitives.

Open Core MUST remain independently runnable and MUST NOT require Advanced for normal operation.

## 2. Architecture Philosophy

D1-Fabric is an orchestration, abstraction, governance and reliability layer above Cloudflare infrastructure. It MUST NOT become a second Cloudflare implementation.

The architecture MUST remain lightweight at the capability level while the repository MUST remain strict at the engineering-governance level.

Business complexity belongs above the middleware. Infrastructure complexity is absorbed and converged below the application boundary.

## 3. Cloudflare-Native-First Rule

Cloudflare capabilities MUST be evaluated before any new infrastructure implementation is proposed.

When Cloudflare provides a capability that satisfies the requirement, the default implementation MUST use the native capability through an adapter or policy layer.

Examples include, where applicable: Workers for compute and HTTP execution; D1 for relational persistence and SQL; KV for suitable low-latency key/value state; R2 for object storage; Durable Objects for strongly coordinated state; Queues for asynchronous messaging; Workflows for durable multi-step workflows; Cron Triggers for scheduling; Analytics Engine for telemetry/analytics; Vectorize for vector search; Workers AI and AI Gateway for supported AI workloads; Hyperdrive for supported external-database access.

D1-Fabric MAY add orchestration, policy, governance, cost control, sharding, routing, reliability, verification or domain-neutral abstractions around these primitives, but MUST NOT reimplement an equivalent underlying service without an explicit architecture decision and documented reason.

Every proposed infrastructure capability MUST record one of:

1. NATIVE — directly provided by Cloudflare and used as-is through an adapter;
2. ORCHESTRATION — D1-Fabric coordinates multiple Cloudflare primitives;
3. GAP — Cloudflare does not provide the required capability, so D1-Fabric implements the minimum necessary abstraction;
4. REPLACEMENT — an intentional replacement of a native capability, requiring architecture approval and evidence.

REPLACEMENT is exceptional and MUST NOT be the default.

## 4. Product Boundary

Open Core owns foundational data-plane, shard-foundation, control-foundation and reliability capabilities.

Advanced owns higher-order optimization, migration intelligence, predictive control and differentiated policy capabilities.

Worker is a deployment/runtime boundary. Module is the primary architectural ownership boundary. Capability is the product boundary.

A Worker MUST NOT become a dumping ground for unrelated functionality merely because the runtime can execute it.

## 5. Core Layers

### 5.1 Data Plane

Gateway → Admission/Validation → Routing → Execution → Write → Result/Termination.

### 5.2 Shard Foundation

Shard Key → Deterministic Hash → Logical Shard ID → Versioned Registry Lookup → Physical Target.

A routing decision MUST be deterministic for the same logical database, business key and routing-map version.

### 5.3 Control Foundation

Topology, placement, shard metadata, version publication, health/state transitions, expansion planning, migration foundations and rebalance foundations.

### 5.4 Reliability Foundation

Timeout, deadline, retry, bounded backoff, failure classification, circuit breaker, cancellation, recovery and idempotency.

## 6. Worker and Module Boundaries

Workers MUST be split by stable responsibility and deployment/scaling/security boundaries, not by arbitrary file size.

The current independently deployable runtime topology is exactly:

- W01 Gateway: ingress, admission and request boundary;
- W02 Execution: execution orchestration and read path;
- W03 Write: write path, transactions and idempotent mutation execution;
- W04 Control Plane: control APIs, policy evaluation and control-state orchestration.

Reliability and placement/migration remain first-class capability domains. At the current foundation baseline they are hosted through explicit module/contracts within W01-W04 rather than independent Workers. W05 and W06 are reserved capability labels and MUST NOT become independently deployable Workers without an approved topology ADR establishing independent ownership, scaling, security, lifecycle or failure-isolation evidence.

A module MUST have one primary responsibility and an explicit owner. Closely related modules MAY share a Worker when they have the same lifecycle, security boundary and scaling profile.

Unrelated business capabilities MUST NOT be placed inside core Workers. User profiles, feeds, games, novels, commerce, ads, creator/MCN features, UI orchestration and other application-specific business logic are outside Open Core.

## 7. Dependency Direction

Dependencies flow from higher-level capabilities toward lower-level contracts and adapters. Core MUST NOT depend on Advanced. Circular dependencies are forbidden.

Recommended direction:

Gateway → Execution → Routing/Registry → Core Contracts → Cloudflare Adapters.

Control and Reliability capabilities may serve Data Plane through explicit contracts but MUST NOT bypass ownership boundaries.

Cloudflare adapters are the lowest implementation layer and MUST NOT import business-domain modules.

## 8. Contract Rules

Public interfaces are versioned. Breaking changes require a new contract version or an approved migration path.

API, data, event, security, performance, dependency and runtime-boundary contracts are explicit.

A module MUST declare owner, responsibility, provides, dependencies, data ownership, events, allowed runtime bindings and forbidden dependencies.

## 9. Data Ownership

Every persistent data object has one authoritative owner. Cross-module direct database access is forbidden.

Data access MUST pass through the approved routing/data-access policy.

A shard MUST remain inside its logical-database boundary.

Cloudflare-native stores are infrastructure substrates; ownership still belongs to the D1-Fabric logical module that defines the data contract.

## 10. Routing Safety

Routing MUST include logical database isolation and an explicit routing-map version or pinned version context.

A query with multiple legs MUST use one coherent published routing version. Silent mixing of versions is forbidden.

Caches are latency optimizations, not authority. Cross-isolate state required for correctness MUST use an appropriate shared authoritative substrate, including Durable Objects or another approved Cloudflare primitive when applicable.

## 11. Lifecycle Safety

Shard registration and readiness are separate concepts.

A newly provisioned shard MUST NOT become routable until schema, placement, health and required metadata checks pass.

State transitions are explicit and validated. Irreversible states cannot transition backward without a new approved protocol.

## 12. Runtime Resource Discipline

Every module MUST declare its expected CPU, memory, subrequest, storage, network and concurrency characteristics where measurable.

New code MUST prefer Cloudflare-native batching, caching, asynchronous execution and bounded fan-out over bespoke infrastructure.

Hot-path code MUST avoid unnecessary cross-Worker hops, duplicated serialization, duplicate reads and unbounded fan-out.

A feature that causes measurable resource growth MUST include a cost/performance impact assessment.

## 13. Cloudflare Boundary

Cloudflare bindings, subrequest limits, execution limits, D1 capabilities and deployment topology are architectural constraints, not implementation details.

The adapter layer MUST expose only capabilities that can be proven on the target runtime.

Dynamic physical-shard expansion MUST NOT assume that a Worker can materialize arbitrary static D1 bindings at request time. The physical-target strategy MUST be explicitly contracted before live expansion or migration.

## 14. Reliability Invariants

Retries MUST be bounded and error-class aware. Retry MUST NOT amplify non-idempotent writes.

Deadlines propagate downward. Cancellation and timeout terminate work within the declared boundary.

Recovery MUST preserve data ownership and version fences.

## 15. Extension Boundary

Open Core exposes stable extension points for Advanced.

Advanced implementations may observe, recommend or request controlled operations through contracts, but cannot silently mutate Core state.

Advanced MUST NOT be required for Core availability.

## 16. Verification Gate

A Core capability is PASS only when applicable build, unit, contract, static-analysis, dependency, security, integration, regression and runtime verification gates pass.

Conditional capabilities additionally require load, stress, chaos, migration, compatibility or consistency evidence as applicable.

Repository structure and dependency checks MUST also verify that forbidden business functionality has not entered Core Workers.

## 17. Major-Stage Development Gate

Implementation proceeds by major stage, not by uncontrolled feature accumulation.

For each major stage:

1. architecture/contract scope is frozen;
2. implementation is completed only within the approved scope;
3. unit/contract/integration/runtime verification is executed;
4. the complete applicable GitHub Actions CI suite MUST be green;
5. architecture and dependency-boundary audit MUST PASS;
6. the stage is marked PASS;
7. GPT MUST STOP progression at the stage boundary and wait for explicit user approval before entering the next major stage.

A failed CI result, unresolved contract violation or boundary violation blocks stage completion.

## 18. Release Gate

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
10. architecture audit PASS;
11. no prohibited duplicate Cloudflare infrastructure implementation;
12. no unrelated business functionality in Core Workers.

## 19. Explicit Non-Goals

Open Core 1.0 does not include AI-driven autonomous optimization, predictive control, hidden proprietary policy engines, business-specific content/social/game/e-commerce logic, or Advanced-only migration intelligence.

Such capabilities belong above Open Core or in Advanced and must enter through explicit extension boundaries.

## 20. Authority

This contract is the architecture baseline for Open Core 1.0.

A lower-level implementation document, prompt or agent suggestion cannot override it.

Any architectural change requires an explicit versioned amendment and impact review.

## 21. Current Foundation Topology Amendment

For the 3.2 foundation-governance baseline, ADR-0001 is the controlling topology decision for the current runtime. It establishes W01-W04 as the only independently deployable Workers. References to W05/W06 elsewhere in historical or transitional documents MUST be interpreted as capability domains/reserved future deployment boundaries until a later approved topology ADR changes this decision.
