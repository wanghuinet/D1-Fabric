# D1-Fabric API Implementation Contract v1.1

**Status:** ACTIVE / FROZEN FOR v1.1 IMPLEMENTATION  
**Authority:** This document freezes implementation details under `docs/API-CONTRACT-v1.1-DEVELOPER-PLATFORM.md`. It does not replace C00/C01/C02 or the product roadmap.  
**Execution rule:** DeepSeek/AI implementation agents MUST implement this contract literally. They MUST NOT redesign the product, create parallel schemas, add Workers, change ownership, or implement future roadmap capabilities without an approved contract change.

## 1. Purpose

The semantic API contract defines what clients see. This document defines how v1.1 is implemented so that Web/H5/Android/approved third-party clients receive one stable API while internal Worker and D1 topology remains private.

The implementation target is the smallest production-safe system that closes the v1.1 content-distribution loop:

`Auth/User → create content → media authorization → publish → feed → detail → interaction → comments/replies → search/topic/history primitives → Admin/operations → H5/Android/client consumption`

No recommendation ML, realtime messaging, payments, AI-agent platform, advanced analytics, or other future capability is part of this contract.

## 2. Authority and conflict rules

1. C00 Constitution, C01 Architecture/Ownership, C02 Engineering Operations remain higher authority.
2. `PRODUCT-PLATFORM-ROADMAP-CONTRACT-v1.0.md` controls product iteration scope and decision process.
3. `API-CONTRACT-v1.1-DEVELOPER-PLATFORM.md` controls public semantic behavior.
4. This document freezes v1.1 implementation behavior.
5. `docs/api/v1.1/` supplies the active OpenAPI/DTO/RPC/migration artifacts and must remain consistent with this document.
6. If documents conflict: STOP. Do not choose locally. Report the conflict and require an approved versioned change.
7. Historical/archive documents have no active implementation authority.

## 3. Worker ownership

Business semantics stay in business Workers. Middleware stays generic.

| Capability | Owner Worker | Responsibility |
|---|---|---|
| API/BFF | W07 | Public HTTP API, auth context extraction, validation boundary, response envelopes, rate limit boundary, orchestration |
| Identity | W08 | Registration/login/session/identity/user primitives |
| Content/Media/Topic | W09 | Posts, media metadata, publish lifecycle, topics, hashtags/media associations |
| Feed/Recommendation/History | W10 | Home/following/hot feed primitives and content-view history |
| Social/Interaction | W12 | Like/favorite/follow/comment/reply |
| Search | W13 | Search query and result retrieval |
| Middleware W01-W06 | Generic only | Runtime, shard, query, write, cache, control/recovery; no content-specific business semantics |

A request may cross Workers, but a business rule has exactly one owner. No Worker may silently duplicate another Worker's business logic.

## 4. Global HTTP contract

### 4.1 Base path

All public endpoints use `/api/v1`.

### 4.2 Request context

W07 constructs and propagates:

`request_id`, `trace_id`, `tenant_id`, `namespace`, `user_id`, `locale`, `client_type`, `client_version`, `idempotency_key`, `deadline`, `resource_budget`.

Client-supplied values are validated and bounded. Internal routing metadata is never returned to clients.

### 4.3 IDs

Public resource IDs are decimal strings. Internal D1 INTEGER IDs may remain INTEGER. Never expose logical shard IDs, physical D1 identifiers, SQL, internal Worker names, or internal storage implementation details.

### 4.4 Success envelope

Unless an endpoint explicitly returns `204`, use:

```json
{
  "data": {},
  "request_id": "..."
}
```

List endpoints use:

```json
{
  "data": {
    "items": [],
    "next_cursor": null
  },
  "request_id": "..."
}
```

`next_cursor` is opaque. `null` means there is no next page.

### 4.5 Error envelope

All expected errors use:

```json
{
  "error": {
    "code": "stable_machine_code",
    "message": "safe human-readable message"
  },
  "request_id": "..."
}
```

Do not expose SQL errors, stack traces, D1 names, shard mappings, Worker names, object-store credentials, or authorization internals.

### 4.6 Standard status mapping

