# D1-Fabric GPT Continuous Master Document

Version: 3.2.1  
Status: ACTIVE / SOURCE OF TRUTH FOR GPT CONTINUITY  
Forward Architecture Contract: `docs/D1-FABRIC-3.2-INFRASTRUCTURE-ARCHITECTURE-CONTRACT-v1.0.md` (Version 1.1, DRAFT FOR ARCHITECTURE REVIEW — HARDENED)

## 1. Purpose

This document preserves the current architectural direction and development continuity for GPT-led implementation. Formal contracts remain authoritative. The hardened 3.2 architecture contract is the current forward-looking architecture baseline pending architecture-review PASS.

## 2. Current Product Model

D1-Fabric is evolving from a D1 sharding middleware into a Cloudflare-native distributed application infrastructure substrate for AI applications, content platforms, SaaS, games, social applications, APIs and other high-concurrency workloads.

D1 remains a core relational capability, but D1 sharding is a Data Plane capability rather than the top-level product abstraction.

## 3. Architectural Model

The primary abstraction is:

`Application Intent → Identity/Tenant → Capability → Policy → Admission → Placement → Execution → State → Events → Reliability → Observability → Governance`

This is a logical system model, not a worker-per-stage deployment model.

The architecture is organized into logical planes:

- Application Plane
- Gateway Plane
- Identity/Tenant Plane
- Execution Plane
- Write Plane
- Admission/Flow-Control Plane
- Data Plane
- Event Plane
- Reliability Plane
- Control Plane
- Governance Plane
- Observability Plane
- AI Plane
- Management Plane

## 4. Deployment Baseline

The current deployment baseline remains six Workers:

- W01 Gateway
- W02 Execution
- W03 Write
- W04 Data Plane
- W05 Reliability
- W06 Control Plane

New workers require explicit architectural justification, ownership, failure-domain analysis and operational cost analysis. They MUST NOT be created merely to represent a logical plane.

## 5. Hardened 3.2 Architecture Contracts

The forward architecture requires explicit contracts for:

- Authority / Source of Truth
- Control-Plane Bootstrap / Recovery
- Identity / Tenant Isolation
- SLO / Error Budget / RPO / RTO
- Failure Domains
- Admission / Backpressure
- Capability Registry
- Consistency
- Cache
- Hot-Key / Hot-Shard Protection
- Desired State / Actual State / Reconciliation
- Idempotency
- Event / Outbox / Delivery / Replay
- Provider Constraints
- Capacity / Cost
- Migration / Cutover / Rollback
- Schema Evolution
- Deployment Safety
- Disaster Recovery / Restore
- Security / Threat Model
- Observability / Causality
- Data Residency / Locality
- Resource Retirement
- AI Agent Sandbox
- Failure Injection / Chaos Verification

These are contracts, not a requirement for additional workers.

## 6. Mandatory Architecture Invariants

1. Every mutable infrastructure object has exactly one authoritative writer.
2. Every authoritative object has explicit version/generation/epoch semantics.
3. Every control-plane dependency used by request execution has defined stale-data and fail-open/fail-closed behavior.
4. Every tenant-scoped operation has explicit isolation and authorization semantics.
5. Every externally retryable mutation has an idempotency contract.
6. Every event consumer is idempotent or has an explicitly stronger delivery guarantee.
7. Every production mutation has health predicates, blast-radius limits and rollback/recovery criteria.
8. Every destructive operation has restore/recovery evidence.
9. Every production capability has measurable reliability objectives.
10. Every reconciliation loop has convergence and anti-oscillation rules.
11. Every provider binding declares material runtime and cost constraints.
12. AI cannot bypass deterministic governance or obtain unrestricted mutation authority.
13. Historical architecture cannot silently become active architecture.
14. No new worker is justified solely by logical decomposition.

## 7. AI Boundary

AI and prediction MUST NOT become a synchronous availability dependency of Open Core.

AI autonomy levels are:

`L0 Observe → L1 Recommend → L2 Simulate → L3 Auto-Execute low-risk changes → L4 bounded Autonomous operation.`

Every mutation follows:

`Agent → Proposal → Policy → Change Manifest → Diff Scope Gate → Approval/Auto-Approval → Execution → Verification → Audit.`

Agents operate under capability scope, tenant/resource scope, action allowlists, blast-radius limits, time/budget limits and explicit recovery paths.

## 8. Super Management Center

The Super Management Center is the management/control surface for the substrate. It is not a new execution plane.

Primary views include Command Center, Global Infrastructure, Application Fleet, Live Topology, Data Fabric, Reliability, Capacity, Cost Intelligence, AI Agent Fleet, Governance, Security, Deployments, Migrations, Audit and Developer/Operator Center.

Every displayed operational fact must expose or derive from source authority, freshness/version and timestamp; estimated values must identify uncertainty.

Initial visual direction: dark, high-density green/purple AI infrastructure command center. Visual state MUST be sourced from real management APIs/control-plane state and MUST NOT invent operational truth.

## 9. Open Core / Advanced / Frontier

Open Core remains independently operable and deterministic.

Advanced provides mature high-end capabilities without becoming a Core runtime dependency.

Frontier includes experimental, predictive and AI-assisted capabilities and remains bounded, auditable and non-critical to Core availability.

## 10. Governance

Architecture-first, contract-first, module-first, verification-first and controlled evolution remain mandatory.

Machine-enforced governance includes:

- Capability Registry
- ADR Registry
- Ownership Map
- Dependency DAG
- Binding Ownership
- Change Manifest
- Diff Scope Gate
- Authority Registry
- Policy Registry
- Recovery Classification
- module contracts
- compatibility rules
- release classification
- historical isolation rules

Historical 1.x/2.x artifacts are immutable reference material and MUST NOT silently affect 3.2 development.

## 11. Development Order

Architecture hardening → machine governance → core capability/consistency/identity contracts → runtime safety contracts → state/change control → W01-W06 integration → Management API → Super Management Center → DR/chaos verification → AI agents → advanced adaptive optimization.

No feature is complete merely because code exists or tests pass. Contracted, implemented, verified, production-ready and active remain distinct states.

## 12. Current Priority

The immediate priority is formal architecture review and closure of the hardened 3.2 contract.

The main contract remains `DRAFT FOR ARCHITECTURE REVIEW — HARDENED`.

Implementation MUST NOT outrun the reviewed architecture. New 3.2 production code is blocked until the P0/P1 architecture gates are explicitly satisfied according to the main contract.

## 13. Non-Goals

This document does not authorize implementation of any feature by itself. The 3.2 architecture contract must pass review before implementation begins for new 3.2 capabilities.

The following remain explicitly out of scope without new architectural evidence:

- uncontrolled multi-cloud implementation
- arbitrary extra workers
- AI governance bypass
- autonomous destructive migration
- speculative universal distributed transactions
- replacing Cloudflare primitives without demonstrated need
- speculative broker replacement
- unbounded automatic global rebalance
- UI-first fake operational state
