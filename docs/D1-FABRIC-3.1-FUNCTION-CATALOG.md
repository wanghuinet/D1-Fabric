# D1-Fabric 3.2 Function Catalog

Version: 1.1  
Status: ACTIVE  
Purpose: unified capability registry, admission gate and development queue for the post-3.0 product line.

## 1. Classification

- KERNEL — mature distributed middleware foundation; required for Open Core.
- ADVANCED — mature high-end capability; built after Open Core.
- D1-ADAPT — proven industry idea adapted to Cloudflare constraints.
- MOAT — D1-Fabric-specific innovation built on proven ideas.
- FRONTIER — experimental or autonomous capability; never a synchronous availability dependency.

Every capability MUST also declare an implementation mode:

- NATIVE — Cloudflare already provides the underlying capability; use the native service.
- ORCHESTRATION — D1-Fabric coordinates multiple Cloudflare primitives.
- GAP — Cloudflare does not provide the required abstraction; implement only the minimum missing layer.
- REPLACEMENT — intentionally replaces a Cloudflare capability; exceptional and requires architecture approval.

## 2. Core Rule: Do Not Rebuild Cloudflare

The capability catalog MUST be checked before coding.

D1-Fabric MUST prefer Cloudflare-native capabilities for compute, storage, messaging, durable workflows, scheduling, telemetry, vector search, AI and other supported infrastructure concerns.

D1-Fabric's differentiated work is the cross-product layer: logical sharding, routing, metadata, placement, migration coordination, reliability policy, cost control, verification, governance and safe automation.

A duplicate infrastructure subsystem MUST NOT be admitted merely because it offers a slightly different API.

## 3. Open Core / KERNEL

Gateway; request contract; admission/validation; routing; shard key; deterministic hashing; logical shard ID; shard registry; versioned routing; query execution; write execution; idempotency; read/write path; topology; placement foundations; health/state model; timeout; deadline; retry; backoff; failure classification; circuit breaker; cancellation; recovery; expansion foundation; migration foundation; rebalance foundation; contract verification; integration and regression gates.

The Kernel owns coordination and policy around Cloudflare primitives, not replacement implementations of those primitives.

## 4. Advanced / Mature High-End

Online Data Movement; Migration Verification; Migration Proof; Consistency Policy Engine; Policy-Gated Cutover; Database Change Request; Safe Schema Change Pipeline; Traffic Shadowing; Progressive Rollout; Hotspot Detection; Hotspot Isolation; Adaptive Expansion; Workload-aware Placement; Shard Controller; Cost-aware Routing; advanced shard health model.

## 5. D1-ADAPT

D1 Sessions/Bookmarks consistency mappings; D1-aware online movement; D1-aware cost/latency routing; Workers-isolate shared control-state strategies; D1-native migration verification; request-budget-aware scheduling; D1 read-replica-aware read policy; Cloudflare binding-aware physical-target resolution.

## 6. MOAT

Migration Proof Contract; Consistency Budget; Cost-aware Routing; Hotness Score; Migration Risk Score; Policy-Gated Cutover as a formal state machine; Shard Digital Twin; Fabric-level topology abstraction; cross-primitive cost/performance policy.

## 7. FRONTIER

Workload Fingerprinting; Anomaly Detection; Capacity Prediction; Simulation/Shadow Twin; Policy Recommendation; Adaptive Routing; Adaptive Cache; Adaptive Retry; AI-assisted RCA; Bounded Autonomous Optimization.

AI or prediction MUST NOT become a synchronous availability dependency of Open Core.

## 8. Cloudflare Capability Map

The following are preferred infrastructure substrates, subject to the target plan and runtime evidence:

| Concern | Preferred native substrate | Fabric responsibility |
|---|---|---|
| Compute / HTTP | Workers | Gateway, execution policy, routing |
| Relational persistence | D1 | logical DB/shard abstraction, routing, placement, verification |
| Key/value state | KV | cache/config policy, namespace abstraction |
| Object storage | R2 | media/object metadata and lifecycle policy |
| Strong coordination | Durable Objects | coordination policy, locks/state ownership |
| Async messaging | Queues | event contract, batching, retry/DLQ policy |
| Durable workflows | Workflows | migration/expansion workflow policy |
| Scheduling | Cron Triggers | schedule definitions and governance |
| Analytics/telemetry | Analytics Engine | metric model, cost/performance analysis |
| Vector search | Vectorize | index lifecycle and application integration |
| AI inference | Workers AI | bounded AI operations |
| AI gateway | AI Gateway | model policy, routing and cost governance |
| External DB acceleration | Hyperdrive | approved external DB adapter |

This table is a default decision guide, not permission to use every product. Capability admission MUST consider actual requirements and runtime evidence.

## 9. Worker / Module Ownership

Worker is a deployment boundary, not a business feature bucket.

Initial ownership boundaries:

- W01 — Gateway / ingress / admission boundary;
- W02 — Execution / read-path orchestration;
- W03 — Write / mutation / transaction / idempotency execution;
- W04 — Control Plane / control APIs / policy orchestration;
- W05 — Reliability Plane / retry / timeout / recovery / circuit protection;
- W06 — Placement and migration control where an independent deployment boundary is justified.

Business-specific features such as users, feeds, games, novels, manga, live, ads, creator/MCN, commerce, UI and product-specific recommendation logic MUST NOT be placed in these Core Workers.

A Worker MAY contain several cohesive modules. It MUST NOT contain unrelated capabilities solely to reduce Worker count.

Adding a Worker requires evidence of independent ownership, scaling, security, deployment or failure-isolation benefit.

## 10. Industry Ideas to Absorb

Vitess: online replication/data movement and verification concepts. ShardingSphere: pluggable capability architecture. PlanetScale: change requests, schema diff and gated deployment. CockroachDB: workload and locality-aware placement. YugabyteDB: online splitting and adaptive expansion. DynamoDB: hotspot/adaptive-capacity concepts. Cloudflare D1/Workers: sessions/bookmarks, read replication, Workers execution model and Durable Objects for strongly coordinated state where appropriate.

These are design references, not implementation dependencies or copied code.

## 11. Development Sequence

Stage 0 — Architecture and governance baseline.  
Stage 1 — Open Core contracts and module boundaries.  
Stage 2 — Open Core implementation and verification.  
Stage 3 — Open Core full regression and Cloudflare runtime gate.  
Stage 4 — Open Core 1.0 release gate.  
Stage 5+ — Advanced contracts and implementation in approved priority order.  
Frontier work remains isolated from Core availability.

Each stage has a finite scope. New capabilities discovered during implementation enter the catalog first and do not silently expand the current stage.

## 12. Major-Stage Stop Rule

A major stage is complete only when its required implementation, verification and applicable Cloudflare runtime checks pass and GitHub Actions CI is green.

After a stage reaches PASS, GPT MUST stop at the stage boundary and request explicit user approval before entering the next stage.

A failed check, unresolved architecture issue, forbidden dependency or unexpected scope expansion blocks PASS.

## 13. Admission Rule

No new capability enters development without:

1. problem statement;
2. classification;
3. implementation mode (NATIVE / ORCHESTRATION / GAP / exceptional REPLACEMENT);
4. Cloudflare capability check;
5. industry provenance or explicit original rationale;
6. module and Worker ownership;
7. dependency DAG placement;
8. contract impact;
9. runtime/resource impact;
10. cost/performance impact;
11. verification plan;
12. rollback strategy;
13. release classification.

## 14. Anti-Inflation Rule

The codebase MUST optimize for the smallest correct architecture, not the largest feature count.

Do not create a module, Worker, service, queue, database, cache or abstraction unless the responsibility boundary is real and independently testable or governable.

Do not merge unrelated features merely because they are small.

Do not split tightly coupled code merely to increase component count.

The goal is high cohesion, low coupling, explicit ownership and low rework cost.
