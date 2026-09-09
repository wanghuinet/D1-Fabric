# D1-Fabric API Contract v1.1 — Developer Platform

**Status:** ACTIVE / FROZEN FOR v1.1 IMPLEMENTATION

## Purpose

This is the public semantic contract for first-party clients and approved third-party developers. Internal D1-Fabric topology is invisible to API consumers.

## Versioning

Base path: `/api/v1`. No silent breaking changes. Additive fields/endpoints are preferred. Breaking semantics require a new version.

## Request context

Supported context: `request_id`, `trace_id`, `tenant_id`, `namespace`, `user_id`, `locale`, `client_type`, `client_version`, `idempotency_key`, `deadline`, `resource_budget`.

## Core resources

`User`, `Post`, `Media`, `Comment`, `Topic`, `History`, and interaction state (`like`, `favorite`, `follow`).

### Post

A post has `id`, `author`, `content_type`, `text`, `media`, `status`, `visibility`, `published_at`, `stats`, and viewer-relative interaction state. `content_type`: `text|image|video|mixed`.

### Media

Media is metadata/reference to an R2 object. API clients upload through an authorization endpoint; D1 never stores binary content.

### Comment

A comment has `id`, `post_id`, `author`, `parent_id`, `text`, `status`, `created_at`. `parent_id` provides replies without a second reply resource.

## Endpoints

### Auth/User

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/me
GET  /api/v1/users/{id}
GET  /api/v1/users/{id}/posts
```

### Content

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

### Feed

```text
GET /api/v1/feed
GET /api/v1/feed/following
GET /api/v1/feed/hot
```

### Interaction

```text
POST|DELETE /api/v1/posts/{id}/like
POST|DELETE /api/v1/posts/{id}/favorite
POST|DELETE /api/v1/users/{id}/follow
POST|DELETE /api/v1/comments/{id}/like
GET|POST     /api/v1/posts/{id}/comments
```

### Discovery/history

```text
GET  /api/v1/search?q=&type=&cursor=&limit=
GET  /api/v1/topics/{id}
GET  /api/v1/topics/{id}/posts
GET  /api/v1/history
POST /api/v1/history/events
```

## List contract

All list responses are bounded and cursor-paginated. Cursor is opaque to clients. Ordering is deterministic. `limit` is bounded server-side. No client may request an unbounded scan.

## Write contract

Mutating endpoints validate authentication, authorization and resource ownership before mutation. Retryable writes accept idempotency semantics. Duplicate likes/favorites/follows are prevented by database constraints, not merely by client logic.

## Response contract

Stable success/error envelopes are required. Public IDs are decimal strings even if D1 uses INTEGER internally. Never expose shard IDs, physical D1 identifiers, SQL, internal Worker names, or secrets.

## Security

All user-controlled values are parameterized. CORS is explicit, credentials are never reflected, upload authorization is scoped and time-limited, object ownership is checked, rate limits are enforced at the API boundary, and error responses do not disclose internal topology.

## Developer platform

Third-party clients use application credentials and explicit scopes. They can read public content and, when granted write scopes, create/publish content on behalf of authorized identities. Direct D1 access is never granted. Client secrets are stored only as protected hashes/references appropriate to the authentication implementation.

## Vertical-app rule

A vertical app is created by configuration/filtering/presentation, not by forking the business backend. Examples: technology, photography, automobile, education, gaming. All consume the same `/api/v1` semantic model.

## Cost contract

Cache hit → 0 D1. Normal read → ideally 1 D1. Primary write → ideally 1 write. Side effects → asynchronous. Per-item RPC and unbounded fan-out are prohibited.

## Acceptance

The contract is not complete until examples for register/login, publish text/image/video, feed, detail, like, favorite, follow, comment/reply, search and history execute successfully against the deployed implementation, with negative authorization, duplicate, pagination, concurrency and rate-limit tests passing.
