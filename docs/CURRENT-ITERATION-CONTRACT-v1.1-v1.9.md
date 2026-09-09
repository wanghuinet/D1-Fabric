# D1-Fabric Current Iteration Contract v1.1–v1.9

**Effective:** 2026-09-09  
**Status:** ACTIVE / PRIMARY PRODUCT ITERATION CONTRACT  
**Authority:** This document is the single active roadmap and product-scope contract for v1.1–v1.9. C00/C01/C02 remain authoritative for constitution, architecture/ownership, and engineering operations. Historical documents under `archive/` have no active authority.

## 1. Product objective

D1-Fabric evolves from a database/middleware project into a reusable content distribution platform. v1.1 must produce a real, deployable content/social API that powers first-party clients and allows approved third-party developers to build vertical apps without knowing D1, sharding, Workers, or internal storage topology.

Core loop:

```text
Developer/Admin → publish text/image/video → API → Feed/H5/Android
→ like/follow/comment → behavior data → later discovery/recommendation
```

## 2. Architecture rule

Keep W01–W06 generic infrastructure. Do not move business semantics into middleware. The current v1.1 business topology defined by the frozen API set is W07 API/BFF, W08 Identity, W09 Content+Media+Topic, W10 Feed+Recommendation+History, W12 Social+Interaction, W13 Search. W11 is not a physical Worker in v1.1. Do not add Workers merely because a future logical boundary exists.

Business code owns meaning. D1-Fabric owns generic routing/query/write/cache/recovery capabilities. H5, Android, iOS and third-party apps consume the same public contract.

## 3. Minimum-code data model

The existing v1.1 migration is the canonical starting point. Do not replace it with a parallel schema. The core model is:

```text
users
user_identities
locales / translation_groups
posts / post_translations
media / post_media
comments / comment_translations
likes / favorites / follows
hashtags / content_hashtags / mentions
topics / topic_contents
collections / collection_items
content_schedules
content_views
```

### Canonical field decisions

`users`: `id`, `username`, `nickname`, `avatar_key`, `bio`, `status`, `created_at`, `updated_at`.

`posts`: `id`, `author_id`, `translation_group_id`, `content_type`, `text`, `status`, `visibility`, `publish_at`, `published_at`, `unpublish_at`, `archived_at`, `created_at`, `updated_at`.

`content_type` is only `text|image|video|mixed`. Do not create separate Article/Gallery/Video tables. A vertical app filters or presents the same content contract.

`media`: `id`, `owner_id`, `media_type`, `object_key`, `width`, `height`, `duration_ms`, `status`, timestamps. R2 owns binary objects; D1 owns metadata/reference only.

`post_media`: content/media relationship plus `sort_order`.

`comments`: `id`, `post_id`, `author_id`, `parent_id`, `text`, `status`, timestamps. `parent_id=NULL` is a top-level comment; non-null is a reply. Do not create a second reply table.

`likes`, `favorites`, `follows` use composite primary keys for idempotency. A user cannot like/favorite the same post twice or follow themselves.

Topics, hashtags, mentions, collections, schedules and history remain separate concepts. Do not collapse semantically different concepts merely to reduce table count.

## 4. Public API v1.1

### Identity

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/me
GET  /api/v1/users/{id}
GET  /api/v1/users/{id}/posts
```

### Content / publishing

```text
POST   /api/v1/posts
GET    /api/v1/posts/{id}
PATCH  /api/v1/posts/{id}
DELETE /api/v1/posts/{id}
POST   /api/v1/posts/{id}/publish
POST   /api/v1/posts/{id}/schedule
POST   /api/v1/posts/{id}/unpublish
POST   /api/v1/posts/{id}/archive
GET    /api/v1/posts/drafts
GET    /api/v1/posts/scheduled
```

### Media

```text
POST /api/v1/media/upload-authorizations
```

The server authorizes direct R2 upload. Binaries never pass through D1 and are never stored in D1.

### Feed

```text
GET /api/v1/feed
GET /api/v1/feed/following
GET /api/v1/feed/hot
```

All list APIs use bounded deterministic cursor pagination.

### Interaction

```text
POST|DELETE /api/v1/posts/{id}/like
POST|DELETE /api/v1/posts/{id}/favorite
POST|DELETE /api/v1/users/{id}/follow
POST|DELETE /api/v1/comments/{id}/like
GET|POST     /api/v1/posts/{id}/comments
```

### Search / discovery / history

```text
GET  /api/v1/search?q=&type=&cursor=&limit=
GET  /api/v1/topics/{id}
GET  /api/v1/topics/{id}/posts
GET  /api/v1/history
POST /api/v1/history/events
```

## 5. Third-party Developer API principle

The public contract is API-first. An approved developer receives a client/application identity and permissions; the developer never receives direct D1 access. API credentials are not stored as plaintext secrets. Client scope, rate limits, authorization, idempotency and versioning are enforced at the API boundary.

A vertical app is a presentation/distribution layer over the same content contract:

```text
D1-Fabric → Business API → Developer Client → Vertical App
                              ├─ technology
                              ├─ photography
                              ├─ automobile
                              └─ other approved verticals
