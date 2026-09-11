# ADR-0001 — Runtime Topology and Architecture Authority

- Status: ACCEPTED
- Date: 2026-09-12
- Scope: Foundation Governance / Runtime Topology
- Supersedes: none
- Superseded by: none

## Context

The foundation blueprint introduced W01-W06 as possible responsibility boundaries, while the active 3.0 engineering instructions define W01-W04 as the approved execution boundaries. Allowing both interpretations would permit an implementation agent to create or split Workers without an explicit architecture decision.

The repository therefore needs one current deployment topology and a separate concept for capability ownership.

## Decision

1. The current approved independently deployable Worker topology remains exactly:
   - W01 Fabric Gateway
   - W02 Execution Fabric
   - W03 Write Fabric
   - W04 Control Plane

2. Reliability and placement/migration remain first-class architectural capability domains, but they are **not independent Workers at this stage**:
   - Reliability capability domain: hosted through explicit contracts across W01-W04, with implementation placement decided per module and lifecycle boundary.
   - Placement/Migration capability domain: owned by the Control Plane boundary unless later evidence justifies a separate deployment boundary.

3. W05 and W06 MUST NOT be created, split, or deployed merely because the capability names exist.

4. A future Worker split requires a new ADR with evidence covering independent ownership, scaling, security, deployment lifecycle, failure isolation, and measurable operational benefit.

5. The authoritative hierarchy for the 3.2 foundation is:

```text
AGENTS.md
→ Foundation Blueprint / approved amendments
→ Open Core Architecture Contract
→ Function Catalog / Capability Registry
→ ADRs
→ Module / task contracts
→ implementation
```

6. No lower-level prompt, agent suggestion, implementation convenience, or test failure may silently change Worker topology.

## Rationale

This preserves the existing W01-W04 deployment boundary while preventing artificial Worker inflation. Reliability and placement/migration remain architectural capabilities and can be implemented without prematurely introducing network hops, deployment overhead, binding proliferation, or additional operational failure domains.

The decision is intentionally reversible: evidence can justify W05/W06 later without requiring the architecture to pretend they already exist.

## Consequences

### Positive

- One unambiguous current Worker topology.
- No speculative Workers.
- Capability ownership is separated from deployment boundaries.
- Existing 3.0 governance remains compatible.
- Future Worker extraction has an explicit evidence gate.

### Negative

- Reliability and placement/migration modules may initially share Worker deployment boundaries.
- Some future scaling isolation may require a later topology amendment.

## Required Synchronization

This ADR requires the following repository artifacts to use the same current topology:

- `AGENTS.md`
- `docs/D1-FABRIC-FOUNDATION-BLUEPRINT-AND-GOVERNANCE-REVIEW-v1.0.md`
- `docs/D1-FABRIC-OPEN-CORE-ARCHITECTURE-CONTRACT-v1.0.md`
- `docs/D1-FABRIC-3.1-FUNCTION-CATALOG.md`
- applicable roadmap and CI governance rules

## Verification

Foundation Governance CI MUST reject introduction of W05/W06 deployment directories or bindings unless an approved topology ADR exists.
