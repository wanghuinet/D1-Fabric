# D1-Fabric Placement Remediation — Verification Evidence

**Capability:** Logical Data Placement Contract consolidation + minimal remediation
**Contract version:** `LOGICAL-DATA-PLACEMENT-CONTRACT.md` v1.0
**Baseline commit:** `d7faa4187e4b1bbd9f437ca83f7ede59139060a1`
**Working change set:** branch `placement/remediation` (uncommitted working tree)
**Verification timestamp:** 2026-09-08 (Asia/Shanghai)

---

## 1. Scope

This evidence covers the remediation required by the D1-Fabric authority task: make
`docs/architecture/LOGICAL-DATA-PLACEMENT-CONTRACT.md` the authoritative placement contract
and apply the minimum changes to satisfy its 12 completion criteria. It does **not** cover
unrelated workers, APIs, or schemas.

Modified / created paths:

```text
docs/architecture/LOGICAL-DATA-PLACEMENT-CONTRACT.md      (new, authoritative contract)
workers/w02-shard-router/src/index.ts                     (authoritative 64→8 routing + /v1/resolve)
workers/w03-query-engine/src/index.ts                     (global row budget + bounded author fanout)
workers/w03-query-engine/wrangler.jsonc                   (ROUTER service binding)
workers/w03-query-engine/tsconfig.json                    (new, static verification infra)
workers/w03-query-engine/package.json                     (typecheck script + typescript devDep)
workers/w04-write-engine/src/index.ts                     (resolve via W02 + optimistic concurrency)
workers/w04-write-engine/src/publish.ts                   (F-PUBLISH-1 author validation)
workers/w04-write-engine/wrangler.jsonc                   (ROUTER service binding)
```

## 2. Verification levels applied

```text
V0  Static / structural     -> EXECUTED (TypeScript type-check + schema/contract audit)
V1  Unit / deterministic    -> NOT EXECUTED (no harness in-environment; routing is a pure
                                deterministic function, see §8 limitations)
V2  Integration             -> NOT EXECUTED (runtime unavailable)
V3  Runtime / real boundary -> NOT EXECUTED (runtime unavailable)
V4  Contract / invariant    -> PARTIALLY: contract written, but not machine-verified
V5  Concurrency / overload  -> NOT EXECUTED (runtime unavailable)
V6  Failure / recovery      -> NOT EXECUTED (runtime unavailable)
V7  Security / isolation    -> STATIC ONLY (tenant_id scoping reviewed, see §6)
V8  Performance / cost      -> NOT EXECUTED (runtime unavailable)
```

Runtime-dependent levels are omitted because a live Workers + 8× D1 environment is not
available in this workspace. The authority task explicitly permits a `READY` verdict when
the design passes static audit, provided the missing runtime evidence is recorded honestly
(§17). This document records those gaps in §8.

## 3. Requirements → criteria mapping

Each completion criterion maps to contract sections and to evidence below.

| Criterion                    | Contract ref | Evidence |
|------------------------------|--------------|----------|
| PLACEMENT_CONTRACT           | §0–§10       | Contract exists; affinity table matches authority table |
| ROUTING_CONSISTENCY          | §1, §10      | W02 is sole binding truth; W03/W04 resolve via `/v1/resolve` |
| TENANT_ISOLATION             | §7           | tenant_id leading in all routing/query/write/idempotency paths |
| PUBLISH_AUTHOR_VALIDATION    | §A           | `validateAuthor` bounded single read, blocks publish |
| GLOBAL_ROW_BUDGET            | §6           | W03 caps `collected` at global `maxRows` |
| OPTIMISTIC_CONCURRENCY       | §B           | W04 CAS `WHERE version=expected_version`, `WRITE_CONFLICT` |
| COMMENT_LOCALITY             | §2, §3       | `platform_comments` content_id index + content placement |
| REACTION_LOCALITY            | §2, §3       | `platform_reactions` PK content_id-first |
| MEDIA_LOCALITY               | §2, §3       | `platform_media.content_id` + `idx_platform_media_content` |
| FEED_USER_LOCALITY           | §2, §3       | `platform_feed_candidates` PK user_id-first |
| AUTHOR_PAGE_BOUNDED_FANOUT   | §5, §6       | W03 fanout ≤ 8, keyset cursor, global limit |
| REGRESSION                   | §10, §29     | No schema/API redefinition; V0 type-check clean |

