# D1-Fabric Complete Foundation Capability Map v1.0

**Status:** PROPOSED / NON-AUTHORITATIVE UNTIL FOUNDATION FREEZE
**Scope:** Complete long-term capability map for D1-Fabric 1.0
**Authority:** Must be promoted through the existing Foundation Blueprint / ADR / Capability Registry / Change Manifest governance before implementation.
**Principle:** Complete the capability map once; evolve implementations compatibly without architectural re-platforming.

## 1. Purpose

This document defines the intended complete capability surface of D1-Fabric so that future development does not repeatedly rediscover missing infrastructure capabilities or trigger unnecessary major-version architecture redesign.

It consolidates:

1. capabilities already implemented or partially implemented;
2. previously planned D1-Fabric capabilities;
3. previously discussed advanced capabilities;
4. production-grade infrastructure capabilities expected from comparable distributed data/runtime platforms;
5. capabilities required for D1-Fabric's long-term positioning as a generic backend foundation for conventional applications and AI-generated applications.

This document is a capability map, not permission to implement everything immediately. Implementation remains stage-gated by the repository's governance system.

## 2. Product Boundary

D1-Fabric is infrastructure. It provides generic data execution, routing, reliability, control, placement, migration, governance, observability, security, cost and developer-platform primitives.

Business domains such as content, social, commerce, games, media, IM, creator systems, MCN, recommendation or advertising are consumers of the foundation and MUST NOT become business semantics inside the Core.

## 3. Target Architecture

```text
Application / SDK / AI Agent
            |
            v
     W01 Fabric Gateway
            |
            v
    W02 Execution Fabric
       /           \
      v             v
   Read Path     W03 Write Fabric
      |             |
      |        Idempotency / Fence
      |             |
      +------ W04 Control Plane
                    |
          Placement / Migration
                    |
          D1 / R2 / KV / DO
          Queues / Workflows
          Cache / AI / future adapters

Cross-cutting capability domains:
Reliability | Consistency | Security | Observability
Cost | Governance | DR | Schema Evolution
```

The current independently deployable Worker topology remains W01-W04 unless a separately approved topology ADR changes it. Capability domains do not automatically become Workers.

## 4. Capability Classification

Each capability has one of four planning classes:

- **CORE:** fundamental to the stable D1-Fabric foundation.
- **PLATFORM:** infrastructure capability exposed to applications or SDKs.
- **ADAPTER:** integration with a Cloudflare primitive or future substrate.
- **EXTENSION:** optional higher-level functionality that must not contaminate Core semantics.

Implementation status uses:

- **DONE:** already implemented and verified at the current repository baseline.
- **PARTIAL:** some implementation exists; production closure remains.
- **PLANNED:** previously planned or explicitly required for the foundation.
- **TARGET:** complete capability expected in the final 1.0 capability map.
- **DEFERRED:** intentionally later-stage, not a reason to change current topology.

## 5. Complete Capability Map

### CF-01 Gateway & API Edge — CORE / PLATFORM

- request admission;
- API routing;
- API versioning;
- request validation;
- authentication integration;
- authorization hooks;
- tenant identification;
- rate limiting;
- quota enforcement;
- request budgets;
- payload limits;
- idempotency-key propagation;
- correlation/request IDs;
- ingress observability;
- controlled fan-out admission.

Status: PARTIAL → TARGET.

### CF-02 Execution Fabric — CORE

- deterministic execution pipeline;
- read/write execution separation;
- bounded concurrency;
- fan-out/fan-in;
- execution budgets;
- deadline propagation;
- cancellation;
- batch execution;
- result aggregation;
- partial-failure policy;
- execution tracing;
- admission control.

Status: PARTIAL → TARGET.

### CF-03 Routing & Shard Selection — CORE

- logical database routing;
- shard-key extraction;
- deterministic HASH routing;
- shard ID resolution;
- registry lookup;
- map-version routing;
- database isolation;
- routing cache;
- routing policy versioning;
- future range/directory routing extension;
- hot-key mitigation policy.

Status: DONE for current HASH/version chain; TARGET for complete routing family.

### CF-04 Sharding & Capacity — CORE

