# W06 Control Plane Contract v1.0

## 1. Ownership

W06 is the control-plane boundary for topology and shard lifecycle management.

W06 owns:

- placement decisions;
- topology representation and validation;
- logical-to-physical shard metadata;
- expansion planning and admission;
- migration planning and state transitions;
- rebalance planning and bounded execution intent.

W06 does not own request routing, SQL execution, application writes, retry policy, timeout policy, circuit breaking, or business-domain data.

## 2. Control-plane invariants

1. Control-plane state is versioned and immutable once published.
2. Every topology/placement decision is evaluated against one explicit metadata version.
3. Unknown, malformed, stale, or conflicting metadata fails closed.
4. A topology version must never silently mix metadata from different versions.
5. Physical shard identifiers must be unique within a logical database.
6. A shard lifecycle transition must follow the declared state machine; illegal transitions are rejected.
7. No migration or rebalance operation may silently drop, duplicate, or overwrite ownership metadata.
8. Expansion is monotonic: capacity may increase, but an expansion plan never implicitly shrinks the topology.
9. Planning is deterministic for identical inputs and metadata versions.
10. Control-plane operations are bounded and must not contain unbounded loops.

## 3. Placement

Placement maps a logical shard to exactly one active physical target for a published topology version.

Placement must validate:

- logical database identity;
- logical shard identity;
- physical shard identity;
- topology version;
- lifecycle state.

Placement must reject ambiguous ownership and must never invent a target when metadata is missing.

## 4. Topology

A topology describes the complete set of physical shards and their lifecycle state for a logical database at one version.

Required lifecycle states:

- `PROVISIONING`
- `ACTIVE`
- `DRAINING`
- `MIGRATING`
- `RETIRED`

Only `ACTIVE` shards may receive normal placement for newly admitted work.

Required legal transitions:

- `PROVISIONING -> ACTIVE`
- `ACTIVE -> DRAINING`
- `DRAINING -> MIGRATING`
- `MIGRATING -> ACTIVE`
- `MIGRATING -> RETIRED`

All other transitions are rejected unless a future contract explicitly adds them.

## 5. Shard metadata

Shard metadata is the authoritative control-plane description of a physical shard and its logical ownership.

Minimum metadata:

- logical database ID;
- logical shard ID;
- physical shard ID;
- topology version;
- lifecycle state;
- capacity/admission state;
- creation timestamp;
- last transition timestamp.

Metadata must be validated before publication. Partial metadata is never published. All shard records in a published snapshot must belong to the same logical database and topology version.

## 6. Expansion

Expansion creates additional physical capacity without changing existing ownership implicitly.

An expansion plan must contain:

- source topology version;
- target topology version;
- existing shard set;
- proposed new shard set;
- explicit placement changes, if any;
- migration requirements;
- deterministic plan identifier.

Expansion must be idempotently re-plannable from the same source version.

## 7. Migration

Migration moves ownership through explicit, observable phases.

Minimum phases:

`PLANNED -> COPYING -> VERIFYING -> CUTOVER_READY -> CUTOVER -> COMPLETE`

Failure must not advance the migration phase.

Cutover is a control-plane state transition only; data-copy implementation remains outside W06 until separately contracted.

A migration plan must identify source ownership, target ownership, source topology version, target topology version, and a deterministic plan identifier.

## 8. Rebalance

Rebalance computes bounded ownership changes against a published topology version.

Rebalance must:

- preserve logical shard coverage;
- preserve unique physical ownership;
- produce deterministic output;
- expose all ownership changes explicitly;
- avoid hidden data movement;
- be safe to abandon before cutover.

W06 must not execute data movement as part of planning.

## 9. Publication and stale-state protection

A control-plane version may be published only after structural validation succeeds.

Readers must be able to identify the exact metadata version used for a decision.

A caller presenting a stale version must receive a typed stale-version result rather than silently being upgraded to another version.

## 10. Failure behavior

W06 fails closed on:

- missing metadata;
- malformed identifiers;
- duplicate physical ownership;
- invalid lifecycle transitions;
- stale/conflicting versions;
- incomplete expansion plans;
- incomplete migration plans;
- invalid rebalance output.

No control-plane failure may fabricate a placement or silently mutate published metadata.

## 11. Determinism

For identical logical database state, source topology version, input shard set, and planning parameters, W06 must produce identical:

- placement result;
- expansion plan;
- migration plan;
- rebalance plan;
- plan identifier.

## 12. Verification gate

W06 is not PASS until all of the following are green:

- contract tests;
- typecheck;
- deterministic planning tests;
- invalid-transition tests;
- stale-version tests;
- expansion safety tests;
- migration state-machine tests;
- rebalance invariant tests;
- dry-run deployment;
- W01-W05 regression;
- GitHub Actions.

## 13. Production invariants

- no ambiguous shard ownership;
- no silent metadata version mixing;
- no illegal lifecycle transition;
- no implicit topology shrink;
- no fabricated placement;
- no hidden data movement;
- no mutation of published versions;
- no unbounded planning loop;
- no business-domain logic inside W06.
