# D1-Fabric Content Platform Schema V1 Contract

## Purpose

This contract freezes the normalized content-platform data model used by D1-Fabric for the first content-platform generation. It combines the public capability requirements of a Toutiao-class personalized content platform and a Baidu-class search/content discovery platform without copying proprietary internal implementations.

The reliability model is additionally informed by publicly documented large-scale storage/distributed-system practices: strong consistency for critical state, serializable/conditional writes where correctness requires them, idempotent retry handling, durable event records, and explicit failure/recovery paths. Meta has publicly described strong-consistency storage with durable acknowledgement and transactional/conditional writes; TikTok publicly describes idempotency, fault tolerance, consistency and disaster recovery as core distributed-system concerns. These are architectural principles, not claims about any proprietary internal implementation of a specific app.

## Freeze rule

After V1 is deployed, application development must not require destructive changes to the core model. Backward-compatible additions remain possible; changing primary keys, shard assumptions, field semantics, or deleting core fields requires an explicit new schema version and architecture review.

## Core domains

- users / authors
- content: article, video, image, dynamic, with reserved extension types
- media metadata referencing R2 objects
- content statistics
- tags / topics / channels
- follows
- comments / replies
- likes / bookmarks
- shares
- behavior events
- feed candidates and ranking metadata
- moderation
- publication transaction / asset manifest / failure audit
- durable outbox / recovery metadata where asynchronous side effects are required

## Data Integrity Constitution — mandatory

D1-Fabric MUST treat database health as an invariant, not as a best-effort operational goal.

The system MUST be designed so that retries, duplicate requests, process crashes, worker timeouts, dependency failures, partial asynchronous work, and lost client responses cannot create an invalid committed business state.

The objective is not to promise that infrastructure can never fail. The objective is that infrastructure failure cannot permanently corrupt the logical data model.

### Non-negotiable invariants

1. **No half-published content** — `published` is reachable only after all required publication-local state has committed.
2. **No duplicate logical operation** — the same idempotency key represents one logical command.
3. **No lost committed intent** — any asynchronous side effect required by a committed transaction is represented durably before the transaction commits.
4. **No illegal state transition** — content and operation states follow an explicit state machine.
5. **No silent inconsistency** — detected integrity violations become observable failure/recovery records.
6. **No unbounded retry storm** — retries use bounded backoff, deduplication and circuit/dependency protection.
7. **No false success** — the API must not report success before the authoritative local commit has succeeded.
8. **No fake distributed transaction** — D1-Fabric must never pretend that independent D1 databases and R2 form one ACID transaction.
9. **Every repair is deterministic** — reconciliation must be able to identify, classify and safely repair or quarantine abnormal records.
10. **Every critical write is auditable** — the system must retain enough operation identity/state to explain what happened after a timeout or crash.

## Publication atomicity — mandatory

A backend publish operation is **all-or-nothing** from the user's perspective.

### Required flow

```text
Client creates publish_id + idempotency_key
        ↓
Upload media to R2
        ↓
Backend receives publish request + manifest
        ↓
Validate required metadata
        ↓
Validate every required media_id/object reference
        ↓
Resolve publication shard / transaction authority
        ↓
Verify all core publication records are transaction-local
        ↓
Begin D1 transaction
        ↓
Create/update content in non-published state
        ↓
Write publication operation + asset manifest + required outbox intents
        ↓
Validate state-machine transition
        ↓
Commit publication operation + content status together
        ↓
Return success
```

A content item MUST NOT become `published` when required database records or required media references are missing.

### Transaction locality — mandatory for sharded deployment

D1-Fabric does not assume a distributed ACID transaction across multiple D1 databases.

For a publication command, all **strongly consistent core records** that must change together MUST be routed to the same physical D1 transaction authority. At minimum, this includes the publication operation, publication state, content state and required publication-local manifest/state.

If the router cannot guarantee transaction locality, the request MUST NOT be committed as `published`. It must fail safely or enter an explicit non-published recovery state.

Cross-shard derived data, feed candidates, counters, search indexes, notifications and other asynchronous projections MUST be treated as downstream projections rather than part of the publication ACID boundary.

### R2 boundary

R2 object storage is outside the D1 ACID transaction.

Therefore the system MUST NOT claim that R2 upload + D1 commit is a distributed transaction.

Required behavior:

