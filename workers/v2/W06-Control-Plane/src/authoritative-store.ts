import { validateSnapshot, type AuthoritativeShardMetadata, type MetadataSnapshot } from "./metadata.ts";
import { resolvePlacement, type PlacementRequest, type PlacementResult } from "./placement.ts";

export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
}

export interface D1DatabaseLike {
  prepare(sql: string): D1PreparedStatementLike;
}

export class AuthoritativeMetadataStoreError extends Error {
  readonly code = "AUTHORITATIVE_METADATA_UNAVAILABLE" as const;
  constructor(message: string) {
    super(message);
    this.name = "AuthoritativeMetadataStoreError";
  }
}

interface ShardRow {
  logical_database_id: string;
  logical_shard_id: string;
  physical_shard_id: string;
  topology_version: number;
  lifecycle: AuthoritativeShardMetadata["lifecycle"];
  capacity_state: AuthoritativeShardMetadata["capacityState"];
  creation_timestamp: number;
  last_transition_timestamp: number;
}

export class D1AuthoritativeMetadataStore {
  constructor(private readonly db: D1DatabaseLike) {}

  async readSnapshot(logicalDatabaseId: string, topologyVersion: number): Promise<MetadataSnapshot> {
    const result = await this.db.prepare(`
      SELECT logical_database_id, logical_shard_id, physical_shard_id,
             topology_version, lifecycle, capacity_state,
             creation_timestamp, last_transition_timestamp
      FROM d1f_w06_shard_metadata
      WHERE logical_database_id = ? AND topology_version = ?
      ORDER BY logical_shard_id ASC
    `).bind(logicalDatabaseId, topologyVersion).all<ShardRow>();

    const shards: AuthoritativeShardMetadata[] = result.results.map((row) => ({
      logicalDatabaseId: row.logical_database_id,
      logicalShardId: row.logical_shard_id,
      physicalShardId: row.physical_shard_id,
      topologyVersion: row.topology_version,
      lifecycle: row.lifecycle,
      capacityState: row.capacity_state,
      creationTimestamp: row.creation_timestamp,
      lastTransitionTimestamp: row.last_transition_timestamp,
    }));

    const snapshot: MetadataSnapshot = { logicalDatabaseId, topologyVersion, shards };
    validateSnapshot(snapshot);
    return snapshot;
  }

  async resolve(request: PlacementRequest): Promise<PlacementResult> {
    const snapshot = await this.readSnapshot(request.logicalDatabaseId, request.topologyVersion);
    return resolvePlacement(request, snapshot.shards);
  }
}
