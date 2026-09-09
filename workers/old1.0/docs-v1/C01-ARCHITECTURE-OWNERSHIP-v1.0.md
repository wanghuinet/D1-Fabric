# D1-Fabric C01 Architecture & Ownership v1.0

> Status: ACTIVE
> Scope: Worker topology, semantic ownership, API/data boundaries, migration gates

## 1. Architecture law

**Business owns meaning. Middleware owns capability.** Logical boundaries are frozen before physical Workers are created.

## 2. Frozen middleware topology

| Role | Worker | Responsibility |
|---|---|---|
| M00 Gateway | W01 | runtime/request boundary, request ID, deadline, CORS, execution entry |
| M01 Data Plane | W02 + W03 + W04 | routing, query, generic write |
| M02 Cache | W05 | generic cache/invalidation |
| M03 Control | W06 | generic integrity, recovery, migration/control |

W02/W03/W04 remain logically independent even if deployed as one physical data-plane unit. No new middleware Worker without a measurable scaling, isolation, reliability, or security requirement.

## 3. Frozen business ownership

B01 Identity/User; B02 Content; B03 Media; B04 Social; B05 Feed; B06 Recommendation; B07 Search; B08 Creator; B09 Notification; B10 Moderation; B11 Analytics; B12 Topic; B13 History; B14 Monetization.

Reserved logical boundaries only: B15 AI/Agent; B16 Realtime; B17 Ranking/Feature; B18 Developer Platform; B19 Design/Creative; B20 Payment/Order; B21 Trust/Security. Reserved does not mean an empty Worker is created.

## 4. Middleware purity

Middleware MUST NOT understand content types, authors, social actions, feed/recommendation/search/topic/history/notification/creator/monetization rules, business permissions, or business tables/fields.

W04 is generic INSERT/UPDATE/DELETE, transaction/write, idempotency, bounded retry/deadline, generic validation/error/result, and resource-boundary capability.

W06 is generic shard health, routing/epoch/control metadata, integrity, reconciliation/recovery, migration control, and operational diagnostics.

## 5. Mandatory W04/W06 migration gate

Existing business leakage is a **1.0 pre-development blocker**. The known W04 `publish.ts` semantics move to B02 Content; media/object semantics move to B03 Media; identity/author authorization remains B01. W06 content/media/identity-specific integrity rules move to their semantic owners.

Migration is **move-not-copy**:

```text
inventory → assign owner → owner contract → implement owner
→ wire callers → compatibility tests → boundary tests
→ remove old middleware semantics → full regression → purity audit
```

Never delete first. Never maintain two authoritative implementations. Existing successful behavior, failure behavior, idempotency, and persistence semantics remain compatible unless a versioned contract explicitly changes them.

## 6. API boundary

Business APIs use `/api/v1/*` with one shared request context, authentication/authorization model, error format, cursor pagination, and applicable idempotency semantics. Business Workers may declare permissions but may not create a second identity system or competing protocol.

## 7. Data boundary

```text
Business Owner → Data Contract → Schema → Index → Implementation → Verification
Business → D1-Fabric → D1
```

D1-Fabric is the generic data-access plane, not a business owner. Business Workers must not implement shard routing, cross-shard fan-out, generic retries, or recovery. Authoritative mutable state has one owner. R2 stores binary media; D1 stores media metadata/lifecycle state.

## 8. Hot-path cost architecture

The data plane is optimized for **billable work avoided**, not merely request latency. D1 billing is driven by rows read/written and storage; Workers billing includes requests and CPU time, while Cloudflare currently does not charge for D1/Workers egress.

### 8.1 Read path

```text
request
→ edge/cache termination where safely possible
→ bounded routing
→ W05 cache lookup where applicable
→ indexed narrow query on cache miss
→ return minimal projection
```

Rules:

