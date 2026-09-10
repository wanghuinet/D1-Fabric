# D1-Fabric 3.1 Function Catalog

Version: 1.0  
Status: ACTIVE  
Purpose: unified development queue and classification for the post-3.0 product line.

## 1. Classification

- KERNEL — mature distributed middleware foundation; required for Open Core.
- ADVANCED — mature high-end capability; built after Open Core.
- D1-ADAPT — proven industry idea adapted to Cloudflare D1 constraints.
- MOAT — D1-Fabric-specific innovation built on proven ideas.
- FRONTIER — experimental or autonomous capability; never a synchronous availability dependency.

## 2. Open Core / KERNEL

Gateway; request contract; routing; shard key; deterministic hashing; shard ID; shard registry; versioned routing; query execution; write execution; idempotency; read/write path; topology; placement foundations; health/state model; timeout; deadline; retry; backoff; failure classification; circuit breaker; cancellation; recovery; expansion foundation; migration foundation; rebalance foundation; contract verification; integration and regression gates.

## 3. Advanced / Mature High-End

Online Data Movement; Migration Verification; Migration Proof; Consistency Policy Engine; Policy-Gated Cutover; Database Change Request; Safe Schema Change Pipeline; Traffic Shadowing; Progressive Rollout; Hotspot Detection; Hotspot Isolation; Adaptive Expansion; Workload-aware Placement; Shard Controller; shard health model.

## 4. D1-ADAPT

Consistency policies mapped to D1 Sessions/Bookmarks; D1-aware online movement; D1-aware cost/latency routing; shared control-state strategies suitable for Workers isolates; D1-native migration verification; bounded fan-out and request-budget aware scheduling.

## 5. MOAT

Migration Proof Contract; Consistency Budget; Cost-aware Routing; Hotness Score; Migration Risk Score; Policy-Gated Cutover as a formal state machine; Shard Digital Twin.

## 6. FRONTIER

Workload Fingerprinting; Anomaly Detection; Capacity Prediction; Simulation/Shadow Twin; Policy Recommendation; Adaptive Routing; Adaptive Cache; Adaptive Retry; AI-assisted RCA; Bounded Autonomous Optimization.

AI or prediction MUST NOT become a synchronous availability dependency of Open Core.

## 7. Industry Ideas to Absorb

Vitess: online replication/data movement and verification concepts. ShardingSphere: pluggable capability architecture. PlanetScale: change requests, schema diff and gated deployment. CockroachDB: workload and locality-aware placement. YugabyteDB: online splitting and adaptive expansion. DynamoDB: hotspot/adaptive-capacity concepts. Cloudflare D1/Workers: sessions/bookmarks, global read replication, Workers execution model and Durable Objects for strongly consistent coordination where appropriate.

These are design references, not implementation dependencies or copied code.

## 8. Development Sequence

Open Core architecture and contracts → Open Core implementation and verification → Open Core 1.0 release gate → Advanced contracts → Advanced implementation in priority order → frontier experiments.

## 9. Admission Rule

No new capability enters development without: problem statement, classification, industry provenance or explicit original rationale, module ownership, dependency DAG placement, contract impact, runtime impact, verification plan, rollback strategy and release classification.