- R2 assets must have stable asset identity and manifest references.
- D1 publication must validate that every required asset reference is present and valid before commit.
- If R2 upload succeeds but D1 publication fails, the asset becomes pending/orphan-reconciliation work rather than a published asset.
- Orphan cleanup MUST be asynchronous and safe to retry.
- An R2 cleanup failure MUST NOT cause an already valid D1 publication to be rolled back.

## Publication state machine

The implementation MUST use explicit states equivalent to:

```text
DRAFT
  ↓
VALIDATING
  ↓
PUBLISHING
  ├──→ PUBLISHED
  └──→ FAILED / RECOVERY_REQUIRED
```

Rules:

- `PUBLISHED` is terminal for the current publication version.
- `FAILED` cannot be exposed as published content.
- A retry may re-enter `VALIDATING` only when the idempotency contract permits it.
- Illegal transitions MUST be rejected.
- State changes MUST be versioned or otherwise protected against stale concurrent writers.

## Idempotency and timeout recovery — mandatory

A network timeout does **not** prove that the server transaction failed.

Therefore every externally retryable write command MUST carry an idempotency key. The idempotency record and the authoritative business operation MUST be protected by the same transaction boundary whenever the operation is transaction-local.

On retry with the same idempotency key:

- if the original operation committed, return the existing committed result;
- if the original operation failed before commit, retry safely;
- if the operation is still in an indeterminate/recovery state, resolve it from authoritative persisted state rather than guessing;
- never create a second content item or duplicate publication effects;
- reuse the original logical operation identity.

The same idempotency key MUST NOT be silently reused with a different request payload. Such a conflict is a deterministic client error.

## Transactional outbox / durable intent — mandatory for critical asynchronous effects

When a successful database mutation requires an asynchronous side effect, the system MUST persist the side-effect intent in the same local transaction as the business mutation.

Conceptually:

```text
BEGIN TRANSACTION
  business state change
  outbox/event intent
COMMIT
       ↓
relay / worker
       ↓
external side effect
```

The outbox relay MUST assume at-least-once delivery. Consumers MUST be idempotent by stable event/operation identity.

This prevents the classic dual-write failure where database state commits but the event is lost, while also accepting that a relay can publish an event and crash before marking it delivered. The correct response is duplicate-safe consumption, not an unsafe exactly-once claim.

Outbox rows MUST have observable lifecycle state such as `pending`, `processing`, `completed`, or `failed/retryable`, with bounded retry policy and recovery visibility.

## Reconciliation and self-healing — mandatory

The system MUST contain a reconciliation path independent of the request/response path.

Reconciliation MUST periodically detect at least:

- `PUBLISHING` operations that exceed their expected deadline;
- published content missing required publication-local records;
- publication records whose asset manifests are incomplete;
- orphan/pending R2 assets without valid content references;
- outbox records stuck beyond retry thresholds;
- duplicate logical operations;
- illegal state transitions or version conflicts;
- counters/materialized projections that violate declared invariants.

Each anomaly MUST be classified into one of:

```text
REPAIRABLE
RETRYABLE
QUARANTINED
MANUAL_REVIEW
```

Automatic repair MUST be idempotent. A repair job may run multiple times without creating additional records or corrupting valid state.

Reconciliation MUST never blindly promote incomplete content to `published`.

## Failure behavior

If validation, D1 write, transaction commit, or required dependency checks fail, the operation must be recorded as failed/recoverable and the client must receive a deterministic failure response such as:

- `PUBLISH_VALIDATION_FAILED`
- `PUBLISH_ASSET_MISSING`
- `PUBLISH_DATABASE_TIMEOUT`
- `PUBLISH_COMMIT_FAILED`
- `PUBLISH_DEPENDENCY_UNAVAILABLE`
- `PUBLISH_TRANSACTION_LOCALITY_FAILED`
- `PUBLISH_IDEMPOTENCY_CONFLICT`

Retryable failures must tell the client that publication can be retried safely.

The server MUST distinguish between:

- **known failure before commit**;
- **known successful commit**;
- **ambiguous outcome** where the response path failed but the commit result is not yet known.

For ambiguous outcomes, the server/client MUST resolve the result through the idempotency key and authoritative operation record rather than issuing a new logical operation.

## Database health rules

A database is considered healthy only when all declared invariants hold.

Health verification MUST include:

1. schema version consistency;
2. primary-key/unique-key integrity;
3. legal state-machine transitions;
4. publication completeness;
5. idempotency uniqueness and payload consistency;
6. outbox liveness and retry age;
7. reconciliation backlog age;
8. orphan asset backlog age;
9. shard routing/transaction-locality correctness;
10. absence of unclassified integrity violations.

