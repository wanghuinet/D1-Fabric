# D1-Fabric Complete Foundation Contract v1.0

**Status:** PROPOSED — planning baseline reconciled by ADR-0004; not implementation authority until Foundation Freeze.
**Purpose:** Define the complete long-term capability and engineering acceptance model so the foundation is planned once and then evolved without repeated architectural resets.

## 1. Contract Objective

D1-Fabric 1.0 is planned as a complete generic backend/data-fabric foundation for conventional applications and AI-generated applications. The objective is capability completeness at the foundation boundary, not implementation of every capability in one release or cloning another vendor.

The contract establishes:

- one complete capability surface;
- stable architecture boundaries;
- explicit separation of Core, Platform, Adapter and Extension concerns;
- one admission model for every future capability;
- backward-compatible evolution by default;
- measurable production-readiness gates.

## 2. Architecture Invariants

Unless a later approved ADR proves otherwise:

1. W01 Fabric Gateway is the ingress/admission boundary.
2. W02 Execution Fabric owns execution/read-path orchestration and routing/sharding foundations.
3. W03 Write Fabric owns mutation/idempotency execution.
4. W04 Control Plane owns control metadata, policy, placement and migration control.
5. Reliability is a capability domain across W01-W04.
6. Placement/Migration is a W04-owned capability domain.
7. W05/W06 are reserved capability labels, not independently deployable Workers.
8. Authoritative mutable state has one logical owner.
9. Caches are never authoritative.
10. Core MUST NOT depend on Advanced/Frontier capabilities.
11. Cloudflare-native services are preferred over custom replacement subsystems.
12. Runtime and cost envelopes are bounded and machine-verifiable.

## 3. Complete Capability Surface

The canonical planning list is CF-01 through CF-33 in `docs/D1-FABRIC-COMPLETE-FOUNDATION-CAPABILITY-MAP-v1.0.md`.

The domains are:

| ID | Capability domain | Target role |
|---|---|---|
| CF-01 | Gateway & API Edge | ingress, admission, API boundary |
| CF-02 | Execution Fabric | execution, fan-out/fan-in, budgets |
| CF-03 | Routing & Shard Selection | deterministic placement target selection |
| CF-04 | Sharding & Capacity | logical/physical shard lifecycle |
| CF-05 | Read Fabric | routed read and bounded aggregation |
| CF-06 | Write Fabric | routed mutation execution |
| CF-07 | Idempotency | exactly-once-effect controls |
| CF-08 | Cache & Acceleration | cache policy and acceleration |
| CF-09 | Async / Queue / Event | durable asynchronous execution |
| CF-10 | Reliability | timeout, retry, circuit, recovery |
| CF-11 | Control Plane | metadata, epochs, policy and state |
| CF-12 | Placement & Topology | placement and topology decisions |
| CF-13 | Migration & Rebalance | movement, cutover, proof and rollback |
| CF-14 | Consistency & Session | consistency semantics and bookmarks |
| CF-15 | Distributed Coordination | leases, locks, fencing |
| CF-16 | Multi-Tenancy | isolation, quota, noisy-neighbor control |
| CF-17 | Security | authn/authz, RBAC, least privilege, audit |
| CF-18 | Observability | logs, metrics, traces, SLOs |
| CF-19 | Cost Governance | budget reservation, consumption, hard-stop |
| CF-20 | Capacity & Admission | numeric ceilings and overload control |
| CF-21 | Schema & Data Lifecycle | evolution, retention, deletion |
| CF-22 | Backup / Restore / DR | recoverability and drills |
| CF-23 | Contract & Compatibility | semantic/version governance |
| CF-24 | Architecture Governance | machine-enforced architecture rules |
| CF-25 | Deployment & Environment | rollout, rollback, drift control |
| CF-26 | Supply Chain & Build Integrity | dependencies, SBOM, provenance |
| CF-27 | SDK / Developer API | stable developer-facing interface |
| CF-28 | AI Application Runtime | generic primitives for AI-built applications |
| CF-29 | Storage / Cloudflare Adapters | native primitive integration |
| CF-30 | Admin / Operations | safe operational control surface |
| CF-31 | Testing / Verification / Chaos | correctness and resilience evidence |
| CF-32 | Performance Engineering | latency, throughput, cost, regression |
| CF-33 | Developer / AI Governance | machine-guided implementation control |

## 4. Previously Planned and Advanced Features

The following are explicitly preserved and cannot be silently dropped during roadmap changes:

