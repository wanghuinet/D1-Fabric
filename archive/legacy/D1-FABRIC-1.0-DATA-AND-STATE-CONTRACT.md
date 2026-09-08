# D1-Fabric 1.0 Data and State Contract

**Status:** ARCHITECTURE BASELINE  
**Version:** 1.0  
**Authority:** Architecture Contract  

## 1. Purpose

This contract defines what state exists, who owns it, where it is persisted, how it is routed, how it changes, and how it is recovered.

Core law:

> **One state, one authoritative owner, one valid epoch, one deterministic route, one recoverable source of truth.**

## 2. State Classes

Every state MUST be classified as one of:

```text
AUTHORITATIVE
DERIVED
CACHE
EPHEMERAL
OBSERVATION
CONTROL
```

Only explicitly authoritative state may be the source of truth for mutable business state.

## 3. Single Authoritative Owner

Every mutable authoritative state MUST have exactly one logical owner at a valid routing epoch.

No hidden multi-owner mutation is permitted.

## 4. Logical Shards

A logical shard is an ownership unit.

Each shard MUST have a stable identity and lifecycle state.

Possible lifecycle states:

```text
CREATING
ACTIVE
SPLITTING
MERGING
MIGRATING
DRAINING
RETIRED
FAILED
```

## 5. Routing Key

Routing MUST derive from an explicit routing key.

The mapping must be deterministic:

```text
Route(routing_key, routing_epoch) → shard
```

The same key and epoch MUST resolve consistently.

## 6. Routing Epoch

Ownership changes MUST advance an epoch or equivalent fencing version.

A request carrying an obsolete epoch MUST NOT silently mutate state under a new owner.

## 7. Physical Placement

Logical shards MUST be decoupled from physical D1 databases.

The runtime may map multiple logical shards to one D1 database or use other placement strategies as capacity requires.

Therefore:

> logical shard ≠ physical D1 database

## 8. D1 Role

D1 is the persistence substrate.

D1-Fabric owns:

- routing;
- partitioning;
- ownership;
- execution;
- migration semantics;
- resource budgets;
- consistency semantics;
- recovery of distributed ownership.

D1 Time Travel or storage recovery alone does not restore distributed routing/ownership state.

## 9. Transactions

A D1 transaction is the atomic boundary for operations that fit within one D1 database.

The runtime MUST NOT claim global transaction semantics across independent D1 databases unless an explicit distributed protocol provides them.

## 10. Cross-Shard Writes

Cross-shard mutation semantics MUST be explicit.

Possible semantics include:

```text
BEST_EFFORT
IDEMPOTENT_MULTI_SHARD
APPLICATION_SAGA
OTHER_EXPLICIT_PROTOCOL
```

The runtime MUST NOT silently imply global atomicity.

## 11. Cross-Shard Reads

Cross-shard reads MUST have explicit bounds for:

- shard count;
- parallelism;
- result size;
- memory;
- deadline.

A shard must not be queried if it cannot contribute to the requested result.

## 12. Consistency Modes

Consistency MUST be explicit.

The runtime may support modes such as:

```text
STRONG
SESSION
EVENTUAL
STALE_ALLOWED
```

A cache or replica may satisfy a request only if its freshness matches the declared consistency.

## 13. D1 Read Replication

When D1 read replication is used, asynchronous replication semantics must be respected.

Session/bookmark mechanisms may be used where the application requires sequential consistency or read-your-own-writes.

The runtime MUST NOT assume that a replica is automatically current.

## 14. Read-Your-Own-Writes

If a consistency mode requires read-your-own-writes, the runtime MUST preserve an appropriate session/bookmark/version boundary.

A subsequent read cannot silently return an older state when the contract promises read-your-own-writes.

## 15. Versioning

Authoritative mutable state SHOULD have a version, epoch, sequence, or equivalent mechanism where needed for conflict detection and ordering.

## 16. Idempotency

Retryable mutations MUST have an idempotency identity.

Conceptually:

```text
operation_id
idempotency_key
owner_shard
```

A retry of a committed operation must not create a second logical mutation.

## 17. Write Ordering

Where ordering matters, writes MUST carry enough ordering information to distinguish valid order from stale or duplicate operations.

## 18. Schema Separation

Application schema and D1-Fabric control metadata SHOULD remain logically separated.

Application tables contain application state.
Control metadata contains ownership, routing, migration, epochs, and runtime state.

## 19. Control Metadata

Control metadata MUST itself have:

- authoritative ownership;
- versioning;
- recovery semantics;
- integrity constraints;
- bounded access patterns.

Control-plane corruption is a distributed-system failure and must not be treated as ordinary application data loss.

## 20. Migration

Migration is an ownership transition, not merely row copying.

The canonical lifecycle is:

```text
Plan
→ Prepare
→ Copy
→ Verify
→ Fence
→ Commit Ownership
→ Advance Epoch
→ Serve
→ Retire Source
```

