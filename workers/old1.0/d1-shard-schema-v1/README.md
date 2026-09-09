# Unified Shard Schema

This directory owns the schema applied identically to every physical business shard D1.

Current baseline:

- `0001_initial_shard_schema.sql`
- `fabric_records`: tenant/namespace/key routed record envelope with versioning.
- `fabric_idempotency`: shard-local idempotency ledger for retry-safe writes.
- `fabric_schema_meta`: schema version marker for consistency verification.

The schema is intentionally business-neutral. Product-specific tables belong to later, explicit schema migrations and must not bypass this migration chain.

Physical shard targets:

- d1-fabric-shard-01
- d1-fabric-shard-02
- d1-fabric-shard-03
- d1-fabric-shard-04
- d1-fabric-shard-05
- d1-fabric-shard-06
- d1-fabric-shard-07
- d1-fabric-shard-08

The same migration must be applied to all physical shards before the shard data plane is declared ready.
