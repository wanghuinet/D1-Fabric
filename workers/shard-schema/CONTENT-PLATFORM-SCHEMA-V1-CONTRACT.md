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

## Hot-path rules

1. Feed queries must not load large body payloads.
2. Media binaries never live in D1; only metadata/object references live in D1.
3. Views/impressions are events, not synchronous hot-row counter updates.
4. Counters are materialized state and may be rebuilt from event/aggregation pipelines.
5. Pagination uses deterministic cursor-compatible ordering.
6. Cross-domain foreign keys are not used because physical routing may place domains on different D1 shards.
7. Indexes exist for declared access paths; do not add speculative indexes.
8. Recommendation fields are versioned metadata, not an embedded recommendation algorithm.

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
`platform_schema_meta`

## Deployment

Run from PowerShell in the repository:

```powershell
.\workers\shard-schema\scripts\Apply-ContentSchema.ps1
```

The script applies migration `0002_content_platform_v1.sql` to all eight configured D1 shards and verifies the expected `platform_*` tables on every shard.

## Safety

The migration is additive and does not modify or delete the existing generic `fabric_records`, `fabric_idempotency`, or `fabric_schema_meta` tables.
