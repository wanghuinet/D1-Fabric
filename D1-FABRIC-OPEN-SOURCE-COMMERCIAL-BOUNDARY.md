# D1-Fabric Open-Source / Commercial Boundary Contract

**Status:** ACTIVE / GOVERNANCE
**Version:** 1.0
**Scope:** D1-Fabric 1.0 and all subsequent A08+ capabilities unless explicitly superseded by an approved architecture decision.

## 1. Purpose

This document defines the permanent boundary between the D1-Fabric community/open-source layer and the commercial/proprietary layer.

The goal is not to hide ordinary infrastructure code. The goal is to:

- make D1-Fabric easy to adopt, inspect, integrate, test and extend;
- keep the core data model, contracts and interoperability accessible to the ecosystem;
- protect the algorithms, automation, control-plane intelligence and operational capabilities that constitute D1-Fabric's commercial differentiation;
- prevent accidental disclosure of proprietary implementation by AI-assisted development;
- prevent future architecture work from crossing the commercial boundary without an explicit decision.

## 2. Governing Principle

> **Open the ecosystem. Protect the moat.**

Open-source code should maximize adoption and interoperability.
Commercial code should contain capabilities whose disclosure would materially reduce D1-Fabric's competitive, operational or economic advantage.

The boundary is based on **capability and competitive value**, not simply file count or code size.

## 3. Three Product Layers

D1-Fabric should evolve toward three clearly separated distribution layers:

### 3.1 Community / Open Source

Purpose: adoption, developer trust, interoperability, experimentation and ecosystem growth.

Typical contents:

- public APIs and stable contracts;
- core data structures and serialization contracts;
- basic shard abstractions;
- deterministic routing interfaces;
- query interfaces and basic execution framework;
- cache interfaces;
- write interfaces and idempotency contracts;
- storage adapters/interfaces;
- local development runtime;
- test fixtures and conformance tests;
- basic benchmark harnesses;
- documentation and examples;
- protocol specifications;
- non-sensitive observability interfaces.

### 3.2 Enterprise / Commercial Software

Purpose: production automation, advanced operations, enterprise controls and higher-value optimization.

Typical contents:

- advanced control-plane automation;
- automatic shard split/merge decisions;
- advanced migration orchestration;
- automatic hotspot detection and remediation;
- predictive capacity management;
- advanced D1 I/O and cost optimization;
- advanced recovery automation;
- enterprise security/isolation controls;
- audit/compliance capabilities;
- policy engines;
- advanced fleet management;
- proprietary optimization algorithms;
- commercial operational tooling.

### 3.3 Managed Cloud Service

Purpose: hosted D1-Fabric infrastructure and operational service.

This layer is commercial even where its underlying public APIs are open.

Examples:

- managed clusters;
- hosted control plane;
- automated scaling;
- managed migrations;
- SLA-backed availability;
- enterprise support;
- usage/cost optimization service;
- hosted observability and capacity intelligence.

## 4. A01-A10 Boundary Plan

| Capability | Default boundary | Rule |
|---|---|---|
| A01 Foundation | OPEN | Public contracts, types and foundational runtime abstractions remain open. |
| A02 Shard Engine | OPEN + COMMERCIAL EXTENSIONS | Basic shard model/routing contract open; proprietary optimization and automation may remain commercial. |
| A03 Query Engine | OPEN + COMMERCIAL EXTENSIONS | Basic query planning/execution contracts open; advanced optimization algorithms may be commercial. |
| A04 Cache Layer | OPEN + COMMERCIAL EXTENSIONS | Cache contracts and basic implementation open; predictive/adaptive optimization may be commercial. |
| A05 Write Engine | OPEN + COMMERCIAL EXTENSIONS | Basic write/idempotency semantics open; advanced batching, admission and cost optimization may be commercial. |
| A06 Storage / Persistence | OPEN | Core storage abstraction and compatibility layer should remain open. Proprietary operational automation may be commercial. |
| A07 Control / Cluster | MIXED | Public protocol/interfaces open; high-value orchestration and fleet intelligence may be commercial. |
| A08 Migration / Rebalancing | MIXED | Migration protocol and conformance model open; advanced automatic migration, hotspot response and optimization may be commercial. |
| A09 Reliability / Recovery | MIXED | Failure contracts and basic recovery mechanisms open; advanced automated recovery and fleet remediation may be commercial. |
| A10 Observability / Capacity | MIXED | Basic metrics, benchmark and capacity interfaces open; predictive capacity/cost intelligence may be commercial. |