- `200` successful read/update/action
- `201` resource/event created
- `204` successful delete/logout with no response body
- `400` malformed/invalid request
- `401` missing/invalid authentication
- `403` authenticated but forbidden
- `404` resource not found or intentionally hidden by authorization policy
- `409` state conflict where retrying the same operation is not equivalent to success
- `413` payload too large
- `415` unsupported media/content type
- `422` structurally valid but semantically invalid input
- `429` rate/resource limit exceeded
- `500` unexpected internal error
- `503` temporary dependency/unavailability condition

The exact stable error code must be defined in implementation code/tests and reused consistently.

## 5. Authentication and authorization

W07 requires authentication for every endpoint marked secured in the semantic API contract. W08 owns identity/session semantics.

Authorization is checked against the resource owner and resource state before mutation. Never trust a user ID supplied in a request body when the authenticated identity is available in the request context.

Public reads must not accidentally reveal private/draft/scheduled/archived content unless the caller is authorized to see it.

Developer applications use explicit scopes. Direct D1 access is never exposed.

## 6. Idempotency and retries

Retryable mutations accept `Idempotency-Key`/`idempotency_key` semantics where the endpoint can be safely retried.

Required behavior:

- Same authenticated actor + same idempotency key + same logical operation returns the original logical result.
- Reusing a key for a materially different request is rejected with `409`.
- Database uniqueness constraints remain the final protection for likes/favorites/follows.
- Client retries MUST NOT create duplicate posts, comments, history events, or media authorization records when the operation is declared idempotent.
- Idempotency implementation must not require an unbounded global table scan.

## 7. Pagination and bounded execution

Every list is cursor-paginated and bounded.

- Default `limit`: 20.
- Maximum `limit`: 50.
- Cursor maximum length: 512 bytes.
- Ordering must be deterministic.
- Prefer keyset/cursor pagination using indexed columns.
- Never implement offset pagination for high-frequency feeds/comments/history.
- Never perform an unbounded scan because a cursor is absent or invalid.
- Invalid cursor returns `400`.
- A server-side limit smaller than requested is allowed when resource budgets require it.

## 8. Cost and execution budgets

These are architectural budgets, not suggestions.

### Read laws

- Cache hit: `0 D1`.
- Normal detail/list read: target `1 D1 statement` in the owning business Worker where practical.
- Cross-Worker enrichment is batch-oriented; no per-item RPC.
- Normal user-visible request: target at most `2` internal RPC hops.
- Feed endpoints may perform bounded batch enrichment, but MUST not fan out once per item.
- Every query has explicit limits.

### Write laws

- Primary mutation: target `1 D1 write statement` or one bounded transaction containing the minimum necessary writes.
- Side effects such as counters, analytics, notifications, indexing, or cache invalidation are asynchronous when correctness permits.
- Never turn one user action into an unbounded synchronous fan-out.

If a v1.1 endpoint cannot meet a budget, implementation must document the measured exception and reason before changing the contract.

## 9. Endpoint implementation matrix

### 9.1 Auth/User — W08 via W07

| Method | Path | Auth | Primary operation | Target |
|---|---|---|---|---|
| POST | `/auth/register` | public | create user/identity | 1 bounded transaction |
| POST | `/auth/login` | public | authenticate/create session | bounded read + session write |
| POST | `/auth/refresh` | refresh credential | rotate/refresh session | bounded |
| POST | `/auth/logout` | required | revoke session | 1 write |
| GET | `/me` | required | current user | 1 read; cache eligible |
| GET | `/users/{id}` | public | public user profile | 1 read; cache eligible |
| GET | `/users/{id}/posts` | public | published posts by author | 1 bounded indexed read |

Registration validates username/identity uniqueness before commit and relies on database uniqueness as final protection. Password/session implementation details remain inside W08 and must never cross the public API boundary.

### 9.2 Content/Media/Topic — W09 via W07

