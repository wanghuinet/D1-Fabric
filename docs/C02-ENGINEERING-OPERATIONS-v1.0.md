# D1-Fabric C02 Engineering & Operations v1.0

> Status: ACTIVE
> Scope: implementation, testing, verification, deployment, performance, cost, evidence

## 1. Execution order

```text
Read routed contracts
→ inspect verified implementation
→ define owner/boundary
→ freeze Change Manifest
→ implement smallest complete change
→ targeted verification immediately
→ boundary/adversarial verification
→ full applicable verification
→ Diff Scope Gate
→ evidence
→ commit
→ push
→ CI PASS
```

## 2. Change control

T0 = trivial mechanical change. T1 = bounded local semantic change. T2 = cross-boundary, security, state, routing/epoch, recovery, schema, public protocol, migration, or material performance/cost change. Never downgrade a real T2 task.

T1/T2 require a Change Manifest declaring task, owner, allowed files, API/schema/dependency changes, invariants, verification, and commit scope. Any out-of-scope diff is FAIL + STOP.

## 3. Implementation law

Prefer existing verified primitives, one semantic owner, one primary path, minimum code, minimum D1 I/O, minimum Worker/RPC hops, minimum dependencies, and bounded resources. Do not add Workers, queues, caches, coordinators, persistent state, or third-party infrastructure without requirement + real boundary + measurable benefit + budget + verification.

AI implementation is low-autonomy: once the contract and Change Manifest define the answer, do not reopen architecture or invent alternatives. A genuine gap or conflict is STOP, not an invitation to design.

## 4. Resource/cost law

For material capabilities declare applicable limits for D1 reads/writes, fan-out/parallelism, rows/payload, Worker/RPC hops, cache behavior, retries/deadlines, storage operations, and async side effects. Cache-first reads and bounded batch/transaction writes are preferred where correct. No claim of low cost is valid without measurements.

Optimization target:

`security/isolation → correctness/state ownership → consistency/recovery → resource bounds → availability → performance → cost → code minimization`.

### 4.1 Billable-work budget

Every hot-path capability MUST have a measurable budget before implementation:

```text
D1 statements/request
D1 rows_read/request
D1 rows_written/request
Worker invocations/request
Worker CPU/request
shard fan-out/request
retries/request
payload/request
cache hit target
```

Verification MUST compare expected bounds with actual D1 `rows_read`/`rows_written`, Worker request/CPU usage, latency, and cache-hit behavior. A faster implementation that performs the same or more billable work is not a cost optimization.

### 4.2 Traffic-growth rule

Do not design cost as `users × database work`. The preferred scaling behavior is:

```text
traffic ↑
→ cache/work reuse ↑
→ backend work per request ↓ or remains bounded
→ D1 rows/request ↓ or remains bounded
→ writes/user action remain bounded
→ billable backend work grows sublinearly where workload/cacheability permits
```

Do not assume read replicas or more shards reduce D1 billing by themselves. They improve distribution/capacity characteristics; billable D1 usage remains tied to measured row reads/writes.

### 4.3 Query/index discipline

Hot queries MUST be checked with query-plan evidence where applicable. Avoid `SCAN` when an indexed `SEARCH` is possible. Indexes are not free: they can reduce rows read but can add write amplification, so every material index must have a measured reason to exist.

### 4.4 Edge/cache discipline

If a response is safely cacheable, prefer edge/cache termination before dynamic Worker and D1 execution. W05 remains the generic application-cache owner, but not every cacheable response should be forced through W05. Cache correctness, invalidation, TTL, and staleness limits must be explicit.

### 4.5 B-layer READ execution-cost gate

Every Business Worker READ issued through W03 MUST satisfy the following before it is considered production-ready:

1. The query has an explicit bounded result contract, normally an SQL `LIMIT` for hot-path list/result queries.
2. The query uses a selective predicate and an appropriate index where an indexed lookup/range is expected.
3. The business owner defines pagination, ordering, projection, and intended global result size.
4. `SELECT *` on hot paths is forbidden unless explicitly justified and measured.
5. Response-side `slice()` is never accepted as evidence that D1 `rows_read` is bounded.
6. Query-plan evidence is required for material hot queries; a justified `SCAN` must be documented.

The purpose is to prevent a query from reading an unbounded amount of D1 data and only truncating the response afterward.

### 4.6 Global rows budget across fan-out

`maxRows`/`MAX_ROWS` is a **request-global budget**, not a per-shard allowance.

For N selected shards:

```text
GLOBAL_ROWS_RETURNED ≤ GLOBAL_MAX_ROWS
```

The verification MUST include an N-shard case. A test that passes for one shard but returns `MAX_ROWS × N` under fan-out is FAIL.

Per-shard limits MAY be lower for execution safety, but MUST NOT be used to multiply the global result budget. The B-layer owner remains responsible for query semantics and pagination; W03 remains responsible for the generic global resource boundary.

### 4.7 Middleware safety guardrail

W03 MAY reject an unbounded/unsafe READ when the active generic query contract requires bounded execution. It MUST NOT silently invent a LIMIT, filter, index, ordering rule, or business pagination behavior.

If bounded execution cannot be established from the active contract, the safe result is **reject/STOP**, not execute an unbounded query.

### 4.8 Middleware 1.0 cost verification record

Middleware 1.0 completed the static billable-work budget review for W01-W06. The declared envelopes are:

| Hot path | Worker invocations | Internal hops | D1 statements | rows_written | fan-out | retries |
|---|---:|---:|---:|---:|---:|---:|
| READ | 3 | 2 | 1/shard, ≤8 | 0 | ≤8 | 0 |
| WRITE-INSERT | 3 | 2 | 4 | ≤3 | 1 | 0 |
| WRITE-UPDATE/DELETE | 3 | 2 | 5 | ≤3 | 1 | 0 |
| W05 cache | 1 | 0 | 0 | 0 | 0 | 0 |
| W06 reconcile | 1 | 0 | 24 | ≤8 | 8 | 0 |

READ `rows_read` remains query-dependent and therefore MUST NOT be described as bounded merely because W03 truncates returned rows. B-layer query contracts and query-plan evidence are required to establish the D1 read bound.

### 4.9 Verification limitations

W01, W02, W05, and W06 typecheck/build/smoke verification passed in the Middleware 1.0 evidence set. W03/W04 typecheck and build passed; their local D1 smoke test was blocked by the Node 24 + Miniflare D1 simulation environment hanging after `[wrangler] Ready` and the smoke client subsequently failing with a libuv assertion. This is recorded as an environment limitation, not reclassified as a code defect without contradictory evidence.

The W03/W04 D1 API shape (`prepare().bind().all()` and related existing primitives) had prior successful verification in a usable D1 environment. Any future smoke rerun MUST record the exact runtime/tooling environment rather than changing production code solely to accommodate the failing local simulator.

### 4.10 Middleware freeze rule after 1.0

The W01-W06 logical topology is frozen after Middleware 1.0 closure. H1/H2 do **not** authorize a new Worker, Worker split, cache hop, queue, coordinator, or architecture redesign.

H1/H2 are carried forward as mandatory B-layer query-contract requirements plus generic W03 safety enforcement. They are not a reason to reopen Worker ownership unless a future measured requirement proves a real boundary failure.

## 5. Worker packaging

Each independently deployable Worker must own:

```text
package.json
wrangler.toml / wrangler.jsonc
src/
tests/
README.md
```

No giant root dependency package. Each Worker must independently install, typecheck/test, build, deploy, and rollback.

## 6. Verification

At minimum for applicable Workers:

```bash
npm ci
npm run typecheck
npm test
npm run build
```

Also run applicable contract, API, schema/migration, idempotency, boundary, D1, E2E, concurrency, failure/recovery, security, performance, and cost checks. Negative paths include wrong tenant, unauthorized request, duplicate mutation, stale epoch, wrong owner, partial failure, migration interruption, schema mismatch, cache poisoning, timeout/resource exhaustion.

Compilation is not semantic proof.

## 7. Evidence

Evidence must reference the exact evaluated commit, environment, commands, outputs/results, limitations, and contract version. `PUSHED + CI PASS + exact-commit evidence` is the minimum valid completion state.

## 8. Release gate

1. All in-scope implementation complete.
2. Middleware purity and ownership audit passes.
3. Business functional regression passes.
4. Independent Worker package/build/test checks pass.
5. API/schema/idempotency/boundary checks pass.
6. Applicable performance/cost checks pass.
7. Diff Scope Gate passes.
8. Exact-commit evidence exists.
9. CI is green.

Only then may status be `COMPLETE` or release-ready.

## 9. Stop conditions

STOP on contract conflict, ambiguous ownership, security bypass, cross-tenant leakage, stale-writer acceptance, unbounded resource behavior, unproven recovery, scope drift, semantic drift, P0/P1 defect, or mismatched/fabricated evidence.
