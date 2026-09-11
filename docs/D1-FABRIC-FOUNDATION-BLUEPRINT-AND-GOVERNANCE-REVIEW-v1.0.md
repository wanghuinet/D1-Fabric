# D1-Fabric Foundation Blueprint & Governance Review v1.0

Status: PROPOSED — HUMAN REVIEW REQUIRED  
Purpose: Freeze the engineering foundation, governance model and implementation sequence before continuous GPT implementation.

## 1. Review Objective

This document is the architecture review checkpoint for the D1-Fabric foundation.

The immediate objective is NOT to maximize feature count. The objective is to establish a lightweight, high-cohesion, low-coupling foundation that can absorb substantial future functionality without architectural drift or large-scale rework.

The project MUST optimize for:

- correctness before feature volume;
- explicit ownership before implementation;
- contracts before code;
- Cloudflare-native capability before custom infrastructure;
- automated enforcement before human memory;
- reversible change before irreversible migration;
- measurable cost/performance before optimization claims;
- stage completion before scope expansion.

## 2. Foundation Thesis

D1-Fabric is not intended to become a second implementation of Cloudflare.

Cloudflare provides the execution and infrastructure substrate. D1-Fabric provides the distributed data-fabric abstraction, logical sharding, routing, control, reliability, governance, verification, cost policy and safe orchestration that applications cannot conveniently obtain directly from the primitives.

The foundation therefore has three strict boundaries:

1. Cloudflare Native Layer — use Workers, D1, KV, R2, Durable Objects, Queues, Workflows, Cron Triggers, Analytics Engine, Vectorize, Workers AI, AI Gateway, Hyperdrive and other applicable native capabilities where they satisfy the requirement.
2. D1-Fabric Core — provide domain-neutral data-plane, shard, routing, execution, write, control and reliability contracts and their minimum implementations.
3. Application / Advanced Layer — provide higher-order optimization, AI, product-specific and business capabilities without contaminating Core.

## 3. Lightweight Core Principle

Core MUST remain small in responsibility, not necessarily small in total line count.

A module exists only when it has a real ownership boundary, stable responsibility and independently testable or governable behavior.

A Worker exists only when deployment, scaling, security, failure isolation or lifecycle evidence justifies the boundary.

The project MUST reject both extremes:

- Universal Worker / giant module;
- artificial micro-worker / component inflation.

The target architecture is high cohesion, low coupling and explicit ownership.

## 4. Initial Runtime Blueprint

The initial runtime MAY use the following separation:

- W01 Gateway — ingress, admission and request boundary;
- W02 Execution — execution orchestration and read path;
- W03 Write — write path, transaction and idempotent mutation execution;
- W04 Control Plane — control APIs, policy and control-state orchestration;
- W05 Reliability Plane — timeout, retry, failure classification, circuit protection and recovery;
- W06 Placement/Migration Control — placement, topology, migration, expansion and rebalance where independent deployment is justified.

Worker count is evidence-driven and may change. Worker boundaries MUST NOT be expanded merely to accommodate unrelated functionality.

Application-specific users, feeds, games, novels, manga, live, commerce, ads, creator/MCN, UI and product-specific recommendation logic MUST remain outside Core Workers.

## 5. Capability Model

Every capability MUST exist in the Capability Registry before implementation.

Each capability records:

- capability ID and name;
- classification: KERNEL / ADVANCED / D1-ADAPT / MOAT / FRONTIER;
- implementation mode: NATIVE / ORCHESTRATION / GAP / exceptional REPLACEMENT;
- problem statement;
- owner;
- Worker/module;
- public contract;
- dependencies;
- data owner;
- Cloudflare native substrate;
- runtime bindings;
- resource profile;
- cost/performance impact;
- security impact;
- verification plan;
- rollback strategy;
- lifecycle status.

No implementation may be admitted solely because an agent proposes it.

## 6. Cloudflare-Native-First Gate

Before implementing infrastructure, the development process MUST answer:

1. Does Cloudflare already provide this capability?
2. Can the requirement be satisfied by a native service directly?
3. If multiple native services are needed, can D1-Fabric orchestrate them instead of replacing them?
4. If native capability is insufficient, what is the minimum missing abstraction?
5. If a replacement is proposed, where is the architecture decision and evidence?

A duplicate subsystem is rejected by default.

D1-Fabric's differentiated value should concentrate on the cross-primitive layer: logical sharding, routing, metadata, placement, migration coordination, consistency policy, reliability policy, cost control, verification and safe automation.

