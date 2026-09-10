# P11 — Control Plane + LKG Fencing v1.0

**Status:** ACTIVE / EXECUTABLE / LOCKED
**phaseId:** P11
**taskId:** P11.1
**contractId:** D1F-3.0-MASTER-v1.0
**architectureId:** D1F-3.0-ARCH-v1.0
**implementationOwner:** W04 Control Plane
**verificationId:** P11.1-GATE-v1.0

## Objective

Implement the generic W04 control boundary for versioned control snapshots, placement metadata, capacity policy, publication, recovery, LKG selection, and control-epoch fencing.

## Allowed files

```text
workers/v2/W04-Control-Plane/**
docs/phases/P11-CONTROL-PLANE-LKG-FENCING-v1.0.md
docs/phases/evidence/P11.1-EVIDENCE.md
.github/workflows/w04-control-plane.yml
```

No W01-W03 source changes are permitted in P11.1.

## Forbidden

```text
business/domain semantics
new Worker / queue / Durable Object
replication protocol
cross-shard transaction
SQL topology in public API
physical D1 IDs in public API
unbounded retry/fan-out
executable extension metadata
silent stale-route authorization
```

## Exact invariants

1. Published snapshots are immutable.
2. `configVersion` and `epoch` advance monotonically.
3. Publication validates time window, source, payload size, validation status, and revocation state before persistence.
4. Snapshot insertion and active-head advancement are one D1 batch operation.
5. LKG requires `VALIDATED`, unrevoked, activated, and unexpired state.
6. Write epoch admission requires exact active epoch plus valid non-revoked non-expired snapshot.
7. Revocation is persistent and monotonic.
8. Control-plane absence fails closed.
9. Public APIs never expose physical topology.
10. Resource bounds are finite and testable.

## Failure matrix

| Condition | Result |
|---|---|
| malformed snapshot | `INVALID_SNAPSHOT` |
| stale config version | `STALE_CONTROL_VERSION` |
| stale epoch | `STALE_CONTROL_EPOCH` |
| expired/no active LKG | `NO_VALID_LKG` |
| revoked epoch | `REVOKED_CONTROL_EPOCH` |
| inactive epoch | `CONTROL_EPOCH_NOT_ACTIVE` |
| no D1 binding | `CONTROL_PLANE_NOT_CONFIGURED` |
| unsupported route | `NOT_FOUND` |

## Security cases

Tenant/business meaning must not enter W04. Inputs are untrusted. Payload is data only. Public responses must not expose database IDs, shard IDs, SQL topology, or internal Worker graph.

## Test command

```text
npm ci
npm run typecheck
npm test
npm run dry-run
```

## Acceptance thresholds

All commands PASS; deterministic negative/security/resource tests PASS; exact pushed SHA verified; scope and architecture checks PASS; independent GPT review PASS; evidence committed.

## Stop condition

On PASS: STOP. Do not begin P12 automatically. On failure: fix only the identified contract-preserving defect, rerun all required tests, push, and re-review.
