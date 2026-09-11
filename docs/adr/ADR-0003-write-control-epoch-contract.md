# ADR-0003: W03 Write Path Control-Epoch Validation

- Status: ACCEPTED
- Date: 2026-09-12
- Scope: Foundation Governance / Write-Control Boundary

## Context

The current W03 Write Fabric validates the execution epoch through the W04 Control Plane before executing a mutation. This is an intentional runtime policy check, not a private implementation import.

The initial R1 machine registries incorrectly treated W03 as having no service dependency on W04, which conflicted with the existing W03 runtime contract.

## Decision

1. W03 may use a single explicit service binding to W04 for control-epoch validation.
2. The dependency is a contract-level service dependency: `write -> control`.
3. W03 MUST NOT import W04 private implementation code.
4. The binding exists only for the control-epoch contract and is not a general-purpose control-plane channel.
5. Any expansion of this dependency requires a new contract/ADR review.

## Consequences

The machine dependency DAG and binding registry must model this existing contract. This does not create a new Worker and does not change W01-W04 deployment topology.

## Verification

CI MUST enforce the declared W03 -> W04 service binding and continue to reject W03 private imports of W04 implementation paths.
