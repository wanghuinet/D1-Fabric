# D1-Fabric GPT Continuous Master Document

Version: 1.1  
Status: ACTIVE / SOURCE OF TRUTH FOR GPT CONTINUITY

## 1. Purpose

This document defines the operating contract for GPT-led implementation of D1-Fabric after the architecture baseline is approved.

It does not replace formal contracts. Formal architecture, module, API, data, security and verification contracts remain authoritative.

The objective is continuous implementation without uncontrolled architecture drift, Worker bloat, duplicate infrastructure and repeated redesign.

## 2. Product Model

D1-Fabric is a Cloudflare-native distributed relational data fabric built around Cloudflare primitives.

The system is intentionally divided into:

1. Open Core 1.0 — the independently runnable foundational middleware kernel;
2. Advanced — higher-order optimization and differentiated capabilities built above stable Core contracts.

Business applications remain above the middleware.

## 3. Cloudflare-Native-First

Before implementing any infrastructure capability, GPT MUST check whether Cloudflare already provides it.

When an applicable Cloudflare-native capability exists, GPT MUST use it through an adapter/policy/orchestration layer rather than reimplementing the underlying service.

The default mapping includes Workers, D1, KV, R2, Durable Objects, Queues, Workflows, Cron Triggers, Analytics Engine, Vectorize, Workers AI, AI Gateway and Hyperdrive where the requirement matches the product capability.

A proposed duplicate implementation requires an explicit architecture decision explaining why the native capability is insufficient.

## 4. Core Architectural Boundary

Open Core MUST run correctly with Advanced disabled.

Advanced MAY depend on Open Core, but MUST enter through stable contracts and extension points.

Core MUST NOT depend on Advanced.

Business modules MUST NOT be embedded into Core Workers merely because they can technically run there.

## 5. Runtime / Worker Governance

Worker is a deployment/runtime boundary; it is not a feature container.

The initial Worker responsibilities are:

- W01: Gateway / request admission;
- W02: Execution / read-path orchestration;
- W03: Write / transaction / idempotent mutation execution;
- W04: Control Plane / control APIs and policy orchestration;
- W05: Reliability Plane / timeout, retry, circuit, failure and recovery;
- W06: Placement / migration / expansion control where independently deployable.

GPT MUST keep each Worker focused on cohesive responsibilities.

The following MUST remain outside Core Workers: user business logic, feed/business ranking, games, novels, manga, live business flows, advertising campaigns, creator/MCN workflows, e-commerce, product UI and other domain-specific application behavior.

A new Worker requires a concrete reason based on independent deployment, scaling, security, lifecycle or failure isolation. Component count alone is not a reason.

## 6. Module Governance

Each module MUST have:

- one primary responsibility;
- explicit owner;
- public contract;
- dependency list;
- data ownership;
- allowed Cloudflare bindings;
- forbidden dependencies;
- tests and verification scope.

Cross-module direct state access is forbidden when a stable contract exists.

Unrelated functionality MUST NOT be merged into an existing module to save lines of code.

Tightly coupled functionality SHOULD remain together when separating it would create unnecessary network hops, duplicated serialization or lifecycle complexity.

## 7. Continuous Development Operating Loop

GPT works continuously inside the currently approved major stage:

Read current state → read contracts → inspect affected modules → implement the smallest correct change → run focused tests → run stage regression → run runtime checks where required → inspect architecture/dependency boundaries → update evidence/state → continue to the next task in the SAME approved stage.

GPT MUST NOT ask for approval between every small task.

GPT MUST stop only at the declared major-stage boundary.

## 8. Major-Stage Gate

Every major stage has an explicit scope and acceptance criteria.

A stage is PASS only when:

1. all scoped implementation work is complete;
2. applicable unit tests pass;
3. contract tests pass;
4. integration tests pass;
5. static/type/dependency checks pass;
6. required Cloudflare runtime verification passes;
7. architecture boundary audit passes;
8. no forbidden business code is present in Core Workers;
9. no unexplained duplicate Cloudflare infrastructure exists;
10. complete applicable GitHub Actions CI is green;
11. evidence/state documents are updated.

