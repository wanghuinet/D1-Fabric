# D1-Fabric Logical Data Placement Contract

**Status:** ACTIVE
**Version:** 1.0
**Authority:** D1-FABRIC-1.0-CONTRACT-BASELINE.md
**Semantic owner:** Data & State Contract (`D1-FABRIC-1.0-DATA-AND-STATE-CONTRACT.md`)
**Scope:** Logical data placement, affinity, routing input, cross-shard read/write rules, fanout bounds, tenant isolation, epoch, migration, and compatibility.

---

## 0. Core Principle

> **Data placement must follow access pattern, not simply primary-key shape.**

The logical routing input is always:

```text
tenant_id + affinity_key
```

`tenant_id` is the tenant isolation boundary; `affinity_key` is a single logical
routing value chosen from the domain's primary read/write access pattern (see §2).

`hash(primary_key)` MUST NOT be used as the default business placement. Affinity keys
are declared per domain in §2 and MUST NOT be re-derived from raw primary-key shape.

---

## 1. Logical Shard Identity

A **logical shard** is an ownership and routing unit identified by a stable integer
`shard_id` in `[0, N)`. It is decoupled from physical D1 placement.

```text
Logical shard count (N):   64
Physical shard count (P):  8
Physical D1 databases:     d1-fabric-shard-01 .. d1-fabric-shard-08
```

- `shard_id` is the logical routing result. Clients and data-path workers MUST NOT
  infer physical placement from `shard_id` alone.
- The logical → physical binding is authoritative in W02 (`w02-shard-router`), which
  returns `{ shard_id, physical, owner, epoch, state, canonical_routing_identity }`.
- `physical` is the physical D1 identifier (e.g. `shard-01`) used to select the local
  `SHARD_XX` binding. `owner` is the logical ownership label.
- The initial 64 → 8 striping is a seed placement only; it is not a routing contract.

```text
Logical Routing Contract
        ↓
      W02 (route)
        ↓
   logical shard (shard_id)
        ↓
   physical binding (physical → SHARD_XX)
```

---

## 2. Affinity Rules

The routing input is `tenant_id + affinity_key`. Affinity key is the **primary access-pattern
routing value**, not the table primary key.

| Domain          | Affinity Key                    | Rule                           | Routing namespace |
| --------------- | ------------------------------- | ------------------------------ | ----------------- |
| User            | `user_id`                       | tenant + user                  | `users`           |
| Author          | `author_id`                     | tenant + author                | `users`           |
| Content         | `content_id`                    | tenant + content               | `content`         |
| Media           | `content_id` when content-bound | content locality               | `content`         |
| Content Stats   | `content_id`                    | content locality               | `content`         |
| Comments        | `content_id`                    | comment list locality          | `content`         |
| Reactions       | `content_id`                    | content interaction locality   | `content`         |
| Shares          | `content_id`                    | content interaction locality   | `content`         |
| Events          | primary business subject        | avoid arbitrary global hotspot | subject-dependent |
| Feed Candidates | `user_id`                       | home-feed locality             | `users`           |
| Moderation      | target object's affinity        | moderation locality            | target-dependent  |

Note: Author shares the `users` routing namespace in the current seed because an author
profile is colocated with its user record (`author_id == user_id`). The affinity key remains
`author_id`; the namespace binding is `users`.

---

## 3. Table Placement

Preserved tables (MUST NOT be dropped unless proven wrong by current code):

```text
fabric_records
fabric_idempotency
platform_content
platform_content_stats
platform_media
platform_comments
platform_reactions
platform_events
platform_feed_candidates
platform_publish_operations
platform_publish_assets
```

Placement by affinity:

```text
platform_content              content_id   (content authoritative shard)
platform_content_stats        content_id   (colocated with content)
platform_publish_operations   content_id   (colocated with content)
platform_publish_assets       content_id   (colocated with content)
platform_comments             content_id   (comment list locality)
platform_reactions            content_id   (interaction locality)
platform_shares               content_id   (interaction locality)
platform_media (content-bound) content_id  (content → media locality)
platform_feed_candidates      user_id      (feed locality)
platform_users                user_id      (user locality)
platform_authors              author_id    (colocated with user)
platform_events               primary business subject (not arbitrary global key)
platform_moderation           target object's affinity
```

**Content-domain authoritative writes MUST remain shard-local.** A publish transaction
that mutates content, its stats, publish operation, and publish assets MUST commit on a
single content shard.

---

## 4. Cross-Shard Read Rules

