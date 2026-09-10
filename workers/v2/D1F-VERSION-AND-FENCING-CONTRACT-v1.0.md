# D1-Fabric Version and Fencing Contract v1.0

## 1. Purpose

This contract defines the version dimensions carried through the execution path. A version value MUST NOT be reused to represent another control concern.

## 2. Version identities

| Field | Owner | Meaning | Mutation rule |
|---|---|---|---|
| `contractVersion` | W02 / master contract | Wire and execution contract compatibility | Immutable for a released contract |
| `topologyVersion` | W06 | Logical-shard to physical-shard topology and placement snapshot | Monotonic, immutable after publication |
| `configVersion` | W04 | Runtime control configuration snapshot | Monotonic, immutable after publication |
| `executionEpoch` | W04 | Write-fencing generation | Monotonic; stale epochs MUST be rejected for writes |
| `requestId` | W01 | End-to-end request identity | Unique per admitted request |
| `planId` | W02 | Deterministic execution-plan identity | Stable for the compiled plan inputs |

## 3. Required invariants

1. A write MUST carry one explicit `executionEpoch` and MUST be checked by W04 before W03 mutation admission.
2. A routed operation MUST be evaluated against one explicit `topologyVersion`; the operation MUST NOT mix placement metadata from different topology versions.
3. `contractVersion`, `topologyVersion`, `configVersion`, and `executionEpoch` are independent dimensions. Equality or numeric comparison between different dimensions has no semantic meaning.
4. A stale `topologyVersion` MUST fail closed rather than silently resolving against the current topology.
5. A stale `executionEpoch` MUST fail closed before the business mutation reaches D1.
6. Migration/cutover MUST establish the new topology version before requests using that version are admitted.
7. A request MUST NOT be upgraded in-place from one topology version or execution epoch to another after mutation planning. Replanning creates a new plan identity.
8. `requestId` and `planId` are correlation identities, not fencing tokens.

## 4. Cross-worker boundary

The intended future execution envelope is:

`requestId -> planId -> contractVersion -> topologyVersion -> configVersion -> executionEpoch`

- W01 admits the request and preserves `requestId` / `deadlineAt`.
- W02 compiles the plan and binds the request to explicit topology/config/epoch inputs before execution is dispatched.
- W06 is authoritative for topology and placement intent.
- W04 is authoritative for runtime configuration and write fencing.
- W05 may retry only within the admitted reliability budget and MUST preserve the same plan/version/fencing identities for every physical attempt.
- W03 performs the final execution-epoch check immediately before D1 mutation admission.

## 5. Prohibited behavior

- Inferring topology from `logicalTargetId` alone.
- Treating the latest topology as valid for an older request without an explicit replan.
- Retrying with a different topology version or execution epoch under the same `planId`.
- Accepting caller-supplied topology metadata as authoritative when the authoritative W06 metadata store is available.
- Allowing a placement target marked `BLOCKED` to become an execution target.

## 6. Production gate

Before production readiness, W02 routing MUST consume an authoritative W06 placement result, W04 MUST validate the corresponding configuration/fencing state, and W03 MUST reject any write whose execution epoch is no longer admissible. These three checks form a single correctness chain; passing them independently is insufficient.