## 7. Dependency Governance

The dependency graph MUST remain acyclic.

The default direction is:

Application → Worker/Application Layer → Capability → Contract → Adapter → Cloudflare Native

Forbidden patterns include:

- Core → Advanced dependency;
- circular module dependencies;
- adapter → business-domain dependency;
- lower layer → higher layer reverse dependency;
- cross-Worker private implementation imports;
- bypassing a module's public contract;
- direct access to another module's authoritative state without an approved contract.

Dependency violations MUST block CI.

## 8. Data Ownership Governance

Every persistent object and authoritative state has exactly one logical owner.

The owner defines its schema contract, mutation rules, lifecycle and verification requirements.

Cross-module direct database mutation is forbidden.

Infrastructure substrate ownership and logical data ownership are separate concepts: a D1/KV/R2/DO object may be physically stored by Cloudflare while its authoritative logical contract remains owned by a D1-Fabric module.

Correctness-critical shared state MUST use an explicitly approved authoritative substrate. Caches are never authority.

## 9. Contract Governance

The following contracts are first-class:

- request/API;
- module;
- Worker boundary;
- data/schema;
- event/message;
- routing/version;
- security/permission;
- resource/cost;
- performance/SLO;
- migration/rollback;
- observability.

Public contracts are versioned.

Backward-compatible evolution is the default. Breaking changes require a new version or an explicit migration protocol.

A contract change MUST identify affected consumers, compatibility evidence and rollback/migration behavior.

## 10. Architecture Decision Record (ADR)

Any change that affects architecture, dependency direction, Worker boundaries, data ownership, Cloudflare primitive selection, public contracts, consistency semantics or production migration behavior MUST have a versioned Architecture Decision Record.

An ADR MUST record:

- decision;
- context/problem;
- alternatives considered;
- rationale;
- trade-offs;
- affected modules/contracts;
- runtime and cost impact;
- migration/rollback;
- approval status.

An implementation prompt or agent suggestion cannot override an approved ADR or architecture contract.

## 11. Architecture Enforcement

Governance MUST be executable wherever practical.

The repository SHOULD maintain automated checks for:

- forbidden imports/dependencies;
- dependency cycles;
- Worker responsibility boundaries;
- Core versus business code separation;
- capability registration;
- Cloudflare-native-first declarations;
- contract compatibility;
- data ownership declarations;
- unauthorized bindings;
- generated-code or unregistered-module admission;
- test and verification requirements;
- security and dependency hygiene.

Manual architecture review remains necessary for decisions that cannot be safely reduced to static checks.

## 12. Resource Governance

Every production Core capability SHOULD declare measurable resource expectations where applicable:

- CPU/execution time;
- subrequests;
- D1 operations;
- KV operations;
- R2 operations;
- Queue operations;
- network payload;
- fan-out;
- concurrency;
- storage growth.

Hot paths MUST avoid unbounded fan-out, redundant serialization, duplicate reads and unnecessary Worker hops.

Optimization claims MUST include both performance and cost impact.

A performance improvement that causes unacceptable cost or reliability regression is not considered a successful optimization.

## 13. Cost Budget

Cost is an architectural dimension, not merely an operational concern.

Where measurable, important paths SHOULD maintain budget indicators such as:

- cost per million requests;
- D1 read/write/query volume;
- cross-Worker/subrequest volume;
- storage and egress impact;
- queue/workflow overhead.

Cost regressions MUST be reviewed together with performance changes.

## 14. Reliability Budget

Reliability is governed by explicit budgets and invariants rather than descriptive statements alone.

Core reliability contracts SHOULD cover:

- deadline propagation;
- bounded retry budget;
- failure classification;
- circuit protection;
- cancellation;
- idempotency;
- recovery;
- version fencing;
- fan-out limits;
- consistency protection.

Retries MUST NOT amplify non-idempotent mutations or create retry storms.

## 15. Migration and Rollback as First-Class Capabilities

Expansion, migration, rebalance, schema change and routing cutover MUST be designed together with verification and rollback.

The preferred lifecycle is:

Prepare → Copy/Transform → Verify → Shadow/Observe where applicable → Cutover → Observe → Commit

Every irreversible production operation MUST define a safe failure boundary and an explicit recovery strategy before implementation.

## 16. Observability Contract

Core paths MUST expose sufficient structured information to diagnose production behavior without inspecting implementation internals.

Where applicable, telemetry SHOULD identify:

- request/trace ID;
- logical database ID;
- routing-map version;
- logical/physical shard;
- operation type;
- latency;
- failure class;
- retry count;
- relevant resource counters;
- migration/control operation ID.

Observability data MUST not become an uncontrolled correctness dependency.

## 17. Security and Least Privilege

Each Worker/module MUST receive only the Cloudflare bindings and permissions required for its responsibility.

Security boundaries include:

- tenant/logical-database isolation;
- authorization boundaries;
- secret isolation;
- binding isolation;
- admin/control-plane isolation;
- auditability;
- dependency/supply-chain hygiene.

A Worker MUST NOT receive a broad binding set merely for future convenience.

## 18. GPT Continuous Implementation Protocol

GPT is the implementation executor, not the architecture authority.

For an approved major stage GPT may work continuously through all tasks inside that stage without repeatedly requesting permission.

Before implementation:

Architecture Contract → Capability Registry → Module Contract → Task Scope → Tests/Verification Plan

During implementation:

Contract → Minimal Code → Tests → Integration → Runtime Verification → Governance Checks

At stage completion:

Full applicable GitHub Actions CI → Architecture Audit → Dependency/Data/Contract Audit → PASS

After PASS, GPT MUST STOP and wait for explicit user approval before entering the next major stage.

## 19. Scope Freeze and Discovery Rule

Unexpected requirements discovered during implementation MUST NOT silently expand the current stage.

They are classified as:

- defect within current contract;
- missing contract prerequisite;
- future capability;
- architecture amendment;
- out-of-scope business feature.

Only defects and explicitly approved prerequisites may be handled inside the current stage. Other items enter the registry/roadmap for later approval.

## 20. Definition of Done

A capability is not complete merely because code exists or local tests pass.

The minimum applicable definition of done is:

1. contract defined;
2. owner assigned;
3. capability registered;
4. dependency/data boundaries verified;
5. minimal implementation complete;
6. unit/contract tests pass;
7. integration tests pass where applicable;
8. Cloudflare runtime behavior verified where applicable;
9. governance checks pass;
10. cost/performance impact assessed;
11. rollback/recovery assessed;
12. documentation synchronized;
13. GitHub CI green.

Production readiness may require additional load, stress, chaos, migration, compatibility or security evidence.

## 21. Major Development Blueprint

### Foundation Stage A — Governance Freeze

Freeze architecture contract, capability registry, ownership model, dependency DAG, Cloudflare-native-first rule, ADR process, automated governance gates and stage protocol.

### Foundation Stage B — Core Contract Hardening

Freeze W01-W06 responsibilities, module contracts, data ownership, routing/versioning, runtime bindings and public compatibility rules.

### Foundation Stage C — Core Implementation

Implement only the approved Open Core capabilities, one bounded task at a time, with tests and governance checks after each meaningful unit.

### Foundation Stage D — Full Verification

Run complete regression, Cloudflare runtime verification, resource/cost checks, dependency/security checks and architecture audit.

### Foundation Stage E — Open Core 1.0 PASS

Only after all required gates are green is Open Core considered complete.

### Next Stage — Advanced

Advanced capabilities enter only after Open Core 1.0 PASS and explicit user approval.

## 22. Architecture Review Checklist

Before approving this blueprint, confirm:

- [ ] Core remains independently runnable.
- [ ] Cloudflare-native-first is mandatory.
- [ ] Duplicate infrastructure requires explicit approval.
- [ ] Worker boundaries are responsibility-based.
- [ ] Modules have explicit owners.
- [ ] Dependency DAG is enforceable.
- [ ] Data ownership is enforceable.
- [ ] Contracts are versioned.
- [ ] ADR is mandatory for architecture changes.
- [ ] Cost and performance are both governed.
- [ ] Reliability budgets are explicit.
- [ ] Migration and rollback are first-class.
- [ ] Observability is contractual.
- [ ] Least privilege is enforced.
- [ ] GPT cannot silently expand scope.
- [ ] GPT stops after each major-stage PASS.
- [ ] Human approval is required before the next major stage.

## 23. Approval State

This blueprint is a REVIEW ARTIFACT until explicitly approved by the project owner.

No new major implementation stage may be inferred from this document alone.

After explicit approval, the next action is to translate the approved blueprint into executable repository governance artifacts and then begin the first approved implementation stage.

## 24. Authority

This blueprint complements, but does not silently override, the Open Core Architecture Contract, Function Catalog and GPT Continuous Master Document.

Any conflict is resolved by the higher-level versioned architecture contract until an explicit amendment is approved.