A green service health check MUST NOT be interpreted as proof of data integrity. Data integrity checks are a separate operational signal.

## Hot-path rules

1. Feed queries must not load large body payloads.
2. Media binaries never live in D1; only metadata/object references live in D1.
3. Views/impressions are events, not synchronous hot-row counter updates.
4. Counters are materialized state and may be rebuilt from event/aggregation pipelines.
5. Pagination uses deterministic cursor-compatible ordering.
6. Cross-domain foreign keys are not used because physical routing may place domains on different D1 shards.
7. Indexes exist for declared access paths; do not add speculative indexes.
8. Recommendation fields are versioned metadata, not an embedded recommendation algorithm.
9. Publication commit is atomic: no partial published content.
10. Client retries are idempotent and must not duplicate content or assets.
11. Strong consistency is reserved for business invariants; feeds, search, counters, notifications and ranking projections may be eventually consistent where product semantics permit.
12. Derived/projection data MUST be rebuildable from authoritative records or durable events.
13. Critical write paths MUST remain small enough to fit within one transaction authority and must not perform non-transactional external calls after entering the ACID boundary.

## Consistency tiers

The platform MUST explicitly classify data rather than attempting strong consistency everywhere.

### Tier A — strong consistency / authoritative

Examples:

- content publication state
- publication operation state
- content ownership/author relationship required for publication
- required media manifest state
- idempotency state
- moderation decision that gates publication

### Tier B — durable asynchronous consistency

Examples:

- feed candidates
- search indexing
- notifications
- recommendation features
- analytics aggregation
- materialized counters

These MUST be recoverable and replayable but do not need to block the primary publication transaction unless product policy explicitly requires it.

### Tier C — disposable/cache state

Examples:

- cache entries
- precomputed transient ranking data
- temporary read acceleration data

Loss or staleness of Tier C data MUST NOT corrupt Tier A authoritative state.

## Tables

`platform_users`
`platform_authors`
`platform_content`
`platform_content_stats`
`platform_media`
`platform_content_tags`
`platform_content_topics`
`platform_content_channels`
`platform_follows`
`platform_comments`
`platform_reactions`
`platform_shares`
`platform_events`
`platform_feed_candidates`
`platform_moderation`
`platform_publish_operations`
`platform_publish_assets`
`platform_publish_failures`
`platform_schema_meta`

If the implementation introduces a dedicated outbox table, it MUST follow the same schema-freeze and migration rules and remain scoped to durable asynchronous side effects. It must not become a generic dumping ground for arbitrary application data.

## Industry-derived design principles

The following principles are deliberately borrowed from publicly documented large-scale system engineering rather than copied from proprietary implementations:

- **Strongly consistent authoritative storage:** critical state should be acknowledged only after durable commit/replication appropriate to the storage system. Meta's Delta describes acknowledgement only after durable storage across its replication chain. citeturn0search1
- **Transactional/conditional writes:** critical concurrent state transitions should be protected by transaction or conditional-write semantics. Meta's ZippyDB publicly describes transactions and conditional writes for atomic read-modify-write operations. citeturn0search8
- **Distributed-system reliability primitives:** idempotency, fault tolerance, circuit breaking, asynchronous processing and disaster recovery are explicitly treated as core concerns in TikTok's public backend platform role description. citeturn0search2
- **Distributed transaction durability:** public descriptions of TikTok's ByteGraph discuss transaction coordination, durable commit decisions and write-intent handling, reinforcing that transaction outcome must survive failure rather than being inferred from a client response. citeturn0search0
- **Transactional outbox + idempotent consumers:** the platform should persist business state and critical event intent together, then tolerate at-least-once delivery through consumer idempotency. This is a standard distributed-systems reliability pattern and is consistent with current engineering practice. citeturn0search5turn0search11

These references are used only to derive engineering principles. D1-Fabric does not claim to reproduce any company's private architecture.

## Deployment

Run from PowerShell in the repository:

```powershell
.\workers\shard-schema\scripts\Apply-ContentSchema.ps1
```

The script applies the complete content-platform migration chain to all eight configured D1 shards and verifies the required `platform_*` tables on every shard.

## Safety

All content-platform migrations are additive and do not modify or delete the existing generic `fabric_records`, `fabric_idempotency`, or `fabric_schema_meta` tables.
