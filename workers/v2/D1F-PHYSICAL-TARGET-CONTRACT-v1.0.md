# D1-Fabric Physical Target Resolution Contract v1.0

## 1. Purpose

This contract defines the execution boundary between an authoritative logical-to-physical placement decision and the concrete D1 database target used by a Worker execution attempt.

It closes one explicit architecture gap: `physicalShardId` is a placement identity, not a D1 binding. A request MUST NOT infer, invent, or directly supply the concrete D1 target.

This contract does not introduce a new Worker. It defines a cross-worker execution contract consumed by W03 and produced from authoritative control-plane state plus deployment-time bindings.

## 2. Ownership

### W06 owns

- logical shard identity;
- physical shard identity;
- topology version;
- placement lifecycle and admission state;
- authoritative placement decision.

### W03 owns

- concrete execution-target resolution for an admitted `physicalShardId`;
- validation that the resolved target is present in the Worker deployment;
- execution against exactly one resolved D1 target for a single-target operation;
- fail-closed behavior when target resolution is unavailable or inconsistent.

### W04 owns

- execution epoch and write fencing.

### W05 owns

- retry, timeout, circuit, cancellation, and retry-budget policy while preserving the same target identity and version/fencing identities for every attempt.

## 3. Target identities

The following identifiers have independent semantics:

| Field | Owner | Meaning |
|---|---|---|
| `logicalDatabaseId` | W06 | Logical database namespace |
| `logicalShardId` | W06 | Logical shard selected by routing |
| `physicalShardId` | W06 | Physical shard identity selected by topology |
| `topologyVersion` | W06 | Exact placement snapshot used for the decision |
| `physicalTargetId` | Deployment/control configuration | Opaque concrete execution-target identity |
| `bindingName` | Worker deployment | Runtime D1 binding name for the concrete target |
| `executionEpoch` | W04 | Write-fencing generation |

`physicalShardId` MUST NOT be treated as a binding name or database ID.

## 4. Resolution contract

For each single-target execution attempt, resolution MUST be equivalent to:

`logicalDatabaseId + logicalShardId + topologyVersion + physicalShardId`

→ authoritative placement already selected by W06

→ `physicalTargetId`

→ exactly one deployed D1 binding

→ concrete D1 execution target.

The request payload MUST NOT contain an authoritative `database_id`, database name, or binding name. Any such caller-supplied execution-target field MUST be rejected rather than trusted.

## 5. Deployment binding model v1.0

Version 1.0 uses explicit Worker D1 bindings as the concrete execution substrate.

A physical target is executable only when all of the following are true:

1. its `physicalTargetId` is present in the authoritative deployment target catalog;
2. the catalog maps it to exactly one Worker D1 binding;
3. the referenced binding exists in the deployed Worker environment;
4. the target is marked admitted for execution;
5. the target mapping is compatible with the exact `topologyVersion` selected by W06.

A Worker MUST NOT construct a D1 target from a string, hash, ordinal, database name, or fallback convention.

Version 1.0 does not claim arbitrary runtime creation of new D1 bindings. Adding a new concrete D1 binding is an explicit deployment/configuration operation and MUST pass the target-catalog validation gate before the corresponding topology version is admitted.

### 5.1 Deployment target manifest

The W03 deployment target manifest is a declarative deployment-time attestation input. For every concrete target it records:

- `physicalTargetId`;
- `bindingName`;
- `databaseName`;
- `databaseId`.

The manifest MUST agree with `wrangler.toml` for binding name, database name, and database ID. A physical target or database ID MUST NOT be duplicated within the manifest.

Repository CI MAY use placeholder database IDs only in non-strict validation. Any production attestation MUST reject placeholders.

A production deployment MUST additionally compare the manifest database IDs against the current Cloudflare D1 inventory. A target is not production-attested merely because the repository files agree with each other.

## 6. Fail-closed rules

Target resolution MUST fail closed on:

- missing `physicalShardId`;
- missing `physicalTargetId`;
- unknown physical target;
- multiple target mappings for one physical shard;
- missing Worker binding;
- binding mapped to the wrong target;
- target not admitted;
- topology version mismatch;
- conflicting deployment catalog;
- malformed target metadata;
- caller-supplied target override.

No failure path may fall back to a default D1 binding.

## 7. Version and migration rules

1. A target mapping is evaluated against one explicit `topologyVersion`.
2. Retry attempts MUST preserve the same `physicalShardId`, `physicalTargetId`, `topologyVersion`, and `executionEpoch` from the admitted plan.
3. A retry MUST NOT resolve a different target merely because a newer topology was published after the request was admitted.
4. Moving a physical shard to another concrete D1 target requires an explicit new topology publication and, for writes, a corresponding execution-epoch fencing decision.
5. A request MUST NOT be upgraded in-place from old target to new target. Replanning creates a new `planId`.
6. During cutover, the old target MUST NOT remain an admitted write target once its execution epoch is fenced.

## 8. Single-target safety

W03 v1.0 executes one concrete D1 mutation target per write attempt.

A write MUST NOT:

- fan out to multiple D1 targets;
- write both old and new targets;
- select a target independently of the W06 placement result;
- silently retry against another physical target.

Cross-target transactions and dual-write semantics are outside this contract.

## 9. Required execution response

A successful execution response MUST identify:

- `requestId`;
- `planId`;
- `logicalDatabaseId`;
- `logicalShardId`;
- `physicalShardId`;
- `physicalTargetId`;
- `topologyVersion`;
- `executionEpoch`;
- execution status;
- bounded accounting.

The response MUST NOT expose secrets or internal binding credentials.

## 10. Observability and diagnostics

Target-resolution failures MUST be distinguishable from D1 mutation failures.

Minimum typed error classes:

- `PHYSICAL_TARGET_REQUIRED`
- `PHYSICAL_TARGET_UNKNOWN`
- `PHYSICAL_TARGET_CONFLICT`
- `PHYSICAL_TARGET_BINDING_MISSING`
- `PHYSICAL_TARGET_NOT_ADMITTED`
- `PHYSICAL_TARGET_VERSION_MISMATCH`
- `PHYSICAL_TARGET_OVERRIDE_FORBIDDEN`

Errors MUST be safe to return to callers and MUST NOT expose D1 credentials or secret configuration.

## 11. Acceptance tests

The implementation is not PASS until tests prove:

1. valid `physicalShardId` resolves to exactly one deployed D1 binding;
2. unknown target fails closed;
3. missing binding fails closed;
4. conflicting target mappings fail closed;
5. caller-supplied binding/database override is rejected;
6. old topology never silently resolves to a newer target;
7. retry preserves the same target/version/epoch identities;
8. cutover fences the old writer before the new topology is admitted for writes;
9. no execution path can select a default/fallback D1;
10. W01-W06 regression remains green;
11. `wrangler deploy --dry-run` passes for every affected Worker;
12. production deployment manifest agrees with Wrangler configuration;
13. production attestation proves manifest database IDs exist in the target Cloudflare account;
14. real Cloudflare D1 acceptance proves that two concrete bindings execute against two distinct databases without cross-target writes.

## 12. Production invariants

- placement identity is not execution binding identity;
- no caller-controlled physical target;
- no fabricated target;
- no fallback target;
- exactly one concrete target per single-target attempt;
- retries preserve target identity;
- topology changes require explicit versioning;
- writes respect W04 execution-epoch fencing;
- target resolution failures are fail-closed;
- W03 does not own placement or migration planning;
- no hidden dual-write behavior;
- no claim of dynamic D1 binding creation in v1.0;
- production deployment identity is externally attested against the Cloudflare D1 inventory.
