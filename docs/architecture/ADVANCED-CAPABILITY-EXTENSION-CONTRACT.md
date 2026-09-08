# D1-Fabric Advanced Capability Extension Contract

**Status:** ACTIVE DESIGN GUARDRAIL
**Version:** 1.0
**Authority:** D1-Fabric architecture contracts
**Scope:** Future extensibility only; this document does not authorize implementation of advanced features during P0/P1.

## 0. Purpose

D1-Fabric Core MUST remain small, stable, and independently deployable while providing explicit integration points for future scale, observability, integrity repair, and intelligence capabilities.

The design rule is:

> Advanced capabilities MUST be additive, not invasive.

Future capabilities MUST integrate through existing contracts, control-plane metadata, telemetry, event records, and derived-state repair mechanisms rather than by duplicating placement logic or rewriting the core data path.

---

## 1. Core Stability Rule

The six-Worker core remains fixed:

```text
W01 Runtime Gateway
W02 Shard Router
W03 Query Engine
W04 Write Engine
W05 Cache
W06 Control & Recovery
```

No advanced capability may require a new Worker unless a future architecture review proves that an independent deployment boundary is unavoidable.

The default evolution mechanism is to extend an existing Worker or add a separately deployable optional capability without changing the existing core contracts.

Advanced features MUST NOT:

- create a second placement authority;
- make W03 or W04 own physical placement decisions;
- make W05 authoritative for business data;
- move control-plane ownership into the data plane;
- require business schemas to duplicate authoritative facts;
- break existing API envelopes, routing identity, idempotency, or CAS semantics.

---

## 2. Scaling Extension Point

The system MUST preserve the separation:

```text
logical shard
    ↓
W02 placement authority
    ↓
physical D1
```

Current seed topology:

```text
64 logical shards
        ↓
8 physical D1 databases
```

The logical shard identity MUST remain stable when physical placement changes.

Future physical scale-out MUST be driven primarily by control-plane placement metadata and deployment configuration, not application code changes.

The target evolution is:

```text
W06 control metadata
        ↓
placement change
        ↓
W02 /v1/resolve
        ↓
new physical D1
```

W03/W04 MUST continue to resolve placement through W02. They MUST NOT need a new placement algorithm when physical D1 count increases.

### Reserved placement fields

The placement model SHOULD preserve these concepts:

```text
shard_id
physical
owner
epoch
state
generation
migration_id
```

Existing fields MUST retain their current semantics.

### Required future migration states

The control plane already has the vocabulary needed for staged movement:

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

Future migration MUST follow the control-plane sequence:

```text
PLAN
→ PREPARE
→ COPY
→ VERIFY
→ FENCE
→ COMMIT_OWNERSHIP
→ ADVANCE_EPOCH
→ SERVE
→ RETIRE_SOURCE
```

No future scaling feature may bypass fencing, verification, or epoch advancement.

---

## 3. Observability Extension Point

Every runtime Worker SHOULD emit the same minimal telemetry vocabulary so a future graphical control plane can observe the complete request path without modifying business logic.

Reserved dimensions:

```text
request_id
trace_id
worker
route
status
error_code
latency_ms
downstream_latency_ms
d1_latency_ms
rows_read
rows_written
payload_bytes
fanout
parallelism
retry_count
cache_hit
shard_id
physical
```

The telemetry contract is observational only. It MUST NOT become an authoritative business-data source.

Future graphical monitoring MAY derive:

```text
QPS
concurrency
P50
P95
P99
error rate
D1 latency
fanout pressure
parallelism pressure
hot shard detection
cache hit rate
write conflict rate
migration state
```

The dashboard MUST consume telemetry; it MUST NOT require core Workers to be rewritten simply to display these metrics.

---

## 4. Capacity and High-Concurrency Detection

The runtime contract SHOULD expose enough bounded execution metadata to allow future automated detection of pressure conditions.

Reserved metrics include:

```text
requests_per_second
concurrency
queue_wait_ms
execution_ms
d1_latency_ms
rows_read
rows_written
payload_bytes
fanout
parallelism
```

A future control plane MAY classify shards and workers as:

```text
NORMAL
PRESSURED
HOT
OVERLOADED
DEGRADED
```

Such classification MUST be derived from telemetry and control-plane policy.

It MUST NOT alter routing directly from the dashboard. Placement changes remain a W06/W02 controlled operation with epoch/fencing semantics.

---

## 5. Data Integrity and Repair Extension Point

D1-Fabric MUST distinguish authoritative facts from derived state.

Examples:

```text
reaction row       = authoritative fact
content counter   = derived state

event             = observed fact
feature            = derived state
cache value        = derived state
feed candidate     = derived/distribution state
```

A derived value MUST have a defined source of truth.

Example:

```text
reaction facts
      ↓
reconciliation
      ↓
content counter
```

If:

```text
reaction_count != counter
```

future integrity tooling MUST be able to identify the drift and repair the derived value without changing the authoritative records.

Reserved integrity concepts:

```text
integrity_check
reconciliation
repair
repair_reason
repair_version
source_of_truth
observed_version
```

Future repair mechanisms MUST be idempotent and auditable.

