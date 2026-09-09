# Phase 0 Architecture Decisions v1.1 — API-First MVP

**Date:** 2026-09-09
**Status:** DECIDED / READY FOR CONTRACT UPDATE
**Authority:** Approved planning decision for the next contract revision. It does NOT silently modify or invalidate frozen v1.0 artifacts. v1.0 remains frozen until the corresponding v1.1 canonical artifacts are committed.

## 1. Decision objective

Ship a small, real, deployable Toutiao-style MVP as quickly as possible while preventing foreseeable architectural and database rework.

The implementation priority is:

```text
non-rework foundations
→ basic API
→ end-to-end MVP
→ production evidence
→ iterative expansion
```

Do not block MVP on live rooms, commerce, memberships, ads, AI/agents, advanced recommendation, or other future platform capabilities.

## 2. Five final decisions

### D1 — Basic API is the immediate P0

The first release must be a runnable headless API, not a complete social ecosystem.

MVP API scope:

```text
Identity
  register / login / refresh / logout / me

User
  get user
  list user posts

Content
  create post
  get post
  update post
  delete post

Media
  media reference + R2 upload authorization boundary

Feed
  home
  following
  hot

Social
  like
  favorite
  follow

Comment
  list comments
  create comment
  comment like

Search
  basic content/user search

Topic / History
  minimum read/write interfaces required by the MVP journey
```

No advanced ranking, monetization, live, commerce, or AI is required for the first runnable release.

### D2 — Five data foundations are mandatory before implementation

The following must be resolved before the business schema is considered safe for implementation:

1. Canonical `users.id` remains the internal canonical user ID.
2. `user_identities` is introduced for external identity providers and mini-program login. Provider IDs are never the canonical user ID.
3. Locale/translation model is reserved now using `locales`, `translation_groups`, and content-specific translation tables. No language-specific columns such as `title_en` or `title_zh`.
4. Content lifecycle supports at least draft, scheduled, published, and archived states, with `publish_at`, `published_at`, and `unpublish_at` semantics reserved now.
5. Media is metadata in D1 and authoritative binary objects in R2. The media reference model must not encode provider-specific processing implementation.

These are P0 because changing them after clients and data exist would cause real migration/rework risk.

### D3 — Future features reserve interfaces, not full implementations

The following boundaries are reserved now but are NOT implemented in the MVP:

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

Reserved extension interfaces include:

```text
Realtime Adapter
Media Processing Adapter
Search Provider Adapter
Identity Provider Adapter
Webhook/Event Delivery Adapter
Observability
```

No speculative Worker, empty future database subsystem, or future business implementation is created merely because a boundary is reserved.

### D4 — Worker topology is optimized for minimum synchronous RPC

The MVP target physical topology is:

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

The planned v1.1 business topology therefore removes W11 as a separate physical Worker and merges Interaction into W12 Social.

Important: this is a versioned topology decision. Frozen v1.0 currently names W11 separately; the v1.1 canonical RPC/topology artifacts must be updated before implementation begins. No code should silently apply the merge while still claiming v1.0 compliance.

Logical business ownership remains independent of physical Worker count.

### D5 — Cost contract is part of the API design

MVP hot-path targets:

```text
cache hit       → 0 D1
normal read     → ideally 1 D1
primary write   → ideally 1 write
side effects    → Queue / async
```

Business Workers must not create per-item RPC chains.

Target normal-path limits:

```text
feed item enrichment → batch, never per-item RPC
basic read           → ≤ 2 internal RPC upper bound
interaction write   → ≤ 1 business RPC + 1 primary write
search               → ≤ 1 business RPC
```

These are budgets, not permissions to consume the maximum.

## 3. MVP data model decision

### P0 tables to include in the v1.1 business contract

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

For the smallest runnable MVP, some tables may be initially unused by the public UI, but their ownership and keys are frozen so the first release does not need a destructive redesign.

### P1 — contract boundary only

Do not create these tables in the MVP migration merely for future-proofing:

```text
membership_tiers
subscriptions
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

They are introduced only when the corresponding business phase is activated by a versioned contract.

## 4. Content model decision

Do not build a giant universal JSON content table.

Do not create language-specific columns.

Use stable relational primitives:

```text
Post
 ├── Media
 ├── Translation
 ├── Tag
 ├── Mention
 ├── Topic
 └── Collection
