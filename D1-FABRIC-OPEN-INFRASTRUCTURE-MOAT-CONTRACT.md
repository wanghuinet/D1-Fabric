# D1-Fabric Open Infrastructure Moat Contract

**Status:** ACTIVE DESIGN CONTRACT  
**Scope:** D1-Fabric 1.0+  
**Position:** A00.5, between Constitution and A01 implementation  

## 1. Purpose

D1-Fabric SHALL NOT be positioned as a generic D1 ORM, CRUD wrapper, or ordinary sharding library.

Its open-source mission is to establish a credible, reusable and verifiable **distributed data infrastructure protocol for Cloudflare D1**.

The moat SHALL come primarily from architecture, protocols, correctness, conformance, evidence, accumulated engineering knowledge, and ecosystem adoption—not from obscuring ordinary source code.

## 2. Core Positioning

The project SHALL be described as:

> **D1-Fabric is a distributed data infrastructure layer for building scalable, reliable data systems on Cloudflare D1.**

The core abstraction is business-neutral:

```text
Entity
  ↓
Partition Key
  ↓
Shard
  ↓
Route
  ↓
Query / Write
  ↓
Cache
  ↓
D1
```

Content, applications, finance, commerce, agents, games, communities and other domains are upper-layer schemas/adapters. Adding a business domain MUST NOT require adding a core Worker.

## 3. Seven-Layer Moat Model

D1-Fabric SHALL build durable differentiation across seven layers:

1. **Implementation** — minimal, correct reference runtime.
2. **Architecture** — deterministic data-plane/control-plane separation and bounded execution.
3. **Protocols** — explicit routing, ownership, epoch, consistency, idempotency, retry, backpressure, migration and recovery contracts.
4. **Algorithms** — advanced hotspot, migration, capacity and cost optimization, with commercial extensions where appropriate.
5. **Operational Knowledge** — ADRs, failure cases, benchmark history, recovery knowledge and rejected-design records.
6. **Conformance** — reproducible compatibility and correctness suites.
7. **Ecosystem/Standard** — stable contracts, reference implementations, adapters and community adoption.

The project MUST NOT rely on source-code secrecy alone as its primary moat.

## 4. Open Protocol Principle

The open version SHOULD expose the rules necessary for interoperability and independent verification:

- public APIs and protocols;
- shard identity and routing semantics;
- ownership and epoch semantics;
- query/write semantics;
- idempotency and retry semantics;
- error and consistency semantics;
- migration protocol and conformance requirements;
- basic observability contracts;
- reference runtime behavior;
- correctness tests;
- benchmark methodology.

A third party SHOULD be able to understand what a conforming implementation must guarantee without access to proprietary implementation details.

## 5. Conformance Is a First-Class Product

D1-Fabric SHALL maintain a **D1-Fabric Conformance Suite** as a first-class project asset.

The suite SHOULD cover, as applicable:

- deterministic routing;
- shard ownership;
- epoch/fencing;
- read/write correctness;
- idempotency;
- retry behavior;
- concurrent execution;
- partial failure;
- timeout/cancellation;
- backpressure and overload shedding;
- migration;
- restart and recovery;
- hot-key/hot-shard behavior;
- consistency guarantees;
- security boundaries;
- bounded D1 I/O.

Unknown or untested behavior MUST NOT be represented as PASS.

## 6. Evidence-First Performance

D1-Fabric SHALL distinguish claims from evidence.

Performance claims MUST be reproducible and SHOULD record:

- version and commit SHA;
- runtime/configuration;
- dataset size;
- shard count;
- request mix;
- read/write ratio;
- concurrency;
- workload duration;
- P50/P95/P99 latency;
- throughput;
- error/rejection rate;
- D1 reads;
- D1 writes;
- cross-shard fan-out;
- retry amplification;
- queue peak;
- cache hit/read-avoidance ratio;
- hardware/runtime assumptions where relevant.

No benchmark result SHALL be used as proof of scale unless the workload and evidence are reproducible.

## 7. D1 I/O Efficiency as a Design Signature

The core SHALL optimize for **useful work per D1 operation**, not merely raw application throughput.

