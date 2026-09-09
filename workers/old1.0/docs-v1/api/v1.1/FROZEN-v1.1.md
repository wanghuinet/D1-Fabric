# Business API v1.1 — FROZEN MVP Contract

**Effective:** 2026-09-09  
**Status:** FROZEN / API-FIRST MVP  
**Authority:** This document plus the canonical OpenAPI, DTO, migration, RPC and schema/cost artifacts under `docs/api/v1.1/` form one contract set. If any artifact disagrees, implementation is blocked.

## 1. Objective

Ship a small, real, deployable Toutiao-style content/social MVP without foreseeable identity, localization, lifecycle or media rework.

```text
register/login → user → create content → media → publish
→ home/following/hot feed → detail → like/favorite/comment/follow
→ search → topic/history
```

## 2. Physical topology

```text
W07 API/BFF
W08 Identity
W09 Content + Media + Topic
W10 Feed + Recommendation + History
W12 Social + Interaction
W13 Search
```

W11 is not a physical Worker in v1.1. W01-W06 remain unchanged generic infrastructure.

## 3. Public API

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

The endpoint authorizes direct R2 upload. D1 stores metadata/reference; binaries are never stored in D1.

### Feed
```text
GET /api/v1/feed
GET /api/v1/feed/following
GET /api/v1/feed/hot
```

### Social / interaction
```text
POST|DELETE /api/v1/posts/{id}/like
POST|DELETE /api/v1/posts/{id}/favorite
POST|DELETE /api/v1/users/{id}/follow
POST|DELETE /api/v1/comments/{id}/like
GET|POST     /api/v1/posts/{id}/comments
```

### Search
```text
GET /api/v1/search?q=&type=&cursor=&limit=
```

### Topic / history
```text
GET  /api/v1/topics/{id}
GET  /api/v1/topics/{id}/posts
GET  /api/v1/history
POST /api/v1/history/events
```

## 4. P0 data foundations

```text
users
user_identities
locales
translation_groups
posts
post_translations
media
post_media
comments
comment_translations
likes
favorites
follows
hashtags
content_hashtags
mentions
collections
collection_items
topics
topic_contents
content_schedules
content_views
```

Required invariants:

1. `users.id` is the canonical user ID.
2. External IDs live in `user_identities` and never become canonical IDs.
3. API IDs are decimal strings; D1 may use INTEGER internally.
4. Locale uses locale codes; no language-specific columns.
5. Original content is canonical; translations are human-created separate records; no automatic translation in MVP.
6. Lifecycle reserves draft/review/scheduled/published/updated/archived semantics and `publish_at`, `published_at`, `unpublish_at`.
7. R2 is authoritative for binaries; D1 stores media metadata/object references.
8. Topic, hashtag, collection, campaign and page are distinct concepts.

## 5. Deferred capabilities

Only interfaces/boundaries are reserved now:

```text
B08 Creator / Channel
B09 Notification
B10 Moderation
B11 Analytics
B14 Monetization
B15 AI / Agent
B16 Realtime / Communication
B17 Ranking / Feature
B18 Developer Platform
B19 Design / Creative
B20 Payment / Order
B21 Trust / Security
```

Reserved adapters: Realtime, Media Processing, Search Provider, Identity Provider, Webhook/Event Delivery, Observability. No future Worker or speculative subsystem is implemented for MVP.

## 6. Context / compatibility

Normalized request context supports:

```text
request_id / trace_id / tenant_id / namespace / user_id
locale / client_type / client_version / auth_context
idempotency_key / deadline / resource_budget
```

All list APIs use deterministic bounded cursor pagination. Public errors use one stable envelope. Retryable writes use idempotency semantics.

## 7. Cost contract

```text
cache hit     → 0 D1
normal read   → ideally 1 D1
primary write → ideally 1 write
side effects  → Queue / async
```

No per-item RPC. Feed enrichment is batch-oriented. Normal business reads target ≤2 internal RPC hops. Interaction target is one business RPC plus one primary write. Search targets one business RPC. D1 row limits must be enforced at execution, not by response truncation.

## 8. Client model

Web, Android, iOS and mini-programs share `/api/v1`. Mini-program providers map through `user_identities`; no separate backend or database.

## 9. Non-rework rule

After freeze, DeepSeek must not redesign Workers, split/merge topology, redesign P0 tables, invent endpoints, change ownership, add per-item RPC, or implement deferred domains. Breaking changes require v1.2+.

## 10. Implementation gate

Before coding, validate these artifacts together:

```text
FROZEN-v1.1.md
openapi.yaml
dto.ts
migrations/0001_business_mvp_v1_1.sql
RPC-CONTRACT-v1.1.md
B01-BUSINESS-SCHEMA-API-DESIGN-v1.1.md
```

Then execute only:

```text
W07 API skeleton
→ W08 Identity
→ W09 Content/Media/Topic
→ W10 Feed/History
→ W12 Social/Interaction
→ W13 Search
→ E2E
→ security/cost/concurrency acceptance
→ deploy
```