```

The same `post` can be text/image/video/mixed. A vertical app chooses filters, topics and presentation; it does not fork the backend.

## 6. H5 contract

Public H5 and API use the same business services and data contract. H5 is a renderer, not a second business implementation. The canonical content endpoint and the public page must agree on identity, lifecycle, media, author, counts and visibility. Android/Web/iOS receive the same semantic object model.

## 7. Cost and performance laws

```text
cache hit       → 0 D1
normal read     → ideally 1 D1
primary write   → ideally 1 write
side effects    → asynchronous
per-item RPC    → prohibited
unbounded scan  → prohibited
```

Normal business reads target at most two internal RPC hops. Interaction targets one business RPC plus one primary write. Feed enrichment is batch-oriented. D1 row limits are enforced at query execution, not only after response construction.

## 8. v1.1 scope

Ship the smallest complete loop, not a partial feature demo:

```text
Auth/User
+ text/image/video/mixed content
+ media/R2 reference
+ draft/publish/schedule/archive
+ home/following/hot feed
+ content detail
+ like/favorite/follow
+ comments/replies
+ search/topic/history primitives
+ Admin publishing surface
+ public H5 rendering
+ Android API integration
+ developer-facing API contract
```

No recommendation ML, realtime messaging, payments, complex analytics, AI agents, or advanced moderation is required to release v1.1.

## 9. v1.2–v1.9 roadmap

### v1.2 — Social completion

Complete the interaction loop: comment replies, mentions, sharing, notification primitives, richer interaction state, abuse-safe idempotency and interaction UX. Reuse existing content/user/action ownership; do not create parallel social tables without a contract reason.

### v1.3 — Creator platform

Creator profile, creator dashboard, drafts, scheduled publishing, content management, basic creator analytics and channel/collection presentation. Reuse the same Content/Media/Interaction model.

### v1.4 — Discovery

Search quality, topics, hashtags, trending and discovery surfaces. Search provider remains an adapter; business semantics stay outside middleware.

### v1.5 — Recommendation

Ranking, recall, interest signals and personalized feed. Start with deterministic signals and measured data. Introduce ML/vector systems only when real traffic/data justifies them.

### v1.6 — Media expansion

Video processing/playback, richer media lifecycle, audio and streaming adapters. R2 remains object storage; processing is an adapter, not a reason to contaminate D1-Fabric.

### v1.7 — Platform operations

Complete notification/message capabilities, moderation, abuse prevention and operational controls. Keep synchronous hot paths small; use asynchronous side effects.

### v1.8 — AI

AI search, content assistance, creator assistance, moderation assistance and recommendation intelligence. AI is an upper-layer service and must not redefine D1-Fabric ownership.

### v1.9 — Ecosystem

Developer platform maturity, governance, anti-abuse, monetization primitives, quotas, billing interfaces and stable public API evolution.

## 10. Development method

Every implementation follows:

```text
Contract → Owner → Data Contract → Schema/Index → Implementation
→ targeted tests → adversarial/boundary tests → cost/performance
→ security → diff scope gate → commit → push → CI → evidence
```

AI agents implement contracts; they do not redesign architecture, split/merge Workers, invent endpoints, change ownership, add speculative infrastructure, or implement future phases early. A genuine architecture conflict is STOP → report → versioned proposal → approval → implement.

## 11. Security / correctness gate

No release is accepted on compilation alone. Required checks include authentication/authorization boundaries, input validation, object ownership, lifecycle authorization, SQL parameterization, CORS policy, rate limiting, idempotency, duplicate-action protection, pagination boundary tests, concurrency tests, migration tests, cross-tenant/client isolation where applicable, secret handling, error-envelope stability, and negative/adversarial tests.

"Zero defect" means no known unverified blocker after the defined acceptance suite; it is never a claim of mathematical perfection.

## 12. Definition of Done for each version

A version is complete only when:

1. Contract and implementation agree.
2. No forbidden scope changes exist.
3. Migration is reproducible.
4. All targeted and adversarial tests pass.
5. Public API examples work against the deployed build.
6. Cost/read/write budgets are demonstrated on high-frequency paths.
7. Security gates pass.
8. CI is green.
9. Git diff is reviewed and limited to the declared scope.
10. Evidence is recorded before the next version begins.

## 13. Authority rule

This contract replaces older roadmap/business-planning documents for v1.1–v1.9. `C00-CONSTITUTION-v1.0.md`, `C01-ARCHITECTURE-OWNERSHIP-v1.0.md` and `C02-ENGINEERING-OPERATIONS-v1.0.md` remain active foundational contracts. Historical copies are retained only under `archive/` for auditability and have no authority over implementation.
