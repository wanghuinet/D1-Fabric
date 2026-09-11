# D1-Fabric 3.2 Registry Schema Matrix

Version: 1.0  
Status: DRAFT — SCHEMA BASELINE  
Scope: canonical schema requirements for the 16 governance registries

## 1. Canonical Mapping

| Registry | Canonical path | Required minimum keys |
|---|---|---|
| Capability | `.governance/3.2/capabilities/` | id, version, status, owner, provider, consistency, dependencies, bindings, verification, recovery_class |
| Authority | `.governance/3.2/authority/` | object_id, object_type, authoritative_writer, authoritative_store, generation_source, read_authority, freshness_bound, recovery_source |
| ADR | `.governance/3.2/adrs/` | id, status, owner, scope, decision, invariants, supersedes, superseded_by, expiry, evidence_refs |
| Ownership | `.governance/3.2/ownership/` | object_id, object_type, primary_owner, supporting_owners, authority, status |
| Dependency | `.governance/3.2/dependencies/` | from, kind, via, criticality, bootstrap_required, recovery_required, stale_behavior, owner |
| Binding | `.governance/3.2/bindings/` | binding_id, resource_type, provider, authority, owner, mutable, generation_source, change_policy |
| Policy | `.governance/3.2/policies/` | policy_id, version, status, owner, invariants, compatibility, rollout, rollback, expiry |
| Failure Domain | `.governance/3.2/failure-domains/` | id, parent, scope, correlated_with, retry_scope, recovery_scope, blast_radius_limit, owner |
| Change Manifest | `.governance/3.2/changes/` | change_id, actor, target_environment, risk, owners, files, dependency_edges, authority_objects, policy_version, verification_plan, recovery_class, expiry |
| Diff Scope | `.governance/3.2/diff-scope/` | change_id, base_commit, head_commit, declared_files, actual_files, classifications, violations, decision |
| Recovery Classification | `.governance/3.2/recovery/` | recovery_id, class, owner, trigger, prerequisites, procedure, verification, rollback, expiry |
| Compatibility | `.governance/3.2/compatibility/` | artifact_id, from_version, to_version, mode, affected_scope, rollout, rollback, compatibility_result, owner |
| Provider Constraint | `.governance/3.2/providers/` | provider, resource_type, version, constraints, quota, timeout, cost_dimensions, recovery_limits, owner, effective_from |
| Release Classification | `.governance/3.2/releases/` | release_id, class, owner, scope, required_gates, evidence_refs, rollout, rollback, expiry |
| Historical Isolation | `.governance/3.2/historical-isolation/` | path/prefix, lifecycle, mutation_policy, runtime_policy, import_policy, migration_authority, owner |
| Evidence | `.governance/3.2/evidence/` | evidence_id, change_id, commit, registry_generation, policy_version, environment, probe, result, started_at, finished_at, verifier, expires_at |

## 2. Schema Invariants

All schemas SHALL reject duplicate stable identifiers, unresolved mandatory references, missing primary ownership, unknown lifecycle values, invalid timestamps and invalid references to historical active state.

The following cross-registry constraints are mandatory:

- Capability.owner resolves in Ownership.
- Capability.binding_refs resolve in Binding.
- Dependency.owner resolves in Ownership.
- Dependency.via resolves in Capability.
- Binding.authority resolves in Authority/Ownership.
- Change Manifest owners and authority_objects resolve.
- Evidence.change_id resolves to an evaluated Change Manifest.
- Evidence.commit equals the evaluated commit.
- Evidence.registry_generation equals the current generation.
- Evidence.policy_version equals the policy used for evaluation.
- Release required_gates resolve to declared gates and all mandatory evidence is current.

## 3. Compatibility Rule

Schema evolution is itself governed. A schema change MUST declare backward/forward compatibility, migration or retirement behavior in the Compatibility Matrix. Silent schema replacement is prohibited.

## 4. Failure Rule

A missing canonical schema, malformed registry entry or unresolved required reference is a hard governance failure. No registry may be promoted to authoritative state on a best-effort basis.
