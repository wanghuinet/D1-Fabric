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