- virtual shard abstraction;
- physical shard mapping;
- shard registry;
- shard map versions;
- expansion;
- controlled doubling policy where applicable;
- capacity thresholds;
- read-only red-line policy;
- shard isolation;
- hot-shard detection;
- tenant-aware placement;
- future split/merge policy;
- no-loss scale-out.

Status: PARTIAL → TARGET.

### CF-05 Read Fabric — CORE

- point reads;
- routed queries;
- bounded multi-shard reads;
- pagination/cursor contracts;
- cache-aware reads;
- consistency-aware reads;
- read-after-write policy;
- stale-read policy;
- aggregation;
- query budget enforcement;
- read amplification control.

Status: PARTIAL → TARGET.

### CF-06 Write Fabric — CORE

- routed writes;
- atomic write boundary where supported;
- idempotency;
- duplicate suppression;
- write admission;
- control-epoch validation;
- write version/fencing;
- batch writes;
- retry-safe write policy;
- publish/write failure semantics;
- write observability;
- write budget enforcement.

Status: PARTIAL → TARGET.

### CF-07 Idempotency & Exactly-Once-Effect Controls — CORE

- request idempotency keys;
- operation identity;
- deduplication records;
- replay protection;
- retry-safe mutation contracts;
- conflict detection;
- idempotency TTL policy;
- atomic state transition requirements;
- evidence for exactly-once-effect claims.

Status: PARTIAL → TARGET.

### CF-08 Cache & Acceleration — PLATFORM / ADAPTER

- KV integration;
- Workers Cache integration;
- application cache;
- routing metadata cache;
- cache invalidation;
- stale-while-revalidate policy;
- negative cache policy;
- cache stampede protection;
- cache security binding;
- cache-as-non-authority rule;
- cache cost policy.

Status: PLANNED → TARGET.

### CF-09 Async / Queue / Event Fabric — PLATFORM / ADAPTER

- queue submission;
- asynchronous write workflows;
- event publication;
- retry policy;
- dead-letter handling;
- delayed tasks;
- scheduled tasks;
- workflow orchestration;
- task deduplication;
- task visibility;
- poison-message handling;
- backpressure;
- bounded fan-out.

Status: PLANNED → TARGET.

### CF-10 Reliability Plane — CORE CAPABILITY DOMAIN

- timeout;
- deadline propagation;
- retry;
- exponential backoff;
- jitter;
- retry budgets;
- circuit breaking;
- bulkhead isolation;
- failure classification;
- graceful degradation;
- fallback;
- failure recovery;
- consistency protection;
- LKG handling;
- fencing;
- overload protection;
- recovery verification.

Status: PARTIAL → TARGET.

Reliability remains a capability domain across W01-W04 under the current topology.

### CF-11 Control Plane — CORE

- control metadata;
- control epoch;
- LKG state;
- fencing;
- configuration versioning;
- capability state;
- topology metadata;
- placement metadata;
- migration state;
- rollout state;
- health state;
- administrative commands;
- control-plane audit trail.

Status: PARTIAL → TARGET.

### CF-12 Placement & Topology — CORE CAPABILITY DOMAIN

- shard placement;
- capacity-aware placement;
- tenant-aware placement;
- topology metadata;
- placement versioning;
- placement constraints;
- hot-shard movement;
- capacity balancing;
- safe placement change;
- placement rollback;
- placement verification.

Status: PARTIAL → TARGET.

Placement remains a W04-owned capability domain at the current topology baseline.

### CF-13 Migration & Rebalance — CORE CAPABILITY DOMAIN

- migration planning;
- source/target fencing;
- copy phase;
- catch-up phase;
- cutover;
- verification;
- rollback;
- resumability;
- checkpointing;
- throttling;
- online migration;
- rebalance;
- migration proof/evidence;
- no-loss guarantee under declared assumptions.

Status: PLANNED / PARTIAL → TARGET.

### CF-14 Consistency & Session Semantics — CORE

- strong-consistency policy where substrate supports it;
- session consistency;
- read-after-write;
- bookmark/session propagation;
- eventual consistency;
- consistency levels;
- fencing;
- stale-read bounds;
- monotonic-read policy;
- write visibility policy;
- cross-shard consistency limitations;
- explicit consistency contracts.