- Never use a full-table scan on a hot path when an indexed lookup/range is possible.
- Prefer narrow projections over `SELECT *`.
- Prefer keyset/cursor pagination over offset pagination for large datasets.
- Cache stable/high-read, low-write results where staleness is contractually safe.
- Do not perform duplicate D1 reads to reconstruct data already available in the request context, cache, or prior query result.
- Do not synchronously fan out to many shards unless the API contract requires it and the fan-out has an explicit bound.
- Measure `rows_read` for representative hot queries; a query returning few rows is not cheap if it scans many rows.
- Do not assume D1 read replication lowers billing; replicated reads remain subject to D1 read accounting.
- Public/immutable/high-cacheability responses should terminate at the edge/cache whenever the business contract permits, avoiding unnecessary dynamic Worker and D1 execution.

### 8.2 Write path

```text
request
→ validate once
→ route once
→ bounded batch/transaction
→ commit once
```

Rules:

- Do not write unchanged values.
- Do not maintain duplicate authoritative counters/state unless explicitly required by the data contract.
- Batch related mutations when atomicity permits.
- Avoid unnecessary indexes on write-hot tables; every maintained index can add write amplification. Indexes must have measured read/cost benefit.
- Idempotency records must be bounded and purpose-specific; never create permanent write amplification without a retention/cleanup contract.
- Do not synchronously write analytics, recommendations, notifications, or other secondary business state on the critical path unless explicitly required by the active contract.
- Prefer state transitions that change one authoritative row over multi-table duplicate bookkeeping when the domain contract permits.

### 8.3 Cache architecture

W05 is the generic cache owner. Cache keys, TTL/staleness rules, invalidation semantics, size limits, and negative-cache behavior must be explicit per use case.

Cache is an optimization, never the authoritative business state. A cache miss MUST remain correct. Cache invalidation MUST NOT require business logic inside W05.

The system should distinguish **edge-cacheable**, **W05-cacheable**, and **D1-authoritative** data. Do not force every read through W05 when the response can safely be served directly by Cloudflare's edge cache.

### 8.4 Worker/RPC path

Use Service Bindings/RPC for internal Worker communication rather than public HTTP hops. Under current Workers Standard pricing, internal binding calls do not create an additional external request charge, but each extra invocation still consumes resource limits and CPU, so unnecessary hops remain forbidden.

The hot path should normally be a bounded chain, not a cascade. No request may perform unbounded Worker invocation, shard fan-out, retry, or recursive service calls.

### 8.5 Cost budget per endpoint

Every material hot-path endpoint MUST declare a cost envelope before implementation:

```text
max D1 statements
max D1 rows read
max D1 rows written
max shard fan-out
max Worker/RPC hops
max retries
max request/response payload
cache class + TTL/staleness rule
```

A benchmark MUST record actual `rows_read`, `rows_written`, Worker CPU, request count, latency, cache hit rate, and relevant storage/operation metrics. Cost claims require measured evidence.

### 8.6 Bill-minimization scaling law

When traffic grows, scaling MUST preferentially increase **cache hits and work reuse** rather than proportionally increasing authoritative D1 work.

Target direction:

```text
more users
→ more edge/cache hits
→ fewer dynamic executions per user request
→ fewer D1 rows read per dynamic request
→ fewer D1 rows written per mutation
→ bounded Worker CPU/RPC work
→ sublinear growth of billable backend work
```

The architecture MUST NOT claim that sharding alone lowers cost. Sharding is for capacity/isolation/routing; cost reduction comes from avoiding reads/writes, scans, duplicate state, unnecessary fan-out, and unnecessary execution.

## 9. B-layer query cost contract

The following rules are mandatory for every Business Worker that issues a READ through W03. They are part of the B-layer contract and MUST NOT be treated as optional optimization advice.

### 9.1 Ownership split

```text
B Layer
  ├─ owns business query meaning
  ├─ owns WHERE / projection / ordering semantics
  ├─ owns required LIMIT and pagination semantics
  ├─ owns index-aware query design
  └─ proves the query is bounded and appropriate for the business use case

D1-Fabric / W03
  ├─ owns generic execution/resource enforcement
  ├─ owns shard/fan-out bounds
  ├─ owns global response/resource budgets
  ├─ owns deadline/parallelism/payload protection
  └─ MUST NOT invent business query meaning
```

### 9.2 LIMIT is an execution-cost contract

A B-layer READ MUST NOT rely on response-side truncation as a substitute for SQL/D1 bounding.

Forbidden pattern:

```text
SELECT * FROM table
→ D1 scans/reads large result
→ application result.slice(0, maxRows)
```

`maxRows` applied after D1 execution does **not** prove or enforce a D1 `rows_read` budget.

Every hot B-layer READ MUST therefore provide an execution-bounded query, normally by using an explicit `LIMIT` together with a selective indexed predicate or equivalent bounded query shape. `SELECT *` is forbidden on hot paths unless explicitly justified by contract and evidence.

### 9.3 Global row budget across fan-out

`MAX_ROWS` is a **global request budget**, not a per-shard allowance.

For a request fanning out to N shards:

```text
GLOBAL_ROWS_RETURNED ≤ MAX_ROWS_GLOBAL
```

The implementation MUST NOT interpret `maxRows=1000` as `1000 rows × N shards`.

The B-layer contract MUST define the intended global result size, pagination behavior, and ordering semantics. W03 remains responsible for enforcing the generic global resource boundary without adding business meaning.

Per-shard execution may use smaller internal limits when needed, but those limits MUST NOT increase the global response/resource budget.

### 9.4 Query-plan and index evidence

For every material hot query, B-layer implementation evidence MUST show that the query shape is bounded and that an appropriate index exists where one is required. Query-plan evidence should demonstrate `SEARCH`/index usage when an indexed lookup/range is expected and must document any justified `SCAN`.

An index is not automatically a cost optimization: its write amplification must be considered. The B-layer owner must provide a measurable reason for every material index on a write-hot path.

### 9.5 Middleware guardrail

The B layer owns correct SQL/query design; Middleware owns the final generic safety boundary.

Therefore W03 MAY reject or warn on an unbounded/unsafe READ according to the active versioned query contract, but W03 MUST NOT invent business-specific SQL, indexes, filters, or pagination semantics.

If the generic middleware contract cannot safely determine whether a query is bounded, the correct behavior is **reject/STOP**, not silently execute an unbounded query.

### 9.6 H1/H2 closure status

The Middleware 1.0 verification identified two cost-boundary risks:

- **H1:** W03 `max_rows` response truncation alone does not constrain D1 `rows_read`; an unbounded SELECT can still cause large D1 reads.
- **H2:** applying `max_rows` independently per shard can produce `MAX_ROWS × fanout`, violating a global result budget.

These are recorded as **B-layer contract follow-up items**, not reasons to reopen the W01-W06 topology. They become mandatory requirements for B-layer READ contracts and middleware generic guardrails.

## 10. API/side-effect boundary

Hot paths must be bounded. No unbounded fan-out or synchronous side-effect cascade. Non-critical side effects may use an event contract when real infrastructure exists and the requirement is proven; no speculative queue/event Worker.

## 10.1 Business-layer interface reservation boundary

The middleware MUST expose stable **capability interfaces** that allow future Business Workers to connect without placing business semantics inside W01-W06. These are interfaces/adapters, not implementations of the future business domains.

| Reserved interface | Business owner(s) | Middleware boundary | Current policy |
|---|---|---|---|
| Object/Media interface | B03 Media, B02 Content | R2 object put/get/head/delete, signed/direct-upload authorization boundary, metadata handoff | Keep generic interface; no media business rules in middleware |
| Async Event/Queue interface | B06/B09/B10/B11/B07 and future domains | enqueue event/job, bounded retry/dead-letter semantics, delivery metadata | Keep generic; event meaning/schema belongs to B layer |
| Realtime Adapter interface | B16 Realtime, future live/chat/collaboration domains | Durable Objects/WebSocket/session transport adapter boundary | Reserve only; do not create live-room business logic in W01-W06 |
| Media Processing Adapter | B03 Media, future video/live domains | submit processing job, receive status/result references | Reserve only; FFmpeg/HLS/DASH/transcoding policy stays outside middleware |
| Search Provider Adapter | B07 Search | index/upsert/delete/query provider boundary | Reserve only; search ranking/query meaning stays in B07 |
| Identity Provider Adapter | B01 Identity/User | external identity/provider identity mapping boundary | Keep generic provider mapping; business account policy stays in B01 |
| Webhook/Event Delivery Adapter | B09/B11/B07 and future integrations | outbound event delivery, retry/status boundary | Reserve only; webhook meaning/subscription policy belongs to business |
| Observability interface | all business domains | request/trace IDs, metrics, latency, RPC/D1/cache/cost evidence | Mandatory generic telemetry; no business analytics semantics |

