# Business Platform v1.1 Roadmap — API First / MVP Launch

**Date:** 2026-09-09  
**Status:** PLANNING / HUMAN REVIEW REQUIRED  
**Authority:** Planning document only. It does not silently modify or supersede any frozen v1.0 contract.  
**Goal:** Freeze the minimum future-proof business boundary, then ship a runnable simplified Toutiao-style APP API before implementing the broader platform.

---

## 1. Product strategy

The implementation order is deliberately:

```text
Architecture / ownership review
→ close non-rework data contract
→ basic API skeleton
→ MVP business APIs
→ end-to-end runnable APP
→ production evidence
→ iterative business expansion
```

The immediate target is **not** the complete content ecosystem. The immediate target is a **small, deployable, testable, usable headless API** that can power Web / Android / iOS / mini-program clients.

The platform must not be forced to wait for future features such as live rooms, commerce, memberships, ads, AI agents, or advanced recommendation.

However, their **extension interfaces and ownership boundaries are reserved now** so that future work does not require changing the core architecture or replacing the user/content model.

---

## 2. Non-rework law

Before MVP implementation, the following are frozen at the architectural/data-contract level:

- canonical user ID model;
- external identity mapping model;
- content lifecycle;
- locale / translation model;
- media reference model;
- topic / hashtag / collection boundaries;
- creator/channel boundary;
- pagination and ID representation;
- request context;
- error format;
- idempotency semantics;
- event/queue boundary;
- future capability extension points.

Future functionality may add tables/endpoints, but must not require renaming/removing/reinterpreting these primitives.

Do **not** create speculative implementation for future business domains merely to make the architecture look complete.

---

## 3. Frozen physical architecture target

### Middleware

```text
W01 Runtime Gateway
W02 Shard Router
W03 Query Engine
W04 Write Engine
W05 Cache
W06 Control & Recovery
```

### Initial business API layer

```text
W07 API/BFF
W08 Identity
W09 Content
W10 Feed
W12 Social / Interaction
W13 Search
```

No new Worker is created for each feature.

Logical business domains remain independently owned even when physically merged into one Worker.

---

## 4. Business ownership target

| Domain | Owner | Initial status |
|---|---|---|
| B01 Identity/User | W08 | MVP |
| B02 Content | W09 | MVP |
| B03 Media | W09 capability boundary | MVP reference model |
| B04 Social | W12 | MVP |
| B05 Feed | W10 | MVP |
| B06 Recommendation | W10 | MVP/simple rules |
| B07 Search | W13 | MVP |
| B08 Creator | W09 boundary | Reserved / incremental |
| B09 Notification | future business implementation | Interface reserved |
| B10 Moderation | future | Interface reserved |
| B11 Analytics | future | Interface reserved |
| B12 Topic | W09 | MVP |
| B13 History | W10 | MVP |
| B14 Monetization | future | Interface reserved |
| B15 AI/Agent | future | Reserved |
| B16 Realtime/Communication | future | Reserved |
| B17 Ranking/Feature | future | Reserved |
| B18 Developer Platform | future | Reserved |
| B19 Design/Creative | future | Reserved |
| B20 Payment/Order | future | Reserved |
| B21 Trust/Security | future | Reserved |

---

# 5. Phase 0 — Contract closure before coding

**Purpose:** eliminate the database/API decisions most likely to cause later rework.

### Must close before MVP code

1. `user_identities` exists as the external identity mapping primitive.
2. API IDs are serialized as decimal strings even if D1 stores INTEGER IDs.
3. Content lifecycle supports at least:
   - DRAFT
   - SCHEDULED
   - PUBLISHED
   - ARCHIVED
4. `publish_at`, `published_at`, and future unpublish/archival timestamps have defined semantics.
5. Locale model exists without language-specific columns such as `title_en` / `title_zh`.
6. Translation is manual and stored separately; no automatic translation implementation.
7. Media is metadata/reference in D1 and object storage in R2.
8. Topic, hashtag, collection, campaign, and page are explicitly different concepts.
9. User and creator/channel are not permanently forced to be the same entity.
10. Cursor pagination is standardized.
11. Request context includes locale/client information and trace/request identifiers.
12. Idempotency behavior is standardized for writes.
13. Queue/event boundary is reserved for asynchronous side effects.
14. Future realtime/media-processing/search-provider/identity-provider/webhook adapters are generic interfaces only.

### Phase 0 output

```text
v1.1 business schema contract
v1.1 DTO contract
v1.1 OpenAPI contract
v1.1 RPC contract
v1.1 migration
Change Manifest
```

**No business implementation begins until Phase 0 is accepted.**

---

# 6. Phase 1 — Basic API First

**Goal:** get the APP running as quickly as possible with the smallest useful business surface.

## 6.1 W07 API/BFF

Implement only:

```text
/api/v1/*
request validation
request context
authentication context propagation
DTO serialization
standard errors
cursor parsing
idempotency header handling
```

