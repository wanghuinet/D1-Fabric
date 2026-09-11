# D1-Fabric 3.2 Registry Authority Matrix

Version: 1.0  
Status: DRAFT — CANONICAL REGISTRY GOVERNANCE BASELINE  
Scope: 3.2 machine governance and final architecture admission  
Authority: This document defines the canonical 16-registry inventory and cross-contract ownership. It is subordinate only to the 3.2 Infrastructure Architecture Contract and may be changed only by governed ADR + Change Manifest.

## 0. Decision

D1-Fabric 3.2 SHALL use exactly the following 16 machine-governed registries as its canonical governance surface.

No other registry may become authoritative by implication. A new authoritative registry requires a governed architecture transition that updates this matrix, the relevant schemas, CI gates and evidence contracts in the same change.

This registry governance layer does **not** change the W01–W06 deployment topology.

## 1. Canonical Registry Set

| # | Registry | Stable authority | Primary owner | Schema authority | CI gate | Evidence requirement |
|---|---|---|---|---|---|---|
| 01 | Capability Registry | 3.2 governance | W06-Control | `capabilities/schema.json` | registry-schema + capability-resolution | current commit + generation + verification |
| 02 | Authority Registry | 3.2 governance | W06-Control | `authority/schema.json` | authority | current commit + generation + writer uniqueness |
| 03 | ADR Registry | 3.2 governance | Architecture Governance | `adrs/schema.json` | adr-resolution | current commit + generation + transition evidence |
| 04 | Ownership Registry | 3.2 governance | Architecture Governance | `ownership/schema.json` | ownership | current commit + generation + owner uniqueness |
| 05 | Dependency DAG | 3.2 governance | Architecture Governance | `dependencies/schema.json` | dependency-dag | current commit + graph hash |
| 06 | Binding Registry | W06-Control authority | W06-Control | `bindings/schema.json` | binding-authority | current generation + authority proof |
| 07 | Policy Registry | 3.2 governance | Architecture Governance | `policies/schema.json` | policy-compatibility | current policy version + compatibility evidence |
| 08 | Failure-Domain Registry | 3.2 governance | W05-Reliability + Architecture Governance | `failure-domains/schema.json` | failure-domain | current graph + fault evidence |
| 09 | Change Manifest Registry | 3.2 governance | Change owner declared in manifest | `changes/schema.json` | change-manifest | change_id + commit + verifier |
| 10 | Diff Scope Registry | 3.2 governance | Architecture Governance | `diff-scope/schema.json` | diff-scope | base/head diff + deterministic decision |
| 11 | Recovery Classification Registry | 3.2 governance | W05-Reliability | `recovery/schema.json` | recovery | recovery class + execution evidence |
| 12 | Compatibility Matrix | 3.2 governance | Architecture Governance | `compatibility/schema.json` | contract-compatibility | old/new versions + rollout proof |
| 13 | Provider Constraint Registry | W06-Control authority | W06-Control | `providers/schema.json` | provider-constraints | provider version + constraint proof |
| 14 | Release Classification Registry | 3.2 governance | Release owner | `releases/schema.json` | release-decision | release evidence + expiry |
| 15 | Historical Isolation Registry | 3.2 governance | Architecture Governance | `historical-isolation/schema.json` | historical-isolation | isolation scan + forbidden-edge proof |
| 16 | Evidence Registry | 3.2 governance | Architecture Governance | `evidence/schema.json` | evidence-freshness | commit + registry generation + policy + verifier |

## 2. Authority Rules

1. Every registry has exactly one machine-recognized authority. Supporting owners do not gain mutation authority.
2. W06 is the runtime infrastructure control authority for provider bindings and authoritative control metadata. It does not become the authority for every governance registry merely because it is the control plane.
3. Architecture Governance owns cross-cutting governance decisions and validation policy; it does not directly mutate runtime state.
4. Registry content is authoritative only after schema validation, reference resolution, owner resolution and the applicable CI gate passes.
5. Generated dashboards, caches, projections and AI summaries are never authoritative.
6. Historical material is never an active registry authority.

## 3. Registry-to-Worker Mapping

Logical responsibilities are mapped to the fixed W01–W06 deployment baseline as follows:

- W01 Gateway: consumes identity, policy, admission and capability decisions; no registry authority for topology or placement.
- W02 Execution: consumes capability, dependency, policy and placement decisions; no global governance authority.
- W03 Write: owns write execution/outbox boundary; no topology or binding authority.
- W04 Data: owns data access adapters and D1/R2/KV execution; no authoritative provider-binding mutation.
- W05 Reliability: owns reliability/recovery policy primitives and failure handling.
- W06 Control: owns topology, placement, shard metadata, resource binding authority and control-state generation.

No logical plane is automatically a new Worker.

## 4. Schema Rules

Each registry SHALL have:

- a machine-readable schema;
- a stable version;
- required identity/owner fields;
- reference-resolution rules;
- lifecycle rules where applicable;
- deterministic validation output;
- an evidence contract;
- explicit authority and mutation policy.

Missing schema = FAIL for a registry claimed as authoritative.

## 5. CI Gate Ownership

CI SHALL evaluate the registries in this order before release admission:

```text
Historical Isolation
→ Registry Schema
→ Authority
→ Ownership
→ ADR Resolution
→ Dependency DAG
→ Binding Authority
→ Change Manifest
→ Diff Scope
→ Policy Compatibility
→ Failure Domain
→ Contract Compatibility
→ Behavioral Tests
→ Recovery
→ Provider Constraints
→ Evidence Freshness
→ Release Decision
```

A downstream gate SHALL NOT emit PASS when any required upstream gate is FAIL.

## 6. Evidence Rules

Every mandatory registry gate SHALL emit evidence containing at least:

- evidence_id
- change_id
- commit
- registry_generation
- policy_version
- environment
- probe
- result
- started_at
- finished_at
- verifier
- expires_at

Evidence MUST be tied to the exact evaluated commit and current registry generation. Replayed, expired, forged or policy-incompatible evidence is invalid.

## 7. Change Rule

Adding, removing, renaming, changing authority, changing owner, changing schema authority or changing CI ownership for a registry is an architecture-affecting change.

It requires:

- ADR transition;
- Change Manifest;
- exact diff scope;
- compatibility assessment;
- updated schemas;
- updated CI gate mapping;
- fresh evidence;
- review of affected P0/P1 gates.

## 8. Final Architecture Relationship

P0-01 through P0-10 do not replace the 16 registries. They consume registry state and evidence to determine whether the W01–W06 architecture is production-admissible.

The intended dependency is:

`16 Registries → Machine Gates → G3 Adversarial Acceptance → G4 Evidence/Recovery → P0-01..P0-10 → Development Admission`

## 9. Non-Goals

This matrix does not authorize:

- additional Workers;
- runtime feature expansion;
- multi-cloud abstraction;
- provider replacement;
- autonomous architectural redesign.

## 10. Final Rule

The 16-registry set, its authority model, owner model, schemas, CI gates and evidence relationships together form the single machine-governed registry baseline for D1-Fabric 3.2.