| Method | Path | Auth | Primary operation | Target |
|---|---|---|---|---|
| POST | `/posts` | required | create draft | 1 write/transaction |
| GET | `/posts/{id}` | public/conditional | detail | 1 bounded read; cache eligible |
| PATCH | `/posts/{id}` | required + owner | update draft/owned content | 1 write/transaction |
| DELETE | `/posts/{id}` | required + owner | delete/archive according to state policy | 1 write |
| POST | `/posts/{id}/publish` | required + owner | publish | 1 transaction |
| POST | `/posts/{id}/schedule` | required + owner | schedule | 1 transaction |
| POST | `/posts/{id}/unpublish` | required + owner | remove publication | 1 transaction |
| POST | `/posts/{id}/archive` | required + owner | archive | 1 transaction |
| GET | `/posts/drafts` | required | own drafts | 1 indexed read |
| GET | `/posts/scheduled` | required | own scheduled posts | 1 indexed read |
| POST | `/media/upload-authorizations` | required | scoped R2 upload authorization | 0 D1 if authorization is stateless; otherwise 1 bounded metadata write |
| GET | `/topics/{id}` | public | topic detail | 1 read; cache eligible |
| GET | `/topics/{id}/posts` | public | topic content list | 1 bounded indexed read |

### Content state machine

Allowed primary states:

`draft → review → published → archived`  
`draft → scheduled → published`  
`published → archived`  
`published → draft` only if unpublish semantics explicitly permit it.

No endpoint may invent a new state. Schedule data is represented by the canonical `content_schedules` table; post status and schedule state must remain consistent.

### Content rules

- `content_type` is exactly `text|image|video|mixed`.
- Binary media is stored in R2; D1 stores metadata/reference only.
- Media ownership is checked before attaching media to a post.
- `post_media` ordering is deterministic.
- Publish validates that required content/media references are valid before state transition.
- Draft updates may remain private.
- Public feed/detail cannot expose non-public content.

## 10. Feed — W10

| Method | Path | Auth | Execution |
|---|---|---|---|
| GET | `/feed` | public | bounded ranked/recent feed primitive |
| GET | `/feed/following` | required | bounded following-based feed |
| GET | `/feed/hot` | public | bounded hot/discovery primitive |

v1.1 feed is a deterministic production-safe primitive, not a machine-learning recommendation system.

Requirements:

1. Query only published/visible posts.
2. Use indexed candidate retrieval.
3. Use bounded candidate count.
4. Enrich authors/media/interactions in batches.
5. Never issue one RPC/D1 statement per returned item.
6. Cache stable/public feed segments where useful.
7. Viewer-relative like/favorite state may be loaded in one bounded batch for authenticated users.
8. Cursor encodes the deterministic ordering boundary, not a raw SQL offset.

## 11. Social/Interaction — W12

| Method | Path | Auth | Primary write |
|---|---|---|---|
| POST | `/posts/{id}/like` | required | insert `(user_id, post_id)` if absent |
| DELETE | `/posts/{id}/like` | required | delete `(user_id, post_id)` |
| POST | `/posts/{id}/favorite` | required | insert `(user_id, post_id)` if absent |
| DELETE | `/posts/{id}/favorite` | required | delete `(user_id, post_id)` |
| POST | `/users/{id}/follow` | required | insert `(follower_id, following_id)` |
| DELETE | `/users/{id}/follow` | required | delete relationship |
| GET | `/posts/{id}/comments` | public/conditional | bounded comment read |
| POST | `/posts/{id}/comments` | required | create comment/reply |
| POST | `/comments/{id}/like` | required | comment like |
| DELETE | `/comments/{id}/like` | required | comment unlike |

Like/favorite/follow duplicate protection is database-backed. Repeated `POST` must be logically idempotent. Follow-self is rejected by the database constraint and should be validated earlier for a clean `422`/`409` response.

### Comments

One `comments` table handles both comments and replies. `parent_id = null` means top-level comment; non-null means reply. Do not create a second reply resource/table.

Comment creation validates:

- authenticated actor;
- target post exists and is visible/commentable;
- parent comment, when supplied, belongs to the same post;
- text length/content constraints;
- actor is permitted to comment.

Comment listing is bounded and deterministic by `(created_at, id)` or equivalent indexed ordering.

## 12. Search — W13

`GET /api/v1/search?q=&type=&cursor=&limit=`