After PASS, GPT MUST STOP and request explicit user confirmation before entering the next major stage.

GPT MUST NOT continue automatically after a stage PASS.

A red CI check or unresolved blocking defect means the stage is NOT PASS.

## 9. Scope-Control Rule

Once a major-stage scope is frozen, GPT MUST NOT silently add new capabilities.

A newly discovered capability must be classified and placed into the function catalog and future-stage queue.

Implementation MAY fix defects required for the current stage, but must not use a defect as justification for opportunistic redesign.

Architecture changes require an explicit impact record before implementation.

## 10. Change Decision Order

For every proposed change, apply this order:

1. Is the capability already provided by Cloudflare?
2. Can existing D1-Fabric capability satisfy it without a new subsystem?
3. Can an existing module own it without violating responsibility boundaries?
4. Can an existing Worker host it without mixing unrelated concerns?
5. Does it require a new contract?
6. Does it materially change resource/cost behavior?
7. Does it require a new Worker or service?
8. Does it belong in Core, Advanced or the future queue?

Prefer the smallest architecture that fully satisfies the requirement.

## 11. Resource Discipline

GPT MUST account for Cloudflare runtime and billing characteristics when changing hot-path code.

Avoid unnecessary subrequests, cross-Worker hops, cross-shard fan-out, duplicate reads, broad projections, unbounded retries and unbounded asynchronous work.

Prefer native batching, caching, queues, workflows and durable coordination where appropriate instead of bespoke equivalents.

Performance and cost regressions MUST be treated as architecture defects when they materially affect the platform.

## 12. Verification Discipline

No feature is complete merely because code exists or local tests pass.

Required state progression is:

DESIGNED → CONTRACTED → IMPLEMENTED → UNIT PASS → CONTRACT PASS → INTEGRATION PASS → RUNTIME VERIFIED (when applicable) → CI GREEN → ARCHITECTURE AUDIT PASS → STAGE PASS.

Evidence MUST identify what was tested, on which commit/ref, and whether the result is local, CI or real Cloudflare runtime evidence.

## 13. GPT Stop / Resume Protocol

At the beginning of a session GPT MUST read the current state, context, TODO/roadmap and applicable contracts.

During a major stage GPT may continue through all remaining approved tasks without asking for repeated confirmation.

At the major-stage boundary GPT reports:

- completed scope;
- tests and runtime evidence;
- GitHub Actions status;
- architecture/dependency audit result;
- known limitations or deferred items;
- exact next major stage.

Then GPT MUST STOP.

The next stage begins only after explicit user approval.

## 14. Forbidden Development Behaviors

GPT MUST NOT:

- place unrelated business functionality into Core Workers;
- reimplement Cloudflare services without an approved reason;
- silently increase Worker count;
- create a new subsystem for a capability already covered by an existing abstraction;
- perform speculative refactors unrelated to the current stage;
- bypass contracts to accelerate coding;
- declare PASS from local success when required CI/runtime evidence is missing;
- continue into the next major stage after a PASS without user approval;
- treat AI prediction/automation as a Core availability dependency.

## 15. Source-of-Truth Hierarchy

When sources conflict, use this order:

1. versioned architecture and formal contracts;
2. approved function catalog and roadmap;
3. current state/context/evidence;
4. implementation code;
5. task prompt or agent suggestion.

A lower-level prompt cannot override a higher-level contract.

## 16. Current Priority

First freeze the lightweight Open Core architecture and governance model.

Then implement the approved Open Core stages continuously, with GitHub Actions CI and architecture-boundary verification as hard gates.

Advanced capabilities are queued behind the Core release gate unless explicitly reclassified by an approved architecture amendment.

## 17. Non-Goals

This document does not authorize business application development inside Open Core.

It does not authorize unrestricted autonomous production changes.

It does not replace human approval at major-stage boundaries.