W07 is not a business data owner.

## 6.2 W08 Identity

MVP APIs:

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/me
GET  /api/v1/users/:id
```

MVP identity model:

```text
users
user_identities
```

The canonical user ID remains internal and stable. Provider IDs are mappings only.

Session/token storage should prefer the agreed low-write state mechanism rather than creating unnecessary D1 write traffic.

## 6.3 W09 Content

MVP APIs:

```text
POST   /api/v1/posts
GET    /api/v1/posts/:id
PATCH  /api/v1/posts/:id
DELETE /api/v1/posts/:id
GET    /api/v1/users/:id/posts
```

MVP supports:

```text
text
image reference
video reference
mixed content
```

The content model must already preserve lifecycle semantics so that schedule/publish can be added without redesign.

## 6.4 W10 Feed

MVP APIs:

```text
GET /api/v1/feed
GET /api/v1/feed/following
GET /api/v1/feed/hot
```

MVP recommendation is intentionally simple. Do not build a complex ML/recommendation platform before the basic product is online.

Cost target:

```text
Cache hit → 0 D1
Cache miss → bounded D1 read
No per-item RPC
No per-item D1 query
```

## 6.5 W12 Social / Interaction

MVP APIs:

```text
POST   /api/v1/posts/:id/like
DELETE /api/v1/posts/:id/like
POST   /api/v1/posts/:id/favorite
DELETE /api/v1/posts/:id/favorite
GET    /api/v1/posts/:id/comments
POST   /api/v1/posts/:id/comments
POST   /api/v1/comments/:id/like
POST   /api/v1/users/:id/follow
DELETE /api/v1/users/:id/follow
```

Like/favorite/follow writes must be idempotent or safely repeatable according to the contract.

## 6.6 W13 Search

MVP:

```text
GET /api/v1/search?q=&type=&cursor=
```

Start with the simplest valid implementation. Search provider replacement remains behind the Search Provider Adapter boundary.

## 6.7 Topic / History

These are MVP business capabilities but do not justify additional Workers.

Topic:

```text
GET /api/v1/topics
GET /api/v1/topics/:id
GET /api/v1/topics/:id/posts
```

History:

```text
GET /api/v1/history
```

History can start with a bounded/simple implementation and evolve later.

---

# 7. Phase 1 MVP end-to-end path

The first complete runnable path is:

```text
Register
  ↓
Login
  ↓
Get Me
  ↓
Create Post
  ↓
Attach Media Reference
  ↓
Publish
  ↓
Feed Read
  ↓
Post Detail
  ↓
Like / Favorite
  ↓
Comment
  ↓
Follow
  ↓
Search
  ↓
Topic
  ↓
History
```

This is the **minimum product loop** that must work before expanding the platform.

---

# 8. Phase 2 — Content completeness without topology change

After MVP is online, add:

```text
Draft management
Schedule publish
Unpublish/archive
Manual translation
Hashtag
Mention
Poll
Collection / Playlist / Series
Creator profile
Creator channels
```

These capabilities remain inside existing business ownership. They do not automatically create new Workers.

Suggested data primitives already reserved in the contract:

```text
locales
translation_groups
post_translations
comment_translations
hashtags
content_hashtags
mentions
polls
poll_options
poll_votes
collections
collection_items
creator_profiles
creator_channels
content_schedules
```

---

# 9. Phase 3 — Platform ecosystem

Implement only when product demand exists:

### B09 Notification

```text
in-app
push
email
mentions
subscription notifications
```

Architecture:

```text
Business Event
→ Queue
→ Notification
```

### B10 Moderation

```text
report
review
appeal
safety action
```

### B11 Analytics

```text
impression
view
click
engagement
creator analytics
experiments
```

### B14 Monetization

```text
membership
subscription
advertising
commerce
affiliate
revenue
```

### B20 Payment / Order

```text
order
payment
refund
transaction
provider adapter
```

B14 defines monetization meaning; B20 owns actual payment/order execution.

---

# 10. Phase 4 — Realtime / advanced platform

Reserved now, implemented later:

```text
B16 Realtime
  ├── DM
  ├── Group Chat
  ├── Broadcast
  ├── Live Chat
  ├── Presence
  └── Realtime Reaction
```

Technical boundary:

```text
Realtime Adapter
→ Durable Objects / WebSocket
```

D1-Fabric does not become a live-room engine.

Media processing remains:

```text
B03
→ Media Processing Adapter
→ FFmpeg / GPU / VPS / processing service
→ R2
```

R2 remains the authoritative binary store.

---

# 11. Phase 5 — Advanced discovery and ecosystem

Later capabilities:

```text
B06 Recommendation
B17 Ranking / Feature
B07 Search Provider
B18 Developer Platform
B19 Design / Creative
B15 AI / Agent
```

These are added behind existing capability boundaries and do not require changing the W01-W06 middleware topology.

---

# 12. P0 schema principle

The minimum schema should be **future-safe, not future-complete**.

### Freeze now

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
polls
poll_options
poll_votes
collections
collection_items
creator_profiles
creator_channels
notifications
notification_preferences
topics
topic_contents
content_schedules
```

