# ADR-0004 — Complete Foundation Capability Baseline

- Status: ACCEPTED
- Date: 2026-09-12
- Scope: Foundation capability planning and long-term architecture stability
- Supersedes: none
- Superseded by: none

## Context

D1-Fabric has accumulated capabilities across the 3.0 Master Contract, the 3.1 Function Catalog, the 3.2 foundation governance work and earlier advanced-feature planning. Without one consolidated target surface, future implementation can repeatedly rediscover missing capabilities and introduce avoidable architecture changes.

The project also needs a durable distinction between a capability being planned and a capability being authorized for immediate implementation.

## Decision

1. Adopt `docs/D1-FABRIC-COMPLETE-FOUNDATION-CAPABILITY-MAP-v1.0.md` as the complete planning baseline for the long-term D1-Fabric 1.0 capability surface.
2. The capability map is a planning authority only until the Foundation Freeze gate promotes its individual capabilities into the active machine registries and contracts.
3. The baseline consolidates current capabilities, previously planned capabilities, previously discussed advanced/moat capabilities, and generic production-grade infrastructure concerns relevant to D1-Fabric.
4. Capability parity is defined as coverage of relevant infrastructure concerns, not cloning another vendor's internal implementation.
5. The complete target surface must not cause automatic Worker proliferation. The current deployment topology remains W01-W04 unless a separate topology ADR proves an independent boundary is required.
6. Core contracts must be designed so that later implementation improvements, adapters and optimizations can be additive and backward-compatible wherever technically possible.
7. A major architecture/version change is permitted only when backward-compatible evolution is demonstrably insufficient and the existing release/ADR/migration/verification gates are satisfied.
8. No business-domain capability becomes Core merely because it appears in a competitor product. Application domains remain above the middleware boundary.

## Stable Architecture Invariants

The following are intended to remain stable across compatible evolution:

- W01-W04 deployment authority unless a topology ADR changes it;
- single logical owner for authoritative mutable state;
- deterministic routing semantics under a pinned routing-map version;
- contract versioning and breaking-change discipline;
- least-privilege binding ownership;
- acyclic dependency direction;
- Cloudflare-native-first implementation policy;
- bounded runtime and cost envelopes;
- machine-verifiable scope and release evidence;
- no autonomous architecture expansion by implementation agents.

## Capability Admission Rule

Before any capability moves from planning to implementation, the project must record:

- problem statement;
- classification;
- Cloudflare-native substrate assessment;
- implementation mode;
- owner and Worker/module boundary;
- dependency placement;
- data ownership;
- public contract impact;
- runtime and cost impact;
- security impact;
- verification plan;
- rollback/migration semantics;
- release/stage assignment.

## Implementation Boundary

This ADR does not authorize implementation of all mapped capabilities in one change. It authorizes the creation of a complete, reviewable target map so that later work is sequenced rather than invented ad hoc.

The current sequence remains:

```text
R0 PASS
  -> R1 governance closure
  -> Complete Foundation capability baseline / contract reconciliation
  -> R2 Contract + Runtime Enforcement
  -> R3 Reliability + Cost + Observability
  -> R4 Full Foundation CI
  -> R5 Foundation Freeze
  -> explicit user approval
  -> R6 capability implementation packets
```

Each R6 capability follows contract -> implementation -> tests -> architecture/scope review -> exact SHA -> independent review -> evidence -> stop.

## Consequences

### Positive

- Previously planned and advanced capabilities have one durable home.
- Missing-capability discovery is reduced during later implementation.
- Core boundaries can be frozen before large-scale implementation.
- Future evolution can focus on compatible additions and implementation improvements.
- Capability coverage can be compared systematically with mature distributed infrastructure without copying proprietary design.

### Negative

- The target map is larger than the currently implemented foundation.
- Some capabilities require separate contracts and substantial verification before production admission.
- The repository must keep planning state and implementation state synchronized.

## Verification

The Foundation Governance process must ensure that:

1. the complete capability map remains non-authoritative until explicitly promoted;
2. no implementation task can claim authorization solely from the map;
3. any promoted capability is represented in the applicable machine registries and contracts;
4. topology remains W01-W04 unless a separate approved topology ADR exists;
5. major-stage stop and explicit-user-approval rules remain intact.

## Rollback / Change Policy

Revising the capability baseline does not by itself require a major version. Changes that alter stable architecture, public semantics, ownership, or compatibility require the existing versioned ADR, migration and verification controls.