The source MUST NOT be retired until the new owner is verified and authoritative ownership has safely transitioned.

## 21. Dual Write

Uncontrolled dual-write is forbidden.

If temporary dual-write is required by an explicit migration protocol, the contract MUST define:

- source of truth;
- ordering;
- idempotency;
- reconciliation;
- cutover;
- rollback.

## 22. Split and Merge

Shard split and merge MUST preserve:

- ownership;
- deterministic routing;
- epoch/fencing;
- completeness;
- uniqueness;
- idempotency;
- recovery.

## 23. Hot Shards

A hot shard may be split, rebalanced, cached, or otherwise optimized, but the optimization MUST NOT silently change ownership semantics.

## 24. Data Locality

Placement SHOULD consider:

- traffic locality;
- tenant locality;
- query locality;
- write locality;
- failure domain;
- jurisdiction requirements where applicable;
- capacity.

## 25. Indexes and Derived State

Indexes and derived state are not automatically authoritative business state.

Derived state MUST have a rebuild or reconciliation strategy where correctness requires it.

## 26. Cache

Cache is non-authoritative unless explicitly declared otherwise.

Cache invalidation/update MUST occur only after the authoritative state transition is safe.

## 27. Tombstones and Deletion

Deletion semantics MUST define:

- logical deletion;
- physical deletion;
- tombstone retention;
- replication implications;
- migration implications;
- recovery implications.

A deleted object MUST NOT reappear because a stale replica or migration source was later read.

## 28. Retention

Every authoritative data class SHOULD define lifecycle and retention semantics.

Retention MUST NOT accidentally delete state required for recovery, reconciliation, or uniqueness guarantees.

## 29. Native D1 Constraints

Where D1/SQLite constraints can enforce a true invariant, the implementation SHOULD prefer native constraints over duplicated application checks.

Examples include:

- uniqueness;
- foreign keys;
- not-null constraints;
- check constraints.

Application checks may still be required for distributed invariants.

## 30. D1 I/O Economics

Rows read and rows written are first-class state-execution costs.

Data layout, indexes, query patterns, batching, and state duplication MUST consider their D1 I/O consequences.

## 31. Read and Write Amplification

The runtime SHOULD measure:

```text
Read Amplification = rows_read / useful_rows
Write Amplification = rows_written / logical_rows_changed
```

High amplification must be visible and optimizable.

## 32. State Integrity

Authoritative state MUST have sufficient integrity protection to detect:

- duplicate ownership;
- stale epoch;
- invalid references;
- incomplete migration;
- illegal transitions;
- duplicate mutation.

## 33. Recovery

Recovery MUST restore distributed invariants, not merely restore bytes.

Storage recovery answers:

> What data existed?

Distributed recovery must additionally answer:

> Who owns it now, under which epoch, and how is it safely served?

## 34. Hidden State

Critical runtime state MUST NOT exist only in process memory if losing it would make ownership, recovery, or correctness ambiguous.

Ephemeral state is allowed only when its loss is safe and recoverable.

## 35. Control-Plane Staleness

Control metadata caches MUST carry enough version/epoch information to detect stale state.

Stale control information may cause safe rejection or refresh, but must never cause an unsafe authoritative mutation.

## 36. Mandatory Data-State Invariants

- **DS-01:** Every mutable authoritative state has one owner.
- **DS-02:** Ownership is associated with a valid epoch/fence.
- **DS-03:** Routing is deterministic for a fixed epoch.
- **DS-04:** Stale routing cannot perform authoritative mutation.
- **DS-05:** Logical and physical placement are explicitly represented.
- **DS-06:** Cross-shard atomicity is never implied without a protocol.
- **DS-07:** Retryable mutations are idempotent.
- **DS-08:** Derived state is distinguishable from source of truth.
- **DS-09:** Cache is distinguishable from authoritative state.
- **DS-10:** Migration verifies data before ownership cutover.
- **DS-11:** Migration cutover is fenced.
- **DS-12:** Recovery restores ownership and routing invariants.
- **DS-13:** Required consistency semantics are explicit.
- **DS-14:** Control metadata has recovery and integrity semantics.
- **DS-15:** No hidden state may make recovery ambiguous.

## 37. Forbidden Data-State Designs

Prohibited:

- multiple silent authoritative owners;
- writes through stale epochs;
- uncontrolled dual-write;
- cache treated as source of truth;
- derived state treated as authoritative without contract;
- global transaction claims without protocol;
- migration by blind copy-and-switch;
- recovery that restores storage but not ownership;
- unbounded cross-shard state access.

## 38. Verification

Data-state verification MUST cover:

```text
routing
ownership
fencing
idempotency
transaction boundaries
cross-shard semantics
migration
split
merge
hotspot handling
cache invalidation
recovery
consistency
integrity constraints
```

## 39. Final Data-State Law

> **One state, one owner, one valid epoch, one deterministic route, one recoverable source of truth.**
