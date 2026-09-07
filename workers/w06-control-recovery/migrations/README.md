# W06 Control D1 migrations

`0001_control_schema.sql` initializes the W06 control plane with:

- `fabric_shards`: 64 logical shards mapped across 8 physical D1 databases.
- `fabric_migrations`: epoch-fenced migration plans with optional idempotency keys.
- `fabric_recovery`: bounded recovery state tracking.
- `fabric_control_meta`: control-plane version and shard-count metadata.

Run the migration against `d1-fabric-control` before enabling W06 endpoints that read or write control state.

The 64-to-8 mapping is an initial placement only. Future split, merge, rebalance, or migration operations must update control metadata through W06 and advance the shard epoch under fencing; clients must never infer physical placement from the logical shard id alone.