### 10.1.1 Hard separation rule

```text
Business Worker
  ↓ business contract
Stable Middleware Capability Interface
  ↓ generic execution
W01-W06
  ↓
Cloudflare / D1 / R2 / KV / Queue / future adapter infrastructure
```

The reverse dependency is forbidden:

```text
W01-W06 → Content/Feed/Social/Search/Topic/History/Live/Creator business meaning
```

Middleware interfaces MUST be generic enough that B01-B21 can use them without requiring middleware knowledge of tables such as posts, comments, follows, topics, campaigns, pages, translations, memberships, orders, rooms, or messages.

### 10.1.2 Realtime reservation

Realtime is intentionally an extension point, not a current middleware business feature. When B16 or another domain later needs live rooms, chat, presence, multiplayer state, collaborative editing, or WebSockets, the business Worker owns room/member/message semantics while a Realtime Adapter owns transport/session primitives. Durable Objects may be introduced only when the concrete workload and contract justify them.

### 10.1.3 Media reservation

R2 remains the authoritative object store. B03 owns media identity, ownership, lifecycle, visibility, attachment semantics, processing policy, and derived-media meaning. Middleware may provide generic object operations and upload/download boundaries. Video transcoding, FFmpeg, HLS/DASH packaging, thumbnails, subtitles, and P2P/distribution policy are external processing/distribution concerns and MUST NOT enter W01-W06.

### 10.1.4 Search reservation

B07 owns search semantics, fields, filters, ranking, relevance, pagination, and indexing policy. W01-W06 MUST NOT contain search-specific indexes, tokenization, ranking, or provider-specific business behavior. A future provider adapter may connect B07 to an external search engine without changing D1-Fabric ownership.

### 10.1.5 Identity and mini-program reservation

B01 owns the canonical user account. External identities (for example web, Apple, Google, WeChat/mini-program or other providers) must map through a generic identity-provider interface and a `user_identities`-style domain model; provider IDs MUST NOT become the primary user ID. Mini-program clients share `/api/v1/*` and do not receive a separate backend or database merely because they are a different client.

### 10.1.6 Event semantics reservation

Queue/Event infrastructure transports business events; it does not define them. Event names, payload schemas, producer/consumer ownership, ordering requirements, idempotency meaning, retention, and privacy rules belong to the relevant Business contract. Analytics, recommendation, notification, moderation, indexing, and other secondary work should consume events asynchronously where the active contract permits, rather than creating synchronous hot-path cascades.

### 10.1.7 Interface evolution rule

A reserved interface is not permission to add infrastructure speculatively. Before implementation, the business owner MUST provide:

```text
use case → contract → payload/DTO → cost envelope
→ failure/idempotency semantics → owner → tests → measured evidence
```

Adding a new adapter, changing a capability signature, or changing Worker topology is an architecture/contract change and follows Section 14.

## 11. 1.0 business scope

MVP closure:

`B01 + B02 + B03 + B04 + B05 + B06 + B07 + B12 + B13`

Core path:

`注册 → 登录 → 个人资料 → 发布 → Feed → 浏览 → 点赞 → 评论 → 收藏 → 关注 → 推荐 → 搜索 → 话题 → 历史`

B08/B09/B10/B14 are V2. B15-B21 are later. Do not implement future scope opportunistically.

## 12. Feed/Recommendation/Search

Feed uses cursor pagination and bounded fan-out. MVP ranking uses freshness, time decay, basic popularity, and basic interest; complex ML ranking is deferred. Search may index/discover but D1 remains authoritative business state.

## 13. Deployment topology

Every independently deployable Worker owns its own `package.json`, Wrangler configuration, source, tests, and README. It must be independently installable, testable, buildable, deployable, and rollback-capable. Do not create a giant root dependency package.

## 14. Architecture change gate

No agent may change Worker topology, semantic ownership, public API version, routing/epoch meaning, schema ownership, or infrastructure class implicitly. Such changes require a versioned contract change and approval.
