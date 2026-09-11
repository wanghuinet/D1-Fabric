# D1-Fabric 3.2 Placement and Scale-Out Contract

Version: 1.0  
Status: DRAFT — ARCHITECTURE-ALIGNED POLICY BASELINE  
Scope: W04 Data + W06 Control placement, expansion, migration and rebalance

## 1. Purpose

This contract defines how D1-Fabric scales physical data resources without making physical D1 count an application-visible architectural dependency.

The contract deliberately does **not** prescribe a permanent database count or a mandatory fixed expansion sequence.

## 2. Architectural Invariant

The authoritative abstraction is:

`Logical Database → Virtual Shard/Slot → Placement → Physical Resource`

Application and normal request paths SHALL depend on logical identity and routing generation, not on a hard-coded physical D1 identifier.

Physical D1 count is deployment state, not architecture.

## 3. Bootstrap Profiles

D1-Fabric SHALL support multiple deployment profiles.

- CI/local: minimum resource profile sufficient for contract and routing tests.
- Development: multi-shard profile sufficient to exercise routing and migration.
- Staging: multi-resource profile sufficient to exercise rebalance, failure-domain and recovery scenarios.
- Production: capacity/SLO-driven profile.

No architecture gate may require a universal number such as 2, 8 or 9 physical D1 databases.

## 4. Expansion Policy

Expansion is policy-driven and controlled by W06.

Inputs MAY include:

- storage utilization;
- request throughput;
- write pressure;
- hot-key or hot-shard concentration;
- latency/SLO pressure;
- failure-domain constraints;
- migration cost;
- provider limits;
- capacity headroom;
- cost policy.

A 2× expansion factor MAY be the default capacity policy because it provides operational headroom, but `2×` is NOT an architectural invariant.

The system MAY select another target count when policy and safety checks justify it.

## 5. Scale-Out State Machine

A physical expansion SHALL follow a controlled lifecycle:

`Observe → Decide → Allocate → Register → Plan Placement → Migrate → Verify → Publish Generation → Cutover → Drain → Reconcile`

The operation MUST be idempotent and restartable.

## 6. Placement and Migration

Adding physical resources SHALL NOT require rehashing the entire logical namespace.

D1-Fabric SHOULD move only the virtual shards/slots required by the new placement plan. The routing generation SHALL identify the exact placement state used by readers and writers.

A migration SHALL NOT publish a new routing generation until required source/target verification passes.

## 7. Rebalance

Rebalance is distinct from expansion.

Expansion adds capacity; rebalance changes placement to satisfy capacity, hotspot, failure-domain or operational constraints.

Both operations use the same generation-safe placement publication mechanism.

## 8. Shrink

Automatic shrink is NOT part of the default bootstrap policy.

Any physical resource removal requires explicit safety validation covering data evacuation, routing generation, recovery state, failure-domain capacity and rollback. Shrink MUST NOT be inferred merely from low utilization.

## 9. Control-Plane Independence

W06 is the authority for desired placement, topology and control-state generation, but normal requests SHALL NOT require a synchronous W06 operation when a verified current or last-known-good placement generation is sufficient and policy permits continued operation.

Control-plane loss MUST result in a documented safe degraded behavior rather than uncontrolled routing mutation.

## 10. Governance Requirements

Any change to placement policy, expansion factor, migration state machine, routing generation semantics, failure-domain constraints or physical Worker topology is architecture-affecting and requires the applicable ADR, Change Manifest, Diff Scope and fresh evidence.

Changing a deployment profile without changing architectural invariants is configuration/deployment policy, not a new Worker or logical architecture layer.

## 11. Explicit Non-Goals

This contract does not:

- mandate 2, 8 or 9 D1 databases;
- mandate fixed `8 → 16 → 32 → 64` scaling;
- authorize additional Workers;
- introduce a new logical architecture plane;
- make W06 a synchronous dependency of every request;
- authorize autonomous schema or runtime redesign.

## 12. Final Rule

**Placement is architecture. Physical D1 count is deployment state. Expansion factor is policy. Routing generation is the safety boundary.**