## 4. Final status

```text
DATABASE_STATUS = READY
```

No unresolved P0/P1 correctness issue was found during static audit. Runtime evidence
remains pending (see §8); this gap does not change the verdict under the authority task §17.

---

## 5. Static verification commands and results

All commands executed in this workspace. `tsc` = TypeScript 7.0.2.

### W02 (shard router)

```text
command: node ../w04-write-engine/node_modules/typescript/bin/tsc -p ./tsconfig.json --noEmit
result:  EXIT 0 (0 errors)
```

Repository script (`npm run typecheck`): `bunx --no-install tsc -p ./tsconfig.json --noEmit`.

### W03 (query engine)

```text
command: node ../w04-write-engine/node_modules/wrangler/bin/wrangler.js types
         node ../w04-write-engine/node_modules/typescript/bin/tsc -p ./tsconfig.json --noEmit
result:  EXIT 0 (0 errors)
```

Repository script (added): `wrangler types && tsc -p ./tsconfig.json --noEmit`.

### W04 (write engine)

```text
command: npm run typecheck   # = wrangler types && tsc -p ./tsconfig.json --noEmit
result:  EXIT 0 (0 errors)
```

## 6. Invariant evidence (V0 static)

### ROUTING_CONSISTENCY

- `workers/w02-shard-router/src/index.ts`: `physicalFor()` is the single place that maps a
  logical `shard_id` to a physical D1 (`(shardId % 8) + 1`). Comment states the seed mirrors
  `workers/w06-control-recovery/migrations/0001_control_schema.sql`.
- W02 exposes two endpoints: `/v1/route` (routing_key = affinity_key) and `/v1/resolve`
  (logical `shard_id` → `{ physical, owner, epoch, state }`).
- `workers/w03-query-engine/src/index.ts` and `workers/w04-write-engine/src/index.ts`:
  `resolveDb()` calls `ROUTER.fetch('https://router/v1/resolve', …)` and maps `physical`
  → local `SHARD_XX` binding via `bindingKey()`. No `% 8` is computed in W03/W04.
- Both W03/W04 `wrangler.jsonc` declare `services: [{ binding: "ROUTER", service:
  "d1-fabric-w02-shard-router" }]`.

### TENANT_ISOLATION

- Routing identity in W02 is `canonical(tenant_id, namespace, routing_key)` — tenant_id is
  part of every hash input.
- Every W03 query binds `tenant_id` as the leading predicate (query/plan uses client SQL but
  is enforced read-only `SELECT ... LIMIT` via `rejectUnsafeRead`; author page binds
  `tenant_id=?1 AND author_id=?2`).
- W04 write/idempotency: `fabric_records` PK `(tenant_id, namespace, record_key)`;
  `fabric_idempotency` PK `(tenant_id, idempotency_key)`; all UPDATE/DELETE predicates carry
  `tenant_id`.
- Schema audit (`0001`–`0003`): every business table has `tenant_id` as the leading column of
  PK/unique indexes.

### PUBLISH_AUTHOR_VALIDATION (F-PUBLISH-1)

- `workers/w04-write-engine/src/index.ts::validateAuthor()` routes `author_id` through
  `/v1/route` (namespace `author`), resolves the author shard via W02, executes **one**
  bounded `SELECT … WHERE tenant_id AND author_id AND status='active' LIMIT 1`, and returns
  boolean. Never writes.
- `workers/w04-write-engine/src/publish.ts::publish()` performs validation only after the
  idempotency replay short-circuit, so a replayed/committed publish does not re-read the
  author. Validation failure returns `422 PUBLISH_VALIDATION_FAILED / AUTHOR_MISSING` and
  blocks the content insert.

### GLOBAL_ROW_BUDGET

- `workers/w03-query-engine/src/index.ts` `/v1/query/plan`: `collected` is capped by
  `remaining = maxRows - collected.length`; loops `break outer` once `maxRows` is reached.
  `maxRows = bounded(body.max_rows ?? env.MAX_ROWS ?? env.MAX_ROWS_GLOBAL, 1000, 100000)`.
  Final `total_rows <= maxRows` regardless of fanout (not `fanout × per-shard`).