The system MUST be able to distinguish at least:

```text
COUNTER_DRIFT
ORPHAN_REFERENCE
DUPLICATE_RELATION
PLACEMENT_DRIFT
STALE_DERIVED_STATE
```

No automatic repair may silently rewrite authoritative business facts.

---

## 6. Anti-Redundancy Rule

The schema MUST prefer a single authoritative representation of each business fact.

If a value is duplicated for performance, the contract MUST explicitly identify:

```text
source_of_truth
derived_copy
rebuild_rule
repair_owner
```

Forbidden pattern:

```text
same business fact
→ two independent authoritative columns/tables
→ no declared source of truth
```

Required pattern:

```text
authoritative fact
      ↓
derived representation
      ↓
rebuild/reconcile
```

A denormalized value is acceptable only when its derivation and repair path are deterministic.

---

## 7. Event / Intelligence Extension Point

Future recommendation, analytics, anti-abuse, search, and AI capabilities MUST consume stable event and content contracts rather than embedding their logic into W03/W04.

Reserved event dimensions:

```text
event_id
tenant_id
user_id
event_type
target_type
target_id
session_id
request_id
source
occurred_at
payload_json
```

Typical events MAY include:

```text
IMPRESSION
OPEN
READ
DWELL
LIKE
COMMENT
FAVORITE
SHARE
FOLLOW
HIDE
NOT_INTERESTED
PUBLISH
DELETE
REPORT
```

Event emission MUST not make the primary D1 write path depend on a future recommendation or AI system.

The desired evolution is:

```text
authoritative content/action
        ↓
behavior event
        ↓
features / aggregates
        ↓
candidate generation
        ↓
ranking / recommendation
```

The recommendation or AI layer MUST remain a consumer of stable contracts.

---

## 8. Content and Business API Compatibility

Future front-end and admin capabilities SHOULD be able to share the same content-domain contracts.

The data layer SHOULD support the same core content abstraction for:

```text
backend/admin publishing
user publishing
micro-posts
articles
images
videos
comments
replies
reactions
favorites
follows
shares
```

Different permissions and workflows MUST NOT require unrelated duplicate authoritative content models.

The underlying placement key MUST continue to follow access-pattern affinity rather than UI origin.

---

## 9. Cache Extension Point

W05 remains non-authoritative.

Future cache implementations MAY add:

```text
get
set
invalidate
TTL
stale-while-revalidate
negative caching
request coalescing
```

but cache contents MUST remain rebuildable from authoritative data.

A cache miss, cache loss, or cache rebuild MUST NOT require a business migration.

---

## 10. API Stability Rule

Future advanced capabilities MUST prefer additive APIs.

Existing endpoint semantics MUST NOT be silently redefined.

New capabilities SHOULD follow:

```text
/v1/...
```

with stable request/response envelopes and `x-request-id` propagation.

Deprecation MUST be explicit and versioned; breaking changes MUST NOT be introduced through silent field reuse.

---

## 11. “Few Lines to Scale” Design Requirement

The architecture SHOULD make the common scale-out path primarily configuration/control-plane work:

```text
provision physical D1
        ↓
add binding/configuration
        ↓
update W06 placement metadata
        ↓
W02 resolves new placement
        ↓
W03/W04 continue unchanged
```

This is a design target, not a promise that every future migration will literally require a fixed number of source lines.

Business logic MUST NOT be rewritten for ordinary physical shard growth.

---

## 12. Graphical Operations Center Extension Point

A future graphical operations center MAY expose:

```text
Shard topology
Physical D1 usage
Hot shards
QPS
P50/P95/P99
Error rate
D1 latency
Fanout
Cache health
Write conflicts
Migration progress
Integrity drift
Recovery state
```

The graphical layer MUST remain an observer/controller over explicit contracts.

It MUST NOT become an alternative source of routing truth.

---

## 13. Future Automation Safety

Any future automatic scaler, migration controller, repair controller, or AI optimizer MUST satisfy:

```text
observe
→ evaluate
→ plan
→ verify
→ fence when required
→ execute
→ verify result
→ record evidence
```

Automation MUST be:

```text
idempotent
bounded
auditable
recoverable
reversible where technically possible
```

No automation may directly bypass W02/W06 authority.

---

## 14. Implementation Boundary

This document reserves integration points only.

It does NOT authorize implementation of:

```text
automatic rebalancing
automatic shard splitting
automatic migration
AI recommendation
search engine
analytics platform
graphical dashboard
automatic repair
advanced cache orchestration
```

Those capabilities require their own implementation stage and verification evidence.

---

## 15. Completion Invariant

As advanced capabilities are added, these invariants MUST remain true:

```text
W02 = unique placement authority
W03 = query execution
W04 = write execution
W05 = non-authoritative cache
W06 = control/recovery authority
D1 = authoritative durable data
Derived state = rebuildable/repairable
Business APIs = placement-independent
Physical scale = control-plane driven
Observability = contract driven
```

The objective is to allow D1-Fabric to evolve from the initial 64-logical/8-physical seed topology into larger deployments without forcing repeated rewrites of the core data path.