```

Topic, Tag, Collection, Campaign, and Page remain distinct concepts.

## 5. Translation decision

Translation is manual and explicit.

```text
original content = canonical
translation = separate localized record
user action = Translate
```

There is no automatic translation service in MVP.

## 6. Identity and mini-program decision

All clients use the same `/api/v1` API.

```text
Web
Android
iOS
WeChat mini-program
other mini-programs
        ↓
      /api/v1
```

Mini-program identity is an adapter/provider concern. It must map into the canonical `users` identity model through `user_identities`.

No mini-program-specific backend or database is created.

## 7. Media decision

```text
Client
  ↓
W07 upload authorization
  ↓
R2 direct upload
  ↓
W09 records metadata/reference
  ↓
D1
```

Future video processing remains behind the Media Processing Adapter. FFmpeg/GPU/VPS/HLS/DASH implementation is not part of D1-Fabric.

## 8. API-first implementation order

### Phase 0 — Contract closure

- update v1.0 planning into versioned v1.1 canonical artifacts
- resolve identity, locale, translation, lifecycle, media, and topology decisions
- validate indexes and query paths
- validate DTO/OpenAPI consistency
- define error, cursor, idempotency, locale, client context, and upload authorization semantics

### Phase 1 — API skeleton

Implement W07 only to the minimum required gateway/BFF behavior and prove:

```text
health
request context
auth extraction
routing
DTO validation
error envelope
cursor handling
idempotency propagation
```

### Phase 2 — Identity

Implement W08:

```text
register
login
refresh
logout
me
user
external identity mapping boundary
```

### Phase 3 — Content + Media

Implement W09:

```text
create/read/update/delete post
media references
R2 upload authorization boundary
comments
minimum topic/history interfaces
```

### Phase 4 — Feed

Implement W10:

```text
home
following
hot
cursor pagination
batch enrichment
cache-first path
```

### Phase 5 — Social

Implement W12:

```text
like
favorite
follow
comment interaction
viewer state batch
```

### Phase 6 — Search

Implement W13 basic search.

Advanced provider/search infrastructure is not required for MVP.

### Phase 7 — Full integration

```text
register
→ login
→ create content
→ media
→ publish
→ feed
→ content detail
→ like/comment/follow
→ search
→ topic
→ history
```

Then run contract, security, concurrency, idempotency, D1-cost, RPC-cost, and deployment acceptance.

## 9. Definition of done for MVP API

The MVP is not considered complete merely because routes compile.

It must demonstrate:

- every public route has a stable OpenAPI/DTO definition;
- every route has authentication/authorization semantics where required;
- IDs are represented safely at the API boundary;
- cursor pagination is deterministic and bounded;
- writes are idempotent where retry can duplicate state;
- D1 queries are bounded and indexed;
- feed does not perform per-item RPC;
- media binaries are not stored in D1;
- business Workers do not copy W01-W06 infrastructure;
- each deployable Worker has its own `package.json`;
- all MVP Workers can be deployed independently;
- end-to-end API tests pass;
- D1/RPC/cost evidence is recorded;
- GitHub contains the exact implementation commit and evidence.

## 10. AI execution rule

After v1.1 canonical contracts are committed, DeepSeek is not asked to redesign the system.

The execution prompt must state:

```text
Architecture is frozen.
Implement only the declared phase.
Do not add/split/merge Workers.
Do not redesign D1 schema.
Do not invent endpoints.
Do not implement future features.
Do not change middleware ownership.
Do not introduce dependencies without contract need.
Run required tests.
Produce evidence.
Commit and push.
Stop at the phase boundary.
```

## 11. Final decision

The platform will launch as a **small but real API-first content/social MVP**, not as a half-built version of the complete future platform.

The architecture is designed so that later additions such as creator channels, notifications, subscriptions, commerce, realtime, ads, AI/agents, and advanced ranking attach to reserved business boundaries rather than forcing replacement of the core API, user identity model, media model, or D1-Fabric middleware.

The next implementation action is **NOT coding**. It is updating the frozen business contract from v1.0 to v1.1 using these decisions, then validating the resulting OpenAPI, DTO, migration, RPC contract, and cost rules as one coherent set.