**Important:** This table is a default policy, not permission to place arbitrary code in either layer. Every implementation must pass the Commercial Boundary Gate.

## 5. Protected Commercial Core

The following capability chain is considered strategically sensitive by default:

```text
Deterministic Shard Routing
        ↓
Hotspot Detection
        ↓
Automatic Split / Merge Decisions
        ↓
Online Migration
        ↓
Epoch / Fencing / Ownership Control
        ↓
Failure Recovery
        ↓
Capacity Prediction
        ↓
D1 I/O Optimization
        ↓
Cost Optimization
        ↓
Global Optimization
```

The existence of the capability and its public contract may be documented openly. The following should normally remain proprietary:

- implementation algorithms whose disclosure materially improves competitor replication;
- proprietary scoring/heuristics;
- learned or adaptive routing logic;
- proprietary hotspot prediction;
- automatic migration decision logic;
- proprietary cost models;
- advanced workload classification;
- fleet-level optimization;
- proprietary control-plane policies;
- operational automation that embodies accumulated production knowledge.

## 6. What Must Remain Open

The project should not create an unusable open-source shell.

The following should remain openly documented and, where practical, implemented in the community edition:

1. API contracts.
2. Data model contracts.
3. Shard identity and routing semantics.
4. Query/write semantics.
5. Idempotency semantics.
6. Error model.
7. Consistency guarantees.
8. Versioning rules.
9. Migration protocol/conformance rules.
10. Basic observability interfaces.
11. Local test/runtime support.
12. Reproducible correctness tests.
13. Basic benchmark methodology.
14. Integration examples.

Users must be able to understand how D1-Fabric works without needing proprietary source code.

## 7. What Must Not Be Accidentally Opened

Unless explicitly approved, do not publish:

- proprietary optimization algorithms;
- proprietary scoring formulas;
- private production heuristics;
- internal service credentials or secrets;
- private infrastructure topology;
- customer-specific operational data;
- proprietary benchmark datasets;
- security-sensitive implementation details that materially increase attack capability;
- internal control-plane automation;
- commercial-only code paths;
- unreleased product strategy embedded in implementation;
- private deployment configuration;
- patented/patent-pending implementation details where publication timing could affect IP strategy.

## 8. API / Implementation Separation

The preferred architecture is:

```text
OPEN
  Public API
  Protocol
  Contract
  Data Model
  Conformance Tests
       │
       ├──────── extension boundary ────────┐
       │                                    │
COMMUNITY IMPLEMENTATION              COMMERCIAL IMPLEMENTATION
       │                                    │
Basic capability                       Advanced capability
       │                                    │
       └──────── same public contract ──────┘
```

Commercial functionality must not require breaking the public API merely to create artificial product differentiation.

## 9. Licensing Policy

The exact license is an explicit project-level legal decision and must not be invented by an AI agent.

Until a formal license decision is recorded:

- do not add license headers that imply an unapproved license;
- do not copy third-party code without verifying its license compatibility;
- do not assume that "source available" means open source;
- do not publish proprietary implementation merely because it is technically useful;
- record third-party dependency licenses before distribution.

A future licensing ADR must define at minimum:

- community license;
- commercial license;
- contributor terms;
- trademark policy;
- source-available versus open-source distinction, if applicable;
- cloud/managed-service rights;
- contribution and relicensing policy.

## 10. Commercial Boundary Gate

Every new capability must answer these questions before code is merged:

1. Is this a public contract or an implementation detail?
2. Does disclosure materially reduce competitive advantage?
3. Does the code contain a proprietary algorithm or heuristic?
4. Does it contain production-only automation?
5. Does it expose security-sensitive information?
6. Does it expose customer or infrastructure information?
7. Can the same public API support both community and commercial implementations?
8. Is the proposed boundary consistent with this document?
9. Has the boundary been recorded in the capability's design/evidence?
10. Is an ADR required?

If any answer indicates unresolved commercial/IP risk, status is **BLOCKED**, not PASS.

