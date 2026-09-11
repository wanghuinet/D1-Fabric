# ADR-0001 — Current Worker Topology

- Status: APPROVED
- Owner: project-owner
- Date: 2026-09-11
- Supersedes: none
- Superseded by: none

## Decision

The current independently deployable D1-Fabric Workers are exactly:

- W01 Fabric Gateway
- W02 Execution Fabric
- W03 Write Fabric
- W04 Control Plane

Reliability and Placement/Migration are capability domains hosted through explicit modules/contracts within W01-W04 at the current foundation baseline.

W05 and W06 are reserved labels only. They MUST NOT become independently deployable Workers without a new approved topology ADR supported by evidence of independent deployment, scaling, security or failure-isolation benefit.

## Rationale

A capability boundary is not automatically a deployment boundary. The foundation optimizes for high cohesion, low coupling and minimum independently operated runtime components.

## Impact

Any change to Worker topology affects architecture, deployment, bindings, failure isolation, contracts and cost. Such a change requires a new ADR and synchronized governance registry updates.

## Rollback

Rollback of a topology experiment MUST restore the W01-W04 baseline and invalidate any unapproved W05/W06 deployment configuration.
