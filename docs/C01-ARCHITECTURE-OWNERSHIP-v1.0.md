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

## 8. API/side-effect boundary

Hot paths must be bounded. No unbounded fan-out or synchronous side-effect cascade. Non-critical side effects may use an event contract when real infrastructure exists and the requirement is proven; no speculative queue/event Worker.

## 9. 1.0 business scope

MVP closure:

`B01 + B02 + B03 + B04 + B05 + B06 + B07 + B12 + B13`

Core path:

`注册 → 登录 → 个人资料 → 发布 → Feed → 浏览 → 点赞 → 评论 → 收藏 → 关注 → 推荐 → 搜索 → 话题 → 历史`

B08/B09/B10/B11/B14 are V2. B15-B21 are later. Do not implement future scope opportunistically.

## 10. Feed/Recommendation/Search

Feed uses cursor pagination and bounded fan-out. MVP ranking uses freshness, time decay, basic popularity, and basic interest; complex ML ranking is deferred. Search may index/discover but D1 remains authoritative business state.

## 11. Deployment topology

Every independently deployable Worker owns its own `package.json`, Wrangler configuration, source, tests, and README. It must be independently installable, testable, buildable, deployable, and rollback-capable. Do not create a giant root dependency package.

## 12. Architecture change gate

No agent may change Worker topology, semantic ownership, public API version, routing/epoch meaning, schema ownership, or infrastructure class implicitly. Such changes require a versioned contract change and approval.