Normal-path targets SHOULD be bounded and explicit:

- cache-hit single-key read: 0 D1 reads;
- cache-miss single-key read: normally 1 D1 read;
- single-key write: normally 1 bounded D1 write;
- batch operations: bounded batch I/O;
- multi-shard queries: explicitly bounded fan-out.

A request MUST NOT create unbounded D1 reads/writes.

The system SHOULD expose D1 Read Avoidance Ratio, D1 Write Amplification and cross-shard fan-out as architectural metrics.

## 8. Minimal-Core Principle

D1-Fabric SHALL prefer the smallest complete implementation.

The following are prohibited unless a real ownership, scaling, lifecycle, failure-isolation, or protocol boundary justifies them:

- speculative factories/providers/strategies;
- duplicate state models;
- wrapper-only layers;
- artificial Workers;
- duplicate execution paths;
- unnecessary serialization/network hops;
- abstractions added only for imagined future use.

Complexity SHALL be added only when it buys a measurable or contractually required capability.

## 9. Hot Path Contract

The normal data path SHOULD be:

```text
Request
  ↓
Local/edge routing snapshot
  ↓
Cache
  ↓
Query / Write execution
  ↓
Target D1 shard
  ↓
Response
```

The following MUST NOT be mandatory on the normal hot path:

- global coordinator;
- per-request topology lookup from D1;
- migration decision;
- hotspot analysis;
- capacity prediction;
- control-plane consensus;
- unbounded retry/fan-out.

Control-plane intelligence SHALL remain off the normal hot path wherever correctness permits.

## 10. Control-Plane Moat

Advanced intelligence belongs primarily in the control plane:

```text
Metrics
  ↓
Hotspot Model
  ↓
Split/Merge Decision
  ↓
Cost/Benefit
  ↓
Migration Plan
  ↓
Epoch/Fencing
  ↓
Online Migration
  ↓
Verification
  ↓
Rebalance
```

The open core MAY provide deterministic mechanisms and reference policies. Proprietary extensions MAY provide advanced prediction, adaptive policies, workload intelligence, migration optimization, capacity prediction, cost optimization and fleet-level automation.

## 11. Automatic Sharding Standard

Future automatic sharding MUST NOT be reduced to a single threshold such as `QPS > X`.

A production-grade design SHOULD account for:

- pressure;
- persistence;
- growth velocity;
- read/write mix;
- D1 I/O pressure;
- latency pressure;
- hotspot locality;
- split-point quality;
- migration cost;
- fragmentation;
- coordination cost;
- expected benefit;
- safety margin.

It MUST support safe ownership transitions and verification. Where applicable it SHOULD support both split and merge to avoid permanent shard proliferation.

## 12. Reliability as a Public Promise

Open-source credibility SHALL include failure behavior, not only the happy path.

The project MUST specify and test:

- duplicate execution;
- retries;
- timeout;
- partial failure;
- shard failure;
- stale routing;
- migration races;
- restart/recovery;
- overload;
- resource exhaustion.

Recovery MUST restore routing and state invariants before normal traffic resumes.

## 13. Architecture Governance

A capability MAY become a physical Worker only when there is a demonstrated boundary in one or more of:

- independent scaling;
- independent lifecycle;
- failure isolation;
- state ownership;
- security boundary;
- operational boundary;
- materially different hot/cold-path characteristics.

Development Workers are logical capability boundaries unless deployment evidence requires physical separation.

The default design bias is toward fewer Workers and fewer network hops.

## 14. Open-Core / Commercial Boundary

The project SHALL remain technically credible in its open form.

### Open by default

- protocols;
- contracts;
- architecture;
- correctness;
- basic routing/sharding;
- basic query/write/cache;
- interoperability;
- conformance suite;
- benchmark methodology;
- reference runtime;
- basic observability.

### Commercial by default

- proprietary prediction models;
- adaptive hotspot intelligence;
- automatic split/merge decision optimization;
- migration optimization;
- capacity prediction;
- cost optimization;
- fleet/global optimization;
- enterprise automation and governance;
- managed operations.