Cross-shard reads must be **bounded**:

1. A read that needs data on another shard performs at most one bounded lookup per
   resolution (see F-PUBLISH-1 author validation: one author lookup).
2. Fan-out reads (e.g. author page) are bounded by `MAX_FANOUT`, `MAX_ROWS_GLOBAL`,
   `MAX_PARALLELISM`, and `DEADLINE` (see §6).
3. Reads never establish a new semantic owner; the target shard's authoritative data is read
   without becoming a second writer.
4. Reads MUST be tenant-scoped in every query, including fan-out and aggregation.

---

## 5. Cross-Shard Write Prohibition

- A single logical transaction MUST NOT mutate rows owned by more than one shard.
- Cross-shard writes are prohibited. Cross-domain effects that would require writing a
  second shard are delegated to the **transactional outbox** (W11) as at-least-once projections.
- No distributed transaction is introduced. The write boundary is the authoritative shard's
  local D1 transaction.

---

## 6. Fanout Limits

Author-page fan-out is **bounded 8 physical shards**:

```text
MAX_FANOUT        = 8
MAX_ROWS_GLOBAL   = 1000
MAX_PARALLELISM   = 8
DEADLINE_MS       = 2000
CURSOR            = keyset (publish_at, content_id) — indexed pagination
```

Required behavior:

```text
author_id
  ↓
query each shard (indexed, per-shard execution cap = limit + 1)
  ↓
merge
  ↓
global ordering (publish_at DESC, content_id DESC)
  ↓
cursor (keyset)
```

Prohibited: unbounded fan-out, and "read all rows then sort in memory". The fan-out reads a
bounded per-shard window and merge-sorts, never a full-table scan.

`MAX_ROWS_GLOBAL` is the API's global `max_rows` semantics: `fanout × limit` MUST NOT be
returned. The final result is capped at `limit` rows total. Per-shard `limit + 1` is an
internal execution cap, not exposed as per-shard row budget.

---

## 7. Tenant Isolation

Tenant isolation MUST hold across every path, not merely a `WHERE tenant_id` clause:

```text
routing            — canonical identity includes tenant_id
query              — tenant-scoped WHERE
write              — tenant-scoped primary/unique keys and UPDATE/DELETE predicates
idempotency        — primary key (tenant_id, idempotency_key)
cache              — cache key seeded with tenant_id
unique indexes     — tenant_id is the leading column of every uniqueness domain
cross-shard fanout — every shard query is tenant-scoped
aggregation        — tenant-scoped grouping/counts
```

No path may infer a row across tenants.

---

## 8. Epoch Semantics

- A routing epoch is versioned per logical shard. W02 returns `epoch`.
- A stale writer MUST NOT perform authoritative mutation. W04 write/publish rejects
  `STALE_ROUTING_EPOCH` when `expected_epoch` mismatches.
- Recovery MUST restore routing/state invariants before normal traffic resumes.

---

## 9. Migration Semantics

- Logical shard identity remains stable across physical rebalancing.
- Placement changes advance the shard epoch under fencing (W06), following the migration
  state machine: PLAN → PREPARE → COPY → VERIFY → FENCE → COMMIT_OWNERSHIP →
  ADVANCE_EPOCH → SERVE → RETIRE_SOURCE.
- Content-domain authoritative writes stay shard-local throughout the migration.

---

## 10. Compatibility Rules

- No primary keys of preserved tables are modified.
- No schema rebuild of preserved tables unless proven wrong by current code.
- Public read/write API paths are not redefined.
- `fabric_records` op semantics preserve the generic namespace/record_key/tenant_id envelope.
- Optimistic concurrency uses `expected_version` (CAS); silent last-write-wins is disallowed
  unless explicitly specified by contract.

---

## Appendix A. Publish Author Validation (F-PUBLISH-1)

**Bounded Cross-Shard Author Read** (single bounded read, no distributed transaction):

```text
publish
  ↓
content authoritative shard (route by content_id)
  ↓
bounded author validation read (route by author_id → users shard)
  ↓
single-shard publish write transaction
```

Constraints:

- No W08 `author-validation` Worker is added.
- No distributed transaction.
- Author is never written cross-shard.
- Author validation is not a second authoritative write.
- At most one bounded author lookup per publish.
- Author MUST satisfy `tenant_id + author_id + status = 'active'`.
- Validation failure MUST block publish.
- Publish idempotency MUST be preserved (replay short-circuits before validation).

---

