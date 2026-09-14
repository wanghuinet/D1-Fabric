# W06 Control Plane Contract v1.1

Status: FROZEN CONTRACT — IMPLEMENTATION MUST CONFORM

## 1. Scope and ownership

W06 is the control-plane authority for topology metadata, placement metadata publication, shard lifecycle, expansion, migration workflow, rebalance planning, checkpointing and control-state fencing.

W06 MUST NOT own request routing policy, SQL execution, retry policy, timeout policy, circuit breaking or business-domain data.

## 2. Canonical identities

### 2.1 shardMapVersion

`shardMapVersion` identifies one immutable published routing topology. It is the only version used to identify routable shard placement.

`topologyVersion` MUST NOT be used as a synonym in new W06 v1.1 contracts.

### 2.2 controlEpoch

`controlEpoch` identifies the control-plane authority generation used to fence stale workers, workflows and mutations.

`shardMapVersion` and `controlEpoch` are independent dimensions and MUST NOT be conflated.

## 3. Canonical shard metadata

Every published shard record MUST contain:

- `logicalDatabaseId`
- `logicalShardId`
- `physicalShardId`
- `shardMapVersion`
- `shardStatus`
- `keySpace.lowerInclusive`
- `keySpace.upperExclusive`
- `controlEpoch`
- `capacityState`
- `createdAt`
- `updatedAt`

All records in one published snapshot MUST belong to exactly one logical database, exactly one shardMapVersion and one authoritative control epoch.

Partial metadata MUST never be published.

## 4. Canonical shard lifecycle

Shard lifecycle is independent from migration workflow.

Legal lifecycle states:

`REGISTERED → VALIDATING → ACTIVE → SPLITTING → DRAINING → RETIRED`

Only `ACTIVE` shards in a published shardMapVersion are normally routable.

`RETIRED` is terminal. No transition out of `RETIRED` is legal.

`MIGRATING` is NOT a shard lifecycle state; migration is represented by a separate workflow.

## 5. Canonical keyspace

Keyspace uses half-open intervals:

`[lowerInclusive, upperExclusive)`

The following are mandatory:

- `lowerInclusive < upperExclusive`;
- no overlap between sibling ranges;
- no gaps in a published logical shard coverage set;
- child union MUST equal the parent range during a split;
- pairwise child intersections MUST be empty;
- published coverage MUST be deterministic and complete.

A keyspace validation failure is a hard control-plane failure.

## 6. Canonical TargetShardLocation

A routing result MUST contain:

- `logicalDatabaseId`
- `logicalShardId`
- `physicalShardId`
- `shardMapVersion`
- `shardStatus`
- `keySpace`
- `controlEpoch`

A caller MUST NOT supply authoritative physical placement metadata as an override.

## 7. Placement API

The canonical placement request is:

```json
{
  "logicalDatabaseId": "...",
  "logicalShardKey": "...",
  "shardMapVersion": 42
}
```

The canonical operation is conceptually:

`resolve(logicalDatabaseId, logicalShardKey, shardMapVersion) → TargetShardLocation`

The resolver MUST read authoritative published metadata. It MUST reject missing, stale, retired, ambiguous, cross-database or structurally invalid placement.

The resolver MUST NOT silently upgrade a requested version to another version.

## 8. Published-version lifecycle

Routing publication is distinct from registration.

A candidate routing version progresses through:

`PREPARED → VALIDATED → APPROVED → PUBLISHED → SUPERSEDED`

Only `PUBLISHED` versions are routable.

Publishing MUST use compare-and-set protection against the current published version and MUST validate logical database identity, candidate version, control epoch, metadata integrity and keyspace coverage before publication.

Older versions MUST NOT be published over a newer version unless a separately contracted rollback operation explicitly authorizes it.

## 9. Migration workflow

Migration is a control workflow, not a shard lifecycle state.

Canonical workflow:

`PREPARED → COPYING → COPIED → CHECKSUMMING → RECONCILING → VERIFIED → APPROVED → PUBLISHED → CUTOVER → DRAINING → RETIRED → CLEANUP`

A migration workflow MUST contain at least:

- `workflowId`
- `taskId`
- `attempt`
- `controlEpoch`
- `logicalDatabaseId`
- source and target shard identities
- source and target shardMapVersion
- checkpoint reference

Copy completion MUST NOT imply cutover readiness. Checksum, reconciliation, verification, approval and publication are mandatory control predicates.

## 10. Expansion

Expansion MUST be monotonic unless a separate shrink contract exists.

An expansion plan MUST identify source and target shardMapVersion, controlEpoch, existing ownership, proposed ownership and explicit keyspace split coverage.

Expansion MUST NOT create gaps, overlaps or implicit ownership changes.

## 11. Rebalance

Rebalance MUST operate against an explicit published shardMapVersion and controlEpoch.

Every ownership change MUST be explicit and deterministic. Hidden data movement or implicit ownership mutation is forbidden.

## 12. Control-state fencing

Every authoritative mutation MUST validate the expected controlEpoch.

A stale worker, workflow or recovery attempt MUST be rejected when its controlEpoch is older than the authoritative control generation.

A newer committed controlEpoch invalidates older mutation attempts.

## 13. Authoritative store

The authoritative control-plane store MUST provide:

- current published shardMapVersion;
- immutable published snapshots;
- atomic publication CAS;
- controlEpoch validation;
- logical database isolation;
- integrity validation before publication.

Cache, process-local state, dashboard projections and caller-supplied placement data are never authoritative.

## 14. Failure behavior

W06 MUST fail closed on:

- missing or malformed metadata;
- cross-database metadata;
- stale shardMapVersion;
- stale controlEpoch;
- ambiguous placement;
- illegal lifecycle transition;
- invalid keyspace coverage;
- invalid migration transition;
- conflicting publication;
- incomplete recovery evidence.

No failure may fabricate placement or mutate an already-published snapshot.

## 15. Determinism

Identical authoritative input, shardMapVersion, controlEpoch and planning parameters MUST produce identical placement and planning results.

Plan identifiers MUST be derived from canonicalized inputs using the repository's canonical cryptographic fingerprint contract.

## 16. Verification gate

W06 v1.1 cannot PASS until all required contract, unit, negative, state-machine, migration, checkpoint, recovery, concurrency, integration, evidence and execution-probe jobs succeed against the exact governed commit SHA.

Required negative verification includes:

- cross-database placement;
- stale shardMapVersion;
- stale controlEpoch;
- retired shard routing;
- duplicate ownership;
- overlapping keyspace;
- keyspace gap;
- invalid split union;
- illegal lifecycle transition;
- illegal migration transition;
- concurrent publication;
- stale workflow mutation;
- missing required evidence;
- workflow run on a different commit SHA.

## 17. Compatibility rule

`W06-CONTROL-PLANE-CONTRACT-v1.0.md` remains historical reference only. New implementation, tests and governance MUST target v1.1. Compatibility aliases MUST NOT reintroduce semantic ambiguity between topologyVersion and shardMapVersion.