### OPTIMISTIC_CONCURRENCY

- `workers/w04-write-engine/src/index.ts` `/v1/write` UPDATE path reads current `version`,
  returns `404 NOT_FOUND` if absent, `409 WRITE_CONFLICT` if `current.version !== expected`,
  and issues `UPDATE … WHERE … AND version=?expected`. Zero-rows-changed after the batch is
  re-checked and mapped to `WRITE_CONFLICT`. No silent last-write-wins.

### COMMENT / REACTION / MEDIA / FEED locality

- `0002_content_platform_v1.sql`:
  - `platform_comments`: `content_id NOT NULL` + `idx_platform_comments_content`.
  - `platform_reactions`: PK `(tenant_id, content_id, user_id, reaction_type)` (content-first).
  - `platform_media`: `content_id` + `idx_platform_media_content`.
  - `platform_feed_candidates`: PK `(tenant_id, user_id, content_id)` (user-first).
- Placement is governed by routing (`tenant_id + affinity_key`), not by PK hash; the schema's
  PKs provide shard-local uniqueness while the affinity index serves the primary access path.

### AUTHOR_PAGE_BOUNDED_FANOUT

- `workers/w03-query-engine/src/index.ts` `/v1/author/content`:
  `maxFanout = bounded(env.MAX_FANOUT, 8, 8)`, `limit` default `MAX_ROWS_GLOBAL` (1000),
  `deadlineMs` default 2000. Fanout iterates `physicalShards(env).slice(0, maxFanout)`.
  Merge is bounded-window, keyset cursor is `(publish_at, content_id)`; no full-table load
  into memory for global sort (each shard returns `LIMIT ?limit` rows only).

### REGRESSION / compatibility

- No primary key of the preserved tables was changed.
- No new table was added beyond the preserved set; migrations `0001`–`0003` remain the only
  shard migrations (the out-of-scope 0004–0014 from the prior branch are not present).
- No distributed transaction or new worker (W08) introduced.

## 7. Schema compatibility

`workers/shard-schema/migrations/`:

```text
0001_initial_shard_schema.sql    fabric_records (has version), fabric_idempotency, fabric_schema_meta
0002_content_platform_v1.sql     business tables with tenant_id-first PK/unique + affinity indexes
0003_publish-atomicity-v1.sql    platform_publish_operations / platform_publish_assets / failures
```

`fabric_records.version` satisfies the optimistic-concurrency CAS predicate. The
`platform_publish_*` and business tables are consistent with the placement contract without
schema rebuild.

## 8. Known limitations (unevidenced runtime)

The following runtime evidence is **not** obtained in this environment and must be produced
before a production promotion claim:

```text
V1  Deterministic routing unit checks (fnv1a canonical → shard_id) not executed as an
    automated harness.
V2  Integration across W01→W02→W03/W04 service bindings not executed.
V3  Runtime smoke (`test/smoke.mjs` for each worker) not executed — requires a running
    `wrangler dev` + 8 D1 databases.
V5  Concurrency (CAS conflict injection, simultaneous write race) not executed.
V6  Failure/recovery (stale-epoch fencing, shard FAILED/RETIRED) not executed.
V7  Cross-tenant negative tests not executed (tenant scoping reviewed statically only).
V8  Performance / fan-out cost / row-budget ceilings not measured.
```

## 9. Risk

| Risk | Severity | Mitigation / note |
|------|----------|-------------------|
| Routing seed drift vs control plane | High | W02 comment ties seed to `w06/0001_control_schema.sql`; a future change must keep them in lockstep |
| W04 CAS check-then-update without fencing | Medium | D1 single-writer + idempotency UNIQUE gives deterministic conflict; V5 runtime CAS test still pending |
| Author fanout still bounded only by config | Low | `MAX_FANOUT` capped at 8; `DEADLINE_MS` backstop |
| Runtime evidence gap | Medium | No production promotion until §8 items are executed in a live environment |

## 10. Failures

None at V0. (One W02 type error — `json` requestId template-literal narrowing — and two W04
strict-null errors on `body.*` were found and fixed during verification; both files now
type-check clean.)