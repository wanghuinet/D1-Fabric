# D1-Fabric 3.0 — P05 Routing + Placement v1.0

**Status:** ACTIVE / EXECUTABLE / LOCKED
**phaseId:** P05
**contractId:** D1F-3.0-MASTER-v1.0
**architectureId:** D1F-3.0-ARCH-v1.0
**implementationOwner:** GPT

## Objective

Resolve a compiled execution plan to an admissible logical routing target and an immutable placement decision without executing business logic or storage work.

## Ownership

- W02 owns deterministic routing from operation routing key + routing map.
- W04 owns authoritative control-plane placement snapshots and epoch/LKG fencing.
- W03 owns write execution only; it does not own routing decisions.
- W01 remains admission-only.

## Allowed files

```text
workers/v2/W02-Execution-Fabric/**
workers/v2/W04-Control-Plane/**
docs/phases/P05-ROUTING-PLACEMENT-v1.0.md
docs/phases/evidence/P05.*-EVIDENCE.md
```

## Forbidden

```text
W01 changes
D1 execution
SQL execution
business-domain semantics
cache implementation
retry implementation
idempotency state
physical D1 access from W02
implicit fallback to a different routing epoch
unbounded fan-out
Promise.all(N) scheduling
new Worker/runtime primitive
```

## Routing invariants

1. Routing is deterministic for identical `(tenant, routingKey, mapVersion)`.
2. Tenant isolation is mandatory; tenant context cannot be discarded.
3. A routing result contains only contract-approved logical identifiers.
4. Routing never invents a target when the map is missing, invalid, retired, or fenced.
5. Fan-out is explicit and bounded by the execution budget.
6. Routing does not execute D1 or SQL.

## Placement invariants

1. Placement is derived only from an authoritative control snapshot.
2. Every execution captures exactly one immutable `epoch`.
3. Valid placement requires validated snapshot, admissible epoch, and `now < expiryTime`.
4. Revoked, expired, retired, or incompatible snapshots fail closed.
5. LKG may only be used when the Master Contract H05 conditions are satisfied.
6. Physical identifiers are internal and never returned by public W01 responses.

## Failure matrix

| Case | Expected |
|---|---|
| missing routing key | INVALID_ROUTING |
| invalid routing map | ROUTING_MAP_INVALID |
| unknown logical target | ROUTING_TARGET_NOT_FOUND |
| fanout over budget | BUDGET_EXCEEDED |
| missing control snapshot | CONTROL_SNAPSHOT_UNAVAILABLE |
| expired snapshot | CONTROL_SNAPSHOT_EXPIRED |
| revoked/fenced epoch | CONTROL_EPOCH_FENCED |
| incompatible epoch | CONTROL_EPOCH_INCOMPATIBLE |
| valid routing + placement | ROUTED |

## Security/resource rules

- Never accept caller-supplied physical database identifiers as authority.
- Never downgrade tenant/principal context during routing.
- Never route across an unvalidated control epoch.
- No storage statement is permitted in P05 routing/placement.
- No retry is permitted merely because routing or placement failed.

## Tests

```text
npm ci
npm run typecheck
npm test
npm run dry-run
```

## Acceptance

```text
100% P05 scoped tests PASS
0 D1 statements
0 SQL execution
0 business semantics
0 unbounded fan-out
0 stale/expired/fenced placement acceptance
0 cross-tenant routing
exact GitHub SHA recorded
reproducible test + dry-run evidence
```

## Stop condition

P05 stops after routing/placement evidence is complete. Execution, cache, retry, idempotency, write, and LKG recovery behavior beyond the placement admission boundary belong to their later contracts.