- `q`: 1–200 characters.
- `type`: `all|post|user`, default `all`.
- cursor/limit follow global rules.
- Search implementation must remain behind W13; clients do not know the search backend.
- Search results expose only public/authorized resources.
- Search must have explicit bounded result limits.
- Do not synchronously query every shard/Worker without a bounded strategy.
- Search indexing/refresh may be asynchronous where freshness requirements permit.

## 13. History — W10

`GET /api/v1/history` is an authenticated, bounded cursor list of the caller's content-view history.

`POST /api/v1/history/events` records a bounded history event.

History writes must not become a synchronous fan-out. Duplicate/noisy view events may be coalesced according to the implementation's approved policy. The v1.1 canonical minimum is `content_views`; additional history types remain future extensions.

## 14. Media/R2 contract

The API never streams binary content through D1.

Upload authorization must:

- authenticate the actor;
- issue a scoped, time-limited R2 authorization;
- bind the authorization to the intended owner/namespace and allowed object constraints;
- never expose reusable storage credentials;
- validate object/media metadata before a media record becomes usable;
- prevent attaching another user's object by guessing an object key.

D1 stores `media.object_key` and metadata. R2 stores the binary object.

## 15. Canonical database rule

The active v1.1 schema is `docs/api/v1.1/migrations/0001_business_mvp_v1_1.sql`.

The canonical business tables include:

`users`, `user_identities`, `locales`, `translation_groups`, `posts`, `post_translations`, `media`, `post_media`, `comments`, `comment_translations`, `likes`, `favorites`, `follows`, `hashtags`, `content_hashtags`, `mentions`, `collections`, `collection_items`, `topics`, `topic_contents`, `content_schedules`, `content_views`.

Do NOT create parallel Article/Gallery/Video tables, Reply tables, LikeState tables, or another user/content schema.

## 16. Cache contract

Cache is an optimization, never the source of truth.

Cacheable candidates:

- public user profile;
- public post detail;
- public topic detail;
- public feed segments where correctness permits.

Mutation paths must invalidate/update affected cache keys asynchronously or synchronously only when required for correctness. A cache miss falls back to the owning Worker/D1 path.

Cache keys must include all semantic dimensions that change the result, such as tenant/namespace, locale, resource ID, visibility context, and feed cursor/version where applicable.

## 17. Security requirements

Mandatory tests and implementation controls:

- SQL parameterization only.
- Input length/type/enum validation at API boundary.
- Authentication before protected resource access.
- Object/resource ownership checks before mutation.
- Cross-tenant/namespace access denial.
- No IDOR through path IDs.
- Explicit CORS allowlist; never reflect arbitrary Origin.
- Credentials are not exposed in CORS responses.
- Rate limiting at W07 boundary.
- Upload authorization is scoped and short-lived.
- Error messages are topology-safe.
- No secrets in logs.
- Request IDs/traces are safe to expose but contain no credentials.
- Public endpoints must not leak draft/scheduled/private records.

## 18. Concurrency requirements

Concurrency correctness is tested at the mutation boundary.

At minimum test:

- two concurrent likes by the same user;
- two concurrent favorites by the same user;
- two concurrent follows by the same user;
- two concurrent post publishes;
- two concurrent schedule changes;
- two concurrent comment creates with same idempotency key;
- repeated retry after timeout.

Database constraints/transactions, not client timing, decide final state.

## 19. Required qualification matrix

Before v1.1 is accepted, tests must cover:

### Happy paths

1. register
2. login
3. refresh
4. logout
5. get me
6. create text post
7. create image post
8. create video post
9. create mixed post
10. authorize media upload
11. update draft
12. publish
13. schedule
14. unpublish
15. archive
16. user posts
17. feed
18. following feed
19. hot feed
20. post detail
21. like/unlike
22. favorite/unfavorite
23. follow/unfollow
24. create top-level comment
25. create reply using `parent_id`
26. like/unlike comment
27. search
28. topic detail/posts
29. history write/read

### Negative/adversarial paths