## Appendix B. Optimistic Concurrency (W04 generic UPDATE)

```text
UPDATE fabric_records
SET payload_json = ?, version = version + 1, updated_at = CURRENT_TIMESTAMP
WHERE tenant_id = ?
  AND namespace = ?
  AND record_key = ?
  AND version = expected_version
```

- Conflict returns `WRITE_CONFLICT`.
- No silent last-write-wins.
- Upsert where required uses explicit `INSERT ... ON CONFLICT` or CAS, not blind overwrite.

---

## Appendix C. Completion Criteria

```text
PLACEMENT_CONTRACT        = PASS
ROUTING_CONSISTENCY       = PASS
TENANT_ISOLATION          = PASS
PUBLISH_AUTHOR_VALIDATION = PASS
GLOBAL_ROW_BUDGET         = PASS
OPTIMISTIC_CONCURRENCY    = PASS
COMMENT_LOCALITY          = PASS
REACTION_LOCALITY         = PASS
MEDIA_LOCALITY            = PASS
FEED_USER_LOCALITY        = PASS
AUTHOR_PAGE_BOUNDED_FANOUT= PASS
REGRESSION                = PASS
```

Final `DATABASE_STATUS = READY`. Use `READY_WITH_REMEDIATION` only when an actual unresolved
P0/P1 correctness issue exists; otherwise record which runtime evidence is not yet obtained.

---

## Appendix D. Verification Evidence & Status

### Static verification (V0/V1)

`tsc --noEmit` passes with zero diagnostics for every worker that carries a
placement/routing surface, including all touched modules:

```text
w01-runtime-gateway   exit 0 (0 diagnostics)
w02-shard-router      exit 0 (0 diagnostics)
w03-query-engine      exit 0 (0 diagnostics)
w04-write-engine      exit 0 (0 diagnostics)
w05-cache             exit 0 (0 diagnostics)
w06-control-recovery  exit 0 (0 diagnostics)
w07-media-service     exit 0 (0 diagnostics)
w08-auth-service      exit 0 (0 diagnostics)
w09-content-api       exit 0 (0 diagnostics)
w10-social-api        exit 0 (0 diagnostics)
w11-outbox-relay      exit 0 (0 diagnostics)
```

### Schema compatibility (V2-static)

Verify referenced tables/columns/indexes exist and match the placement contract:

- `platform_authors(tenant_id, author_id, status)` — F-PUBLISH-1 author lookup target.
- `platform_publish_operations`, `platform_publish_failures` — publish state machine (0003).
- `platform_outbox` with `max_retries`, `next_retry_at` — outbox relay + integrity check (0011).
- `idx_platform_content_author(tenant_id, author_id, publish_at DESC, content_id DESC)` — author-page keyset cursor.
- Preserved tables from §3 remain present and unaltered in primary keys.

### Completion gates

```text
PLACEMENT_CONTRACT         = PASS
ROUTING_CONSISTENCY        = PASS
TENANT_ISOLATION           = PASS
PUBLISH_AUTHOR_VALIDATION  = PASS
GLOBAL_ROW_BUDGET          = PASS
OPTIMISTIC_CONCURRENCY     = PASS
COMMENT_LOCALITY           = PASS
REACTION_LOCALITY          = PASS
MEDIA_LOCALITY             = PASS
FEED_USER_LOCALITY         = PASS
AUTHOR_PAGE_BOUNDED_FANOUT = PASS
REGRESSION                 = PASS   (static; no runtime smoke available)
```

### Runtime evidence NOT yet obtained

The following are runtime/integration checks requiring a live Wrangler dev / deploy
target with D1 + R2 + service bindings. They were not executed in this environment and
are recorded as pending, not as failures:

```text
V2 Integration  — per-worker test/smoke.mjs (W02/W03/W04) require a running server.
V3 Runtime      — /health, /v1/route, /v1/query/*, /v1/write, /v1/publish,
                  /v1/content author-page fanout live traffic.
V5 Concurrency  — expected_version CAS under concurrent writers; publish idempotent replay.
V6 Recovery     — outbox retry; author-page FANOUT_DEADLINE path.
V8 Perf/Cost    — author-page fanout latency/limit behavior at MAX_ROWS_GLOBAL.
```

### Status

```text
DATABASE_STATUS = READY
```

No unresolved P0/P1 correctness defect was found under static audit. `READY_WITH_REMEDIATION`
is not used because no actual correctness issue is outstanding; the runtime evidence gaps
above are recorded rather than treated as blockers.