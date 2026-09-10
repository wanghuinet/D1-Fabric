import { validateSnapshot, type AuthoritativeShardMetadata, type MetadataSnapshot } from "./metadata.ts";
import { resolvePlacement, type PlacementRequest, type PlacementResult } from "./placement.ts";

export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean; meta?: { changes?: number } }>;
}

export interface D1DatabaseLike {
  prepare(sql: string): D1PreparedStatementLike;
  batch(statements: D1PreparedStatementLike[]): Promise<Array<{ success: boolean; meta?: { changes?: number } }>>;
}

export class AuthoritativeMetadataStoreError extends Error {
  readonly code = "AUTHORITATIVE_METADATA_UNAVAILABLE" as const;
  constructor(message: string) {
    super(message);
    this.name = "AuthoritativeMetadataStoreError";
  }
}

export class TopologyVersionNotPublishedError extends Error {
  readonly code = "TOPOLOGY_VERSION_NOT_PUBLISHED" as const;
  constructor(message: string) {
    super(message);
    this.name = "TopologyVersionNotPublishedError";
  }
}

export class TopologyPublicationConflictError extends Error {
  readonly code = "TOPOLOGY_PUBLICATION_CONFLICT" as const;
  constructor(message: string) {
    super(message);
    this.name = "TopologyPublicationConflictError";
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

interface HeadRow { topology_version: number }

export interface TopologyPublication {
  snapshot: MetadataSnapshot;
  expectedCurrentVersion: number | null;
}

export class D1AuthoritativeMetadataStore {
  private readonly db: D1DatabaseLike;

  constructor(db: D1DatabaseLike) {
    this.db = db;
  }

  async readSnapshot(logicalDatabaseId: string, topologyVersion: number): Promise<MetadataSnapshot> {
    const head = await this.db.prepare(`
      SELECT topology_version
      FROM d1f_w06_topology_head
      WHERE logical_database_id = ?
    `).bind(logicalDatabaseId).all<HeadRow>();

    if (head.results.length !== 1 || head.results[0].topology_version !== topologyVersion) {
      throw new TopologyVersionNotPublishedError("requested topology version is not the published head");
    }

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

  async publish({ snapshot, expectedCurrentVersion }: TopologyPublication): Promise<void> {
    validateSnapshot(snapshot);
    if (
      expectedCurrentVersion !== null &&
      (!Number.isSafeInteger(expectedCurrentVersion) || expectedCurrentVersion < 1 || expectedCurrentVersion >= snapshot.topologyVersion)
    ) {
      throw new TopologyPublicationConflictError("expected current topology version is invalid or not older than the candidate");
    }

    const statements = [
      this.db.prepare(`
        INSERT INTO d1f_w06_topology_versions (logical_database_id, topology_version)
        VALUES (?, ?)
      `).bind(snapshot.logicalDatabaseId, snapshot.topologyVersion),
      ...snapshot.shards.map((shard) => this.db.prepare(`
        INSERT INTO d1f_w06_shard_metadata (
          logical_database_id, logical_shard_id, physical_shard_id,
          topology_version, lifecycle, capacity_state,
          creation_timestamp, last_transition_timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        shard.logicalDatabaseId,
        shard.logicalShardId,
        shard.physicalShardId,
        shard.topologyVersion,
        shard.lifecycle,
        shard.capacityState,
        shard.creationTimestamp,
        shard.lastTransitionTimestamp,
      )),
      expectedCurrentVersion === null
        ? this.db.prepare(`
            INSERT INTO d1f_w06_topology_head (logical_database_id, topology_version)
            SELECT ?, ?
            WHERE NOT EXISTS (
              SELECT 1 FROM d1f_w06_topology_head WHERE logical_database_id = ?
            )
          `).bind(snapshot.logicalDatabaseId, snapshot.topologyVersion, snapshot.logicalDatabaseId)
        : this.db.prepare(`
            UPDATE d1f_w06_topology_head
            SET topology_version = ?
            WHERE logical_database_id = ? AND topology_version = ?
          `).bind(snapshot.topologyVersion, snapshot.logicalDatabaseId, expectedCurrentVersion),
    ];

    const results = await this.db.batch(statements);
    const headResult = results[results.length - 1];
    if (!headResult || headResult.success !== true || (headResult.meta?.changes ?? 0) !== 1) {
      throw new TopologyPublicationConflictError("topology publication lost the compare-and-set race");
    }
  }

  async resolve(request: PlacementRequest): Promise<PlacementResult> {
    const snapshot = await this.readSnapshot(request.logicalDatabaseId, request.topologyVersion);
    return resolvePlacement(request, snapshot.shards);
  }
}