## 11. AI Development Boundary

AI coding agents, including DeepSeek and other coding models, MUST treat this document as an architectural constraint.

An AI agent MUST NOT:

- decide licensing terms;
- decide that proprietary code should be open sourced;
- move commercial code into the community layer for convenience;
- copy proprietary algorithms into public examples/tests;
- reproduce commercial implementation in documentation;
- expose secrets, private infrastructure details or customer data;
- infer permission to publish from the fact that code compiles or tests pass.

Before creating or modifying a capability, the agent must identify:

```text
CAPABILITY
→ PUBLIC CONTRACT?
→ COMMUNITY IMPLEMENTATION?
→ COMMERCIAL EXTENSION?
→ PROPRIETARY ALGORITHM?
→ SECURITY/IP RISK?
→ DISTRIBUTION TARGET?
```

If the answer is ambiguous, stop and mark the boundary **UNRESOLVED** rather than guessing.

## 12. Repository Boundary

As the project grows, the preferred physical separation is:

```text
D1-Fabric Community Repository
├── public contracts
├── open implementations
├── conformance tests
├── examples
├── benchmarks
└── documentation

D1-Fabric Commercial Repository / Distribution
├── advanced control plane
├── proprietary optimization
├── enterprise controls
├── managed-service components
└── commercial operational tooling
```

The exact repository split may be deferred until commercial implementation actually exists. Do not create artificial repositories merely to satisfy this document.

## 13. No Artificial Fragmentation

Commercial separation must not create unnecessary architectural modules.

A capability should be split only when the boundary has real value in one or more of:

- independent scaling;
- independent lifecycle;
- independent security boundary;
- independent release cadence;
- commercial distribution boundary;
- ownership boundary;
- meaningful operational isolation.

The project continues to prefer the **minimum number of coherent capabilities**.

## 14. Open-Core Quality Requirement

The community edition must be technically credible.

It must not be intentionally crippled through arbitrary limitations that make correctness, interoperability or evaluation impossible.

Commercial differentiation should primarily come from:

- automation;
- optimization;
- operational intelligence;
- enterprise controls;
- managed service;
- scale/cost/reliability tooling;

rather than withholding basic correctness or compatibility.

## 15. IP Protection Rules

Before public release of a new major capability, evaluate:

- patentability;
- trade-secret value;
- competitive sensitivity;
- third-party license obligations;
- security disclosure risk;
- publication timing.

If an implementation may be patent-sensitive, public documentation or source release must wait for an explicit IP decision.

This document is an engineering governance policy, not legal advice.

## 16. Evidence and Audit

Each release must contain a boundary record showing:

```text
Capability
Distribution: OPEN / COMMERCIAL / MIXED
Public Contract: YES / NO
Proprietary Algorithm: YES / NO
Security Risk: LOW / MEDIUM / HIGH
IP Review: REQUIRED / NOT_REQUIRED / COMPLETE
Decision Owner
ADR / Evidence Reference
```

The audit must verify that repository contents match the declared distribution boundary.

## 17. Relationship to Engineering Constitution

This contract is subordinate to applicable legal requirements but is an active engineering governance document under the D1-Fabric engineering constitution.

The following existing rules remain unchanged:

- minimum complete design;
- minimum code;
- capability rather than task fragmentation;
- explicit contracts and invariants;
- data-plane/control-plane separation;
- D1 I/O minimization;
- reproducible evidence;
- independent verification;
- no undocumented architecture drift.

Commercial boundaries are an additional constraint, not an excuse to weaken engineering quality.

## 18. A08+ Planning Rule

A08 and later capabilities must not automatically inherit the assumption that all code is open.

Before implementation begins for each future capability:

```text
Architecture Review
      ↓
Commercial Boundary Classification
      ↓
Public Contract Definition
      ↓
Community / Commercial Split
      ↓
Implementation
      ↓
Verification
      ↓
Distribution Audit
```

No capability may be released until its distribution status is known.

## 19. Final Rule

The strategic boundary is:

> **Open the protocol, contracts, correctness and ecosystem. Protect the automation, optimization, intelligence and operational moat.**

When uncertain, preserve the user's ability to adopt and understand D1-Fabric while protecting genuinely proprietary competitive value.
