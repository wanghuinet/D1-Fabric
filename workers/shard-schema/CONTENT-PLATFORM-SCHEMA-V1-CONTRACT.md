# D1-Fabric Content Platform Schema V1 Contract

## Purpose

This contract freezes the normalized content-platform data model used by D1-Fabric for the first content-platform generation. It combines the public capability requirements of a Toutiao-class personalized content platform and a Baidu-class search/content discovery platform without copying proprietary internal implementations.

## Freeze rule

After V1 is deployed, application development must not require destructive changes to the core model. Backward-compatible additions remain possible; changing primary keys, shard assumptions, field semantics, or deleting core fields requires an explicit new schema version and architecture review.

## Core domains

- users / authors
- content: article, video, image, dynamic, with reserved extension types
- media metadata referencing R2 objects
- content statistics
- tags / topics / channels
- follows
- comments / replies
- likes / bookmarks
- shares
- behavior events
- feed candidates and ranking metadata
- moderation
- publication transaction / asset manifest / failure audit

## Publication atomicity — mandatory

A backend publish operation is **all-or-nothing** from the user's perspective.

### Required flow

```text
Client creates publish_id + idempotency_key
        ↓
Upload media to R2
        ↓
Backend receives publish request + manifest
        ↓
Validate required metadata
        ↓
Validate every required media_id/object reference
        ↓
Begin D1 transaction
        ↓
Create/update content in non-published state
        ↓
Commit publication operation + content status together
        ↓
Return success
```

A content item MUST NOT become `published` when required database records or required media references are missing.

### Failure behavior

If validation, D1 write, transaction commit, or required dependency checks fail, the operation must be recorded as failed and the client must receive a deterministic failure response such as:

- `PUBLISH_VALIDATION_FAILED`
- `PUBLISH_ASSET_MISSING`
- `PUBLISH_DATABASE_TIMEOUT`
- `PUBLISH_COMMIT_FAILED`
- `PUBLISH_DEPENDENCY_UNAVAILABLE`

Retryable failures must tell the client that publication can be retried safely.

### Network timeout ambiguity

A network timeout does **not** prove that the server transaction failed. Therefore every publish request MUST carry an idempotency key.

On retry with the same idempotency key:

- if the original operation committed, return the existing committed result;
- if it failed before commit, retry safely;
- never create a second content item or duplicate publication effects.

This rule is mandatory for article, image gallery, video, and dynamic publication.

## Hot-path rules

1. Feed queries must not load large body payloads.
2. Media binaries never live in D1; only metadata/object references live in D1.
3. Views/impressions are events, not synchronous hot-row counter updates.
4. Counters are materialized state and may be rebuilt from event/aggregation pipelines.
5. Pagination uses deterministic cursor-compatible ordering.
6. Cross-domain foreign keys are not used because physical routing may place domains on different D1 shards.
7. Indexes exist for declared access paths; do not add speculative indexes.
8. Recommendation fields are versioned metadata, not an embedded recommendation algorithm.
9. Publication commit is atomic: no partial published content.
10. Client retries are idempotent and must not duplicate content or assets.

## Tables

`platform_users`
`platform_authors`
`platform_content`
`platform_content_stats`
`platform_media`
`platform_content_tags`
`platform_content_topics`
`platform_content_channels`
`platform_follows`
`platform_comments`
`platform_reactions`
`platform_shares`
`platform_events`
`platform_feed_candidates`
`platform_moderation`
`platform_publish_operations`
`platform_publish_assets`
`platform_publish_failures`
`platform_schema_meta`

## Deployment

Run from PowerShell in the repository:

```powershell
.\workers\shard-schema\scripts\Apply-ContentSchema.ps1
```

The script applies the complete content-platform migration chain to all eight configured D1 shards and verifies the required `platform_*` tables on every shard.

## Safety

All content-platform migrations are additive and do not modify or delete the existing generic `fabric_records`, `fabric_idempotency`, or `fabric_schema_meta` tables.