The MVP may expose only a subset of these tables through API endpoints.

### Do not create yet

```text
subscriptions
membership_tiers
entitlements
products
content_products
creator_products
live_rooms
live_messages
conversations
conversation_members
messages
reports
moderation_cases
ad_campaigns
ads
ad_creatives
orders
payments
```

These are contract-reserved and are created when their business phase starts.

---

# 13. Reserved interfaces

The following interfaces must exist conceptually in the v1.1 contract but do not require full implementation in MVP:

```text
Object / Media Adapter
Async Event / Queue Adapter
Realtime Adapter
Media Processing Adapter
Search Provider Adapter
Identity Provider Adapter
Webhook / Event Delivery Adapter
Observability Adapter
```

Hard rule:

```text
Business Worker
→ business contract
→ generic capability interface
→ W01-W06
→ Cloudflare infrastructure / future adapter
```

Never reverse this dependency.

---

# 14. Cost contract for MVP

The MVP is accepted only if the following principles are demonstrated:

```text
Cache hit        → 0 D1
Normal read      → ideally 1 D1
Primary write    → ideally 1 write
Side effect      → Queue
Feed item        → no per-item RPC
Feed item        → no per-item D1 query
```

Every high-frequency endpoint must record:

```text
Worker count
RPC count
D1 statements
D1 rows read
D1 rows written
Cache hit/miss
Queue operations
```

No endpoint is considered complete merely because its HTTP response is correct.

---

# 15. MVP acceptance gate

The simplified APP API is ready for first deployment only when all are true:

- all MVP OpenAPI routes are implemented;
- all DTOs match implementation;
- migration applies from clean state;
- each Worker has its own `package.json`;
- Workers deploy independently;
- W01-W06 are consumed through their approved capability interfaces;
- no business semantics are added to W01-W06;
- authentication works end-to-end;
- content create/read/update/delete works;
- publish → feed → detail works;
- like/favorite/comment/follow works;
- search works;
- topic works;
- history works;
- cursor pagination is tested;
- idempotency is tested;
- authorization boundaries are tested;
- failure/timeout cases are tested;
- D1/RPC budget evidence exists;
- clean deployment succeeds;
- integration test passes;
- evidence and commit are recorded.

---

# 16. AI implementation rule

DeepSeek is not allowed to reinterpret this roadmap.

For each phase:

```text
Read contract
→ implement exactly the declared scope
→ run targeted tests
→ run adversarial/boundary tests
→ run cost checks
→ produce Change Manifest
→ commit
→ push
→ report evidence
→ stop
```

If implementation reveals a genuine contract defect:

```text
STOP
→ report exact conflict
→ propose versioned contract change
→ wait for approval
```

Do not silently edit the database, Worker topology, API semantics, or ownership boundaries.

---

# 17. Final implementation order

```text
STEP 0
Close v1.1 business contract / schema / DTO / OpenAPI / RPC

STEP 1
Basic W07 API/BFF skeleton

STEP 2
W08 Identity

STEP 3
W09 Content + Media reference

STEP 4
W10 Feed

STEP 5
W12 Social / Interaction

STEP 6
W13 Search

STEP 7
Topic + History within existing Workers

STEP 8
End-to-end integration

STEP 9
Cost / concurrency / security acceptance

STEP 10
Deploy MVP

STEP 11
Only after MVP is running: Draft/Schedule/Translation/Hashtag/Mention/Poll/Collection/Creator expansion

STEP 12
Only when product demand exists: Notification / Moderation / Analytics / Monetization / Realtime / Commerce / AI / Developer Platform
```

---

# 18. Decision summary for human review

### Freeze now

```text
Architecture
Worker ownership
User identity model
Content lifecycle
Locale/translation model
Media reference model
Cursor / ID / error conventions
Capability interfaces
Cost rules
```

### Build now

```text
Auth
User
Post
Media reference
Publish
Feed
Like
Favorite
Comment
Follow
Search
Topic
History
```

### Reserve now, build later

```text
Schedule
Translation
Hashtag
Mention
Poll
Collection
Creator/Channel
Notification
Moderation
Analytics
Membership
Commerce
Ads
Payment
Realtime
AI/Agent
Developer Platform
Design/Creative
```

### Never do

```text
Do not create one Worker per feature.
Do not put business semantics into W01-W06.
Do not create speculative future tables without a business phase.
Do not create a second backend for mini-programs.
Do not make provider IDs the canonical user ID.
Do not use language-specific columns for multilingual content.
Do not make D1 the binary media store.
Do not put synchronous notification/search/media side effects on the hot path.
Do not let DeepSeek silently redesign a frozen contract.
```