Commercial code MUST NOT be hidden merely to cripple the community implementation. Differentiation SHOULD come from optimization, automation, intelligence and operational scale.

## 15. Knowledge-Base Moat

Important architectural decisions SHOULD produce durable records:

```text
ADR
Failure Case
Benchmark
Incident
Decision
Rejected Design
Trade-off
Recovery Procedure
Compatibility Note
```

Rejected designs are valuable. The project SHOULD preserve why a seemingly simple alternative was rejected when that decision materially affects scalability, correctness, cost or reliability.

## 16. Evolution Without Fragmentation

The project SHALL avoid turning every capability into a separate package, Worker or repository.

New functionality MUST first answer:

1. Is it a core protocol?
2. Is it a reference implementation?
3. Is it an adapter/extension?
4. Is it control-plane intelligence?
5. Is it commercial-only?

Business-specific requirements SHOULD live above the infrastructure core unless they change the infrastructure protocol itself.

## 17. Anti-Mediocrity Gate

Before a major release is called infrastructure-grade, reviewers MUST be able to answer YES to the following:

- Is the core business-neutral?
- Is the hot path bounded?
- Is D1 I/O explicitly budgeted?
- Is shard ownership unambiguous?
- Are retries/idempotency explicit?
- Is overload bounded?
- Is recovery demonstrated?
- Are concurrency races tested?
- Are performance claims reproducible?
- Is there a conformance story?
- Can another engineer understand the protocol without reverse-engineering the implementation?
- Does the release reduce unnecessary complexity rather than accumulate abstractions?

Any unresolved P0/P1 violation blocks the infrastructure-grade claim.

## 18. Long-Term Standard

The strategic objective is not merely to make D1-Fabric popular.

The objective is to make the following association credible:

```text
Cloudflare D1
    ↓
D1-Fabric
    ↓
Distributed Data Infrastructure
```

The strongest outcome is that developers, reviewers and infrastructure engineers can use D1-Fabric's contracts, conformance suite and reference architecture as a common language for discussing scalable D1 systems.

## 19. Non-Goals

This contract does NOT authorize:

- premature implementation of A08+;
- speculative commercial code;
- business-specific schemas in the core;
- artificial Worker fragmentation;
- benchmark theater;
- hiding defects behind abstraction;
- claiming scale without evidence;
- changing correct A01–A07 code merely to satisfy this document.

## 20. Relationship to Existing Governance

This contract supplements and does not replace:

- `D1-FABRIC-ENGINEERING-CONSTITUTION-V3.0.md`
- `D1-FABRIC-ENGINEERING-CONSTITUTION-V3.1-ADDENDUM.md`
- `D1-FABRIC-ENGINEERING-CONSTITUTION-V3.2-ADDENDUM.md`
- `D1-FABRIC-1.0-DEVELOPMENT-CONTRACT.md`
- `D1-FABRIC-ARTIFACT-TYPE-CONTRACT.md`
- `D1-FABRIC-FIRST-PASS-VERIFICATION-PROTOCOL.md`
- `D1-FABRIC-WORLD-CLASS-SCALE-AND-RELIABILITY-GATE.md`
- `D1-FABRIC-OPEN-SOURCE-COMMERCIAL-BOUNDARY.md`
- `D1-FABRIC-PLATFORM-INFRASTRUCTURE-CONTRACT.md`

Where contracts conflict, the higher-authority governance document controls until the conflict is explicitly resolved.

## 21. A00.5 Exit Criteria

A00.5 is complete when:

1. the infrastructure positioning is frozen;
2. the moat model is frozen;
3. open protocol principles are frozen;
4. conformance/evidence requirements are defined;
5. D1 I/O efficiency is an explicit architectural objective;
6. hot-path/control-plane separation is explicit;
7. open/commercial boundaries are explicit;
8. the anti-mediocrity gate is adopted;
9. A01–A07 can be audited against this contract without changing the business-neutral core principle.

**Final principle:**

> **Open the protocol, correctness, evidence and ecosystem. Protect the optimization, automation, intelligence and operational moat. Build the smallest core that deserves to be called infrastructure.**