Status: PARTIAL → TARGET.

### CF-15 Distributed Coordination — CORE / ADAPTER

- control locks;
- lease semantics;
- epoch fencing;
- leader/LKG concepts where required;
- bounded coordination;
- conflict detection;
- safe ownership transition;
- coordination timeout;
- split-brain prevention under declared assumptions.

Status: PLANNED → TARGET.

### CF-16 Multi-Tenancy & Isolation — PLATFORM

- tenant identity;
- tenant isolation;
- logical database isolation;
- resource quotas;
- per-tenant budgets;
- noisy-neighbor protection;
- tenant placement policy;
- tenant data ownership;
- tenant-level observability;
- tenant-level deletion/export hooks.

Status: PLANNED → TARGET.

### CF-17 Security — CORE / PLATFORM

- authentication integration;
- authorization;
- RBAC;
- least privilege;
- binding ownership;
- secret isolation;
- request signing hooks;
- replay protection;
- tenant isolation;
- audit trail;
- data lifecycle policy;
- security headers/policy hooks;
- abuse/rate controls;
- threat model;
- security verification.

Status: PLANNED → TARGET.

### CF-18 Observability — CORE / PLATFORM

- structured logs;
- metrics;
- traces;
- correlation IDs;
- request lifecycle telemetry;
- shard metrics;
- routing metrics;
- write/read metrics;
- migration metrics;
- retry metrics;
- error taxonomy;
- SLI/SLO definitions;
- error budget;
- alerts;
- audit events;
- evidence export.

Status: PLANNED → TARGET.

### CF-19 Cost Governance — CORE / PLATFORM

- D1 read/write budget awareness;
- storage budget;
- Worker execution budget;
- queue/task budget;
- fan-out cost estimation;
- tenant budget;
- request cost envelope;
- budget reservation;
- budget consumption;
- hard stop;
- cost anomaly detection;
- capacity/cost forecast;
- cost-aware placement;
- cost-aware caching;
- cost evidence.

Status: PARTIAL → TARGET.

H02 budget reservation/consumption/hard-stop remains a release-blocking 3.0 control.

### CF-20 Capacity & Admission Control — CORE

- numeric capacity envelope;
- concurrency limits;
- fan-out limits;
- payload limits;
- retry limits;
- queue depth limits;
- per-tenant quotas;
- backpressure;
- overload rejection;
- read-only protection thresholds;
- emergency hard stops;
- capacity forecasting.

Status: PARTIAL → TARGET.

### CF-21 Schema & Data Lifecycle — CORE / PLATFORM

- schema versioning;
- compatibility rules;
- migration plans;
- online schema evolution;
- backward compatibility;
- forward compatibility where feasible;
- data retention;
- archival;
- deletion workflows;
- delayed object deletion;
- legal/administrative deletion hooks;
- lifecycle evidence.

Status: PLANNED → TARGET.

### CF-22 Backup / Restore / Disaster Recovery — CORE CAPABILITY

- backup policy;
- restore workflow;
- point-in-time recovery strategy where substrate supports it;
- recovery verification;
- RPO/RTO contracts;
- disaster classification;
- regional/provider failure assumptions;
- restore drills;
- migration recovery;
- evidence of recoverability.

Status: PLANNED → TARGET.

### CF-23 Contract & Compatibility System — GOVERNANCE CORE

- versioned contracts;
- semantic compatibility;
- breaking-change detection;
- migration requirement;
- ADR requirement;
- verification requirement;
- deprecation policy;
- compatibility matrix;
- contract registry;
- runtime contract enforcement;
- generated contract artifacts where safe.

Status: PARTIAL → TARGET.

### CF-24 Architecture Governance — GOVERNANCE CORE

- Capability Registry;
- ADR Registry;
- Worker Ownership;
- Data Ownership;
- Dependency DAG;
- Binding Ownership;
- Legacy Isolation;
- Change Manifest;
- Diff Scope Gate;
- Exception Registry;
- Release Policy;
- machine validator;
- evidence generation;
- mandatory stop gates.

Status: DONE at foundation governance level; continue deepening enforcement.

### CF-25 Deployment & Environment Governance — PLATFORM