- logical database abstraction;
- deterministic HASH sharding;
- versioned shard maps and registry;
- controlled expansion and no-loss scale-out;
- range/directory routing as a future routing strategy;
- hot-key / hot-shard detection and isolation;
- Retry / Timeout / Circuit Breaker / Failure Recovery;
- LKG and control-epoch fencing;
- consistency budgets and policy-gated cutover;
- cache/cursor/extension security binding;
- numeric capacity envelopes;
- distributed quota guarantee levels;
- Budget Reservation / Consumption / Hard-Stop;
- migration proof and migration risk scoring;
- placement and workload-aware placement;
- safe schema-change pipeline;
- traffic shadowing and progressive rollout;
- anomaly detection and capacity prediction;
- shard digital twin / simulation interfaces;
- cost-aware routing;
- SLO / error budget;
- backup / restore / DR;
- SDK and typed developer interfaces;
- AI Application Runtime;
- Cloudflare-native adapter layer;
- machine-verifiable evidence and GPT development governance.

These features move through contracts and stage gates; their inclusion here is not immediate implementation authorization.

## 5. Competitor-Parity Rule

Competitor parity is assessed by infrastructure capability coverage. D1-Fabric may absorb proven concepts from systems such as Vitess, PlanetScale, CockroachDB, YugabyteDB, DynamoDB and ShardingSphere where they fit the Cloudflare/D1 execution model.

D1-Fabric MUST NOT copy proprietary implementations, rebuild native Cloudflare services unnecessarily, or import business-domain semantics merely to satisfy a feature checklist.

A parity claim requires a capability contract plus evidence appropriate to the claim.

## 6. Capability Admission

A planned capability becomes implementation-authorized only after all of the following exist:

1. capability ID and classification;
2. problem statement and non-goals;
3. implementation mode: NATIVE / ORCHESTRATION / GAP / exceptional REPLACEMENT;
4. Cloudflare substrate assessment;
5. owner, module and Worker boundary;
6. dependency DAG placement;
7. authoritative data owner;
8. public contract and compatibility impact;
9. runtime/resource envelope;
10. security analysis;
11. cost/performance impact;
12. failure semantics;
13. verification taxonomy;
14. migration/rollback plan;
15. Change Manifest authorization;
16. release/stage assignment.

## 7. Completion Model

A capability is not complete because code exists.

A capability is `FOUNDATION-PASS` only when applicable implementation, unit tests, contract tests, integration tests, static/dependency checks, security checks, runtime tests and evidence satisfy its contract.

Migration, consistency, performance, recovery and chaos capabilities require their additional evidence classes where applicable.

## 8. Compatibility / Versioning

Backward-compatible evolution is the default.

Major version change requires proof that additive evolution cannot satisfy the requirement, plus:

- new contract version;
- ADR;
- migration strategy;
- verification evidence;
- release gate;
- explicit user-approved stage transition.

The project therefore aims for a stable 1.0 architectural foundation, not a promise that software will never receive versions.

## 9. Core Exclusions

The following remain application concerns and MUST NOT become generic Core semantics:

- article/feed ranking;
- social product rules;
- advertising auction logic;
- game rules;
- novel/comic/drama business workflows;
- creator/MCN product workflows;
- merchant/order semantics;
- model-specific prompt logic;
- end-user UI.

The platform can expose generic primitives needed to build them.

## 10. Implementation Sequence

```text
R0 Authority Reconciliation             PASS
        |
R1 Executable Governance                PASS required
        |
Complete Foundation Contract            APPROVE / FREEZE
        |
R2 Contract + Runtime Enforcement       LOCKED until R1
        |
R3 Reliability + Cost + Observability  LOCKED
        |
R4 Full Foundation CI                  LOCKED
        |
R5 Foundation Freeze                   LOCKED
        |
User approval
        |
R6 Capability implementation packets
        |
Continuous backward-compatible evolution
```

No parallel implementation may bypass these gates.

## 11. Definition of Foundation 1.0 Complete

Every CORE capability must have:

- normative contract;
- explicit owner and dependency graph position;
- native substrate mapping;
- security boundary;
- runtime and cost envelope;
- failure semantics;
- observability semantics;
- test taxonomy;
- migration/rollback semantics where applicable;
- machine-verifiable evidence;
- production-readiness decision.

Optional Extensions and Frontier capabilities do not need to be enabled for every deployment and never become a synchronous availability dependency of Core.

## 12. Long-Term Stability Law

Stable boundaries:

- ownership;
- data authority;
- routing semantics;
- Worker authority;
- contract compatibility law;
- governance chain;
- least privilege;
- bounded runtime/cost policy.

Evolvable implementations:

- algorithms;
- adapters;
- storage providers;
- performance mechanisms;
- observability exporters;
- SDK releases;
- optional capabilities;
- internal data structures behind stable contracts.

This is the governing intent for avoiding future large-scale re-platforming.
