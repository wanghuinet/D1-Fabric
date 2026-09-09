# D1-Fabric 1.0 Archive Index

This directory is the immutable reference area for the pre-2.0 implementation and contracts.

## Archived runtime
- `w01-runtime-gateway/`
- `w02-shard-router/`
- `w03-query-engine/`
- `w04-write-engine/`
- `w05-cache/`
- `w06-control-recovery/`

## Archived documentation
- `docs-v1/` contains the former `docs/` v1.x documents and API contracts.

## Archived D1 schema/sharding implementation
- `d1-shard-schema-v1/` contains the former `workers/shard-schema/` schema, migrations, deployment config, and scripts.

## Rules
- Archive contents are retained for historical review, regression comparison, and recovery only.
- No 2.0 implementation may import runtime code from this archive.
- New 2.0 design and executable code live outside this archive.