- environment separation;
- dev/test/staging/prod policy;
- reproducible configuration;
- deployment contract;
- binding drift detection;
- infrastructure drift detection;
- safe rollout;
- rollback;
- canary/controlled rollout where appropriate;
- deployment evidence;
- exact-SHA provenance.

Status: PLANNED → TARGET.

### CF-26 Supply Chain & Build Integrity — GOVERNANCE CORE

- dependency policy;
- lockfile enforcement;
- dependency provenance;
- SBOM;
- artifact provenance;
- reproducible builds;
- vulnerability policy;
- license policy;
- secret scanning;
- signed/reviewed release evidence.

Status: PLANNED → TARGET.

### CF-27 SDK / Developer API — PLATFORM

- stable API surface;
- TypeScript SDK;
- REST/HTTP interface;
- application configuration;
- typed errors;
- pagination/cursor contract;
- idempotency support;
- consistency selection;
- transaction/write helpers;
- observability context propagation;
- migration/admin APIs.

Status: PLANNED → TARGET.

### CF-28 AI Application Runtime — PLATFORM

D1-Fabric should provide generic primitives suitable for AI-generated applications without embedding model-specific business logic:

- schema/resource declaration;
- generated API contracts;
- data access primitives;
- auth/tenant hooks;
- task/queue primitives;
- idempotent actions;
- workflow primitives;
- file/object references;
- vector/semantic-storage adapter hooks;
- model invocation adapter hooks;
- usage/cost accounting;
- execution budgets;
- auditability;
- deterministic infrastructure contracts for AI-generated code.

Status: TARGET.

### CF-29 Data / Storage Adapter Layer — ADAPTER

Canonical integration boundaries for Cloudflare-native primitives:

- D1;
- R2;
- KV;
- Durable Objects;
- Queues;
- Workflows;
- Workers Cache;
- Vectorize;
- Workers AI;
- Analytics Engine;
- Hyperdrive where appropriate;
- Pipelines / Containers / Smart Placement where appropriate;
- future Cloudflare primitives through versioned adapters.

D1-Fabric orchestrates these primitives; it must not unnecessarily recreate their native semantics.

Status: PARTIAL → TARGET.

### CF-30 Admin / Operations Plane — PLATFORM

- health inspection;
- topology inspection;
- shard inspection;
- placement inspection;
- migration control;
- emergency controls;
- quota management;
- policy management;
- audit inspection;
- evidence retrieval;
- safe operational commands;
- read-only diagnostics by default.

Status: PLANNED → TARGET.

### CF-31 Testing / Verification / Chaos — GOVERNANCE CORE

- unit tests;
- contract tests;
- integration tests;
- deterministic routing tests;
- migration tests;
- failure injection;
- retry tests;
- timeout tests;
- idempotency tests;
- concurrency tests;
- load tests;
- soak tests;
- chaos tests;
- cost tests;
- security tests;
- recovery drills;
- exact evidence capture.

Status: PARTIAL → TARGET.

### CF-32 Performance Engineering — GOVERNANCE / PLATFORM

- P50/P95/P99 latency;
- throughput;
- fan-out amplification;
- read/write amplification;
- hot-key behavior;
- cold-start sensitivity;
- migration throughput;
- recovery time;
- cost per operation;
- capacity envelope;
- regression budgets;
- benchmark reproducibility.

Status: PARTIAL → TARGET.

### CF-33 Developer / AI Governance — GOVERNANCE CORE

- machine-readable task packets;
- scope freeze;
- repository source-of-truth;
- mandatory read order;
- contract-first implementation;
- automatic scope validation;
- exact-SHA verification;
- independent review;
- evidence requirements;
- major-stage stop;
- no autonomous architecture expansion.

Status: DONE at current governance baseline; continue to integrate with R2-R6.

## 6. Previously Planned / Advanced Features Consolidation

The following previously discussed features are explicitly preserved in the long-term capability map rather than being lost between planning cycles:

- logical database abstraction;
- deterministic HASH sharding;
- versioned shard maps;
- shard registry;
- automatic/controlled expansion;
- migration and rebalance;
- placement;
- retry;
- timeout;
- circuit breaker;
- failure recovery;
- consistency protection;
- idempotency;
- LKG;
- control epoch;
- fencing;
- cache security binding;
- cursor security;
- extension security binding;
- numeric capacity envelope;
- budget reservation/consumption/hard-stop;
- distributed quota guarantee levels;
- cost-aware execution;
- observability;
- SLO/error budget;
- backup/restore/DR;
- schema evolution;
- security and tenant isolation;
- supply-chain governance;
- reproducible evidence;
- AI application runtime;
- SDK/developer API;
- Cloudflare-native adapter layer.

## 7. Competitor-Parity Principle

“Competitor parity” means capability coverage, not cloning another vendor's internal implementation.

The foundation should cover the core concerns represented by mature distributed data/runtime platforms:

- routing;
- partitioning/sharding;
- distributed execution;
- consistency;
- transactions or explicit transaction boundaries;
- caching;
- asynchronous processing;
- retries and failure handling;
- capacity control;
- placement and migration;
- observability;
- security;
- multi-tenancy;
- backup/recovery;
- schema evolution;
- operational tooling;
- developer APIs;
- governance.

Vendor-specific features that do not fit Cloudflare's substrate or D1-Fabric's generic infrastructure boundary are not copied merely for checklist completeness.

## 8. What Must NOT Enter Core

The following remain application/domain concerns:

- article semantics;
- video/feed ranking;
- social graph business rules;
- advertising auction logic;
- game rules;
- novel/comic/drama business logic;
- MCN business workflows;
- merchant/order business semantics;
- model-specific prompt logic;
- end-user UI;
- product-specific recommendation algorithms.

They may be implemented on D1-Fabric, but not embedded into the generic Core.

## 9. Versioning Strategy

The target is not “never release a version.” The target is “never require a major architectural rewrite because the original foundation forgot a core capability.”

### Stable forever by contract

- core ownership model;
- core routing semantics;
- Worker authority boundaries unless an ADR proves a topology change;
- data ownership law;
- contract compatibility law;
- governance authority chain;
- security/least-privilege principles;
- runtime budget principles.

### Evolvable without architectural reset

- algorithms;
- adapters;
- performance implementation;
- Cloudflare primitive integrations;
- observability exporters;
- SDK versions;
- administrative tooling;
- optional capabilities;
- internal data structures behind stable contracts.

### Major version allowed only for genuine incompatibility

A major version requires explicit proof that backward-compatible evolution is insufficient, plus ADR, migration plan, verification and user-approved stage transition.

## 10. Implementation Order

The capability map does not authorize parallel uncontrolled implementation. The planned execution order is:

```text
R0 Authority Reconciliation
  PASS
    |
R1 Executable Governance Foundation
  PASS required
    |
Complete Foundation Capability Contract approval
    |
R2 Contract + Runtime Enforcement
    |
R3 Reliability + Cost + Observability
    |
R4 Full Foundation CI
    |
R5 Foundation Blueprint APPROVED / FROZEN
    |
User approval
    |
R6 Capability implementation packets
    |
Continuous compatible evolution
```

Within R6, implementation must continue to use contract → code → test → verification → scope gate → exact SHA → independent review → evidence → stop.

## 11. Definition of Complete Foundation 1.0

D1-Fabric 1.0 is considered capability-complete only when every CORE capability has:

1. normative contract;
2. explicit owner;
3. dependency declaration;
4. Cloudflare substrate mapping;
5. security boundary;
6. runtime/cost envelope;
7. failure semantics;
8. observability contract;
9. test taxonomy;
10. migration/rollback semantics where applicable;
11. machine-verifiable evidence;
12. production readiness decision.

“Capability-complete” does not mean every optional extension must be enabled in every deployment.

## 12. Final Architectural Rule

> Define the complete foundation capability surface once. Freeze the stable boundaries. Implement incrementally under machine-enforced governance. Prefer additive, backward-compatible evolution. Never use missing planning as a reason to redesign the foundation after implementation has begun.

This document is intentionally non-authoritative until it is reviewed, reconciled with the existing Foundation Blueprint, Capability Registry, ADR Registry, Contract Registry and Change Manifest, then explicitly promoted by the repository governance process.