- missing token
- expired/invalid token
- wrong owner
- cross-tenant access
- private/draft access by unauthorized user
- invalid ID
- malformed cursor
- limit below 1 / above 50
- oversized query/body/text
- invalid enum
- duplicate mutation
- conflicting idempotency key
- follow self
- reply to comment belonging to another post
- attach media not owned by actor
- invalid/expired upload authorization
- CORS from unapproved origin
- rate-limit exhaustion
- concurrent mutation races
- SQL injection payloads
- unbounded pagination attempts
- forced dependency failure

## 20. Cost qualification

For each high-frequency endpoint, capture actual evidence for:

- Worker invocation count;
- internal RPC count/hops;
- D1 statement count;
- rows read;
- rows written;
- cache hit/miss;
- response latency;
- error rate.

The acceptance report must explicitly identify any endpoint violating the default budget and explain why.

## 21. Observability

Every request has `request_id` and trace correlation. Logs are structured and bounded.

Do not log:

- passwords;
- access/refresh tokens;
- storage credentials;
- full private content unless an approved diagnostic policy requires it;
- sensitive identity material.

Metrics must allow identification of high-cost paths, rate-limit events, error classes, cache effectiveness, and dependency failures.

## 22. Deployment and repository rules

Every independently deployable Worker owns its own `package.json` and dependency boundary.

Do not create a giant root dependency package that merges unrelated Worker dependencies.

Each Worker must be independently buildable/testable/deployable according to the repository's active engineering contract.

Before commit:

1. targeted unit tests;
2. contract tests;
3. adversarial/security tests;
4. migration/schema consistency checks;
5. type/build checks;
6. cost-budget checks where instrumentation exists;
7. inspect diff for scope creep;
8. commit;
9. push;
10. verify pushed commit and CI result.

## 23. AI execution contract

AI implementation agents are execution accelerators, not architecture authorities.

For v1.1 implementation they MUST:

- read AGENTS.md, C00, C01, C02, the active roadmap, API contract, this implementation contract, and relevant `docs/api/v1.1/` artifacts;
- reuse the canonical schema and existing middleware contracts;
- implement only the declared endpoint/capability boundary;
- preserve Worker ownership;
- use the smallest code that satisfies the contract;
- write tests with the implementation;
- run targeted and adversarial qualification;
- report concrete evidence;
- commit and push only the scoped change.

They MUST NOT:

- invent product requirements;
- redesign the roadmap;
- add future Workers;
- split one business resource into parallel schemas;
- move business code into generic middleware;
- change public API semantics silently;
- introduce speculative recommendation/AI/payment/realtime systems;
- bypass database constraints with client-only logic;
- hide failing tests;
- mark an implementation complete without evidence.

## 24. Change control

A change requires a versioned contract update before implementation if it changes any of:

- public endpoint semantics;
- request/response schema;
- authentication/authorization semantics;
- Worker ownership;
- database schema ownership/model;
- shard/routing contract;
- consistency guarantees;
- security model;
- material cost/performance budget;
- deployment topology;
- public API versioning.

Small implementation fixes that preserve the frozen contract may be made without reopening architecture.

## 25. Definition of Done for v1.1

v1.1 is complete only when all of the following are true:

- active documents agree;
- all declared endpoints are implemented or explicitly marked out by an approved scope decision;
- public API behavior matches the semantic and implementation contracts;
- canonical schema is used with no parallel business model;
- Worker ownership is correct;
- security/adversarial tests pass;
- concurrency/idempotency tests pass;
- bounded pagination is verified;
- high-frequency cost evidence is captured;
- build/type/CI checks pass;
- deployment succeeds safely;
- rollback/migration behavior is understood;
- H5/Android/client acceptance examples execute successfully;
- no known critical blocker remains;
- the resulting evidence is used to decide the next capability iteration.

## 26. Stop condition

After v1.1 acceptance, STOP implementation expansion. Do not automatically begin Social completion, Creator platform, Discovery, Recommendation, Media expansion, AI, or Developer Ecosystem work.

The next capability is selected from real usage evidence under `PRODUCT-PLATFORM-ROADMAP-CONTRACT-v1.0.md`, then receives its own approved design/implementation freeze when needed.
