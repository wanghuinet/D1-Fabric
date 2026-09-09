# Business API v1.1 — FROZEN MVP Contract

**Effective:** 2026-09-09
**Status:** FROZEN / API-FIRST MVP
**Authority:** This document is the v1.1 business contract gate. Canonical OpenAPI, DTO, migration, RPC and schema artifacts under `docs/api/v1.1/` must remain mutually consistent.

## 1. Purpose

v1.1 is the first runnable, headless Toutiao-style MVP. It prioritizes a small complete user journey over breadth while freezing the foundations that would otherwise cause database or API rework.

Target journey:

```text
register/login
→ user
→ create content
→ media reference
→ publish
→ home/following/hot feed
→ content detail
→ like/favorite/comment/follow
→ search
→ topic/history
```

## 2. Public API surface

### Identity
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/me`
- `GET /api/v1/users/{id}`

### Content
- `POST /api/v1/posts`
- `GET /api/v1/posts/{id}`
- `PATCH /api/v1/posts/{id}`
- `DELETE /api/v1/posts/{id}`
- `GET /api/v1/users/{id}/posts`
- `POST /api/v1/posts/{id}/publish`

### Media
- upload-authorization/reference endpoint is part of the v1.1 Media boundary; binary data is stored in R2, metadata/reference in D1.

### Feed
- `GET /api/v1/feed`
- `GET /api/v1/feed/following`
- `GET /api/v1/feed/hot`

### Interaction
- `POST|DELETE /api/v1/posts/{id}/like`
- `POST|DELETE /api/v1/posts/{id}/favorite`
- `GET|POST /api/v1/posts/{id}/comments`
- `POST|DELETE /api/v1/comments/{id}/like`
- `POST|DELETE /api/v1/users/{id}/follow`

### Search
- `GET /api/v1/search`

### Topic / History
- Minimum read/write interfaces required by the MVP journey are reserved in the v1.1 contract. Their business semantics remain owned by B12 Topic and B13 History.

## 3. Canonical data foundations

The following primitives are frozen before implementation:

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
```

### Mandatory invariants

1. `users.id` is the canonical internal user ID.
2. External provider identifiers live in `user_identities`; they are never canonical user IDs.
3. API IDs are decimal strings even when D1 uses INTEGER IDs, preventing JavaScript integer precision loss.
4. Locale is represented by locale codes; no language-specific columns are permitted.
5. Original content remains canonical. Human-created translations are separate records. No automatic translation is part of MVP.
6. Content lifecycle reserves draft, scheduled, published and archived semantics using `publish_at`, `published_at`, and `unpublish_at`.
7. Media binaries are authoritative in R2; D1 stores metadata and object references.
8. Topic, hashtag, collection, campaign and page are distinct concepts.

## 4. Deferred capabilities

These are extension boundaries, not MVP implementations:

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

Future interfaces:

```text
Realtime Adapter
Media Processing Adapter
Search Provider Adapter
Identity Provider Adapter
Webhook/Event Delivery Adapter
Observability
```

No future Worker or speculative empty subsystem is created in MVP.

## 5. Physical Worker topology

```text
W01 Runtime Gateway
W02 Shard Router
W03 Query Engine
W04 Write Engine
W05 Cache
W06 Control & Recovery

W07 API/BFF
W08 Identity
W09 Content + Media + Topic
W10 Feed + Recommendation + History
W12 Social + Interaction
W13 Search
```

W11 is not a physical Worker in v1.1. Interaction is physically merged into W12 while remaining a logically independent business capability.

## 6. API context and compatibility

Every request must support a normalized context containing, where applicable:

```text
request_id
trace_id
tenant_id
namespace
user_id
locale
client_type
client_version
auth_context
idempotency_key
deadline
resource_budget
```

Public error shape is stable. Cursor pagination is deterministic and bounded. Retryable writes use idempotency semantics.

## 7. Cost contract

```text
cache hit       → 0 D1
normal read     → ideally 1 D1
primary write   → ideally 1 write
side effects    → Queue / async
```

Additional rules:

- No per-feed-item RPC.
- Feed enrichment is batched.
- Normal business reads target no more than 2 internal RPC hops.
- Interaction writes target one business RPC and one primary write.
- Search targets one business RPC.
- D1 reads must be bounded by database execution, not response truncation.

## 8. Client model

Web, Android, iOS and mini-programs share `/api/v1`. Mini-program authentication is an identity-provider adapter mapped to the canonical user through `user_identities`; there is no mini-program-specific backend or database.

## 9. Change control

v1.1 is frozen. No silent endpoint, DTO, schema, Worker ownership, RPC or business-truth changes are allowed. Additive compatible changes require updated contract and tests first; breaking changes require v1.2+.

## 10. Implementation gate

Implementation begins only after the v1.1 canonical OpenAPI, DTO, migration, RPC contract and schema/cost document have been validated together.

The first coding phase is the basic API skeleton. No future feature may delay the MVP path.
