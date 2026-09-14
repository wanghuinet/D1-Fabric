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

export class ShardMapVersionNotPublishedError extends Error {
  readonly code = "SHARD_MAP_VERSION_NOT_PUBLISHED" as const;
  constructor(message: string) {
    super(message);
    this.name = "ShardMapVersionNotPublishedError";
  }
}

export class ShardMapPublicationConflictError extends Error {
  readonly code = "SHARD_MAP_PUBLICATION_CONFLICT" as const;
  constructor(message: string) {
    super(message);
    this.name = "ShardMapPublicationConflictError";
  }
}

interface ShardRow {
  logical_database_id: string;
  logical_shard_id: string;
  physical_shard_id: string;
  shard_map_version: number;
  shard_status: AuthoritativeShardMetadata["shardStatus"];
  keyspace_lower_inclusive: string;
  keyspace_upper_exclusive: string;
  control_epoch: number;
  capacity_state: AuthoritativeShardMetadata["capacityState"];
  created_at: string;
  updated_at: string;
}

interface HeadRow {
  shard_map_version: number;
  control_epoch: number;
}

export interface ShardMapPublication {
  snapshot: MetadataSnapshot;
  expectedCurrent: { shardMapVersion: number; controlEpoch: number } | null;
}

function validVersion(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 1;
}

export class D1AuthoritativeMetadataStore {
  private readonly db: D1DatabaseLike;

  constructor(db: D1DatabaseLike) {
    this.db = db;
  }

  async readSnapshot(logicalDatabaseId: string, shardMapVersion: number): Promise<MetadataSnapshot> {
    const head = await this.db.prepare(`
      SELECT shard_map_version, control_epoch
      FROM d1f_w06_shard_map_head
      WHERE logical_database_id = ?
    `).bind(logicalDatabaseId).all<HeadRow>();

    if (
      head.results.length !== 1 ||
      head.results[0].shard_map_version !== shardMapVersion
    ) {
      throw new ShardMapVersionNotPublishedError("requested shard map version is not the published head");
    }

    const controlEpoch = head.results[0].control_epoch;
    if (!validVersion(controlEpoch)) {
      throw new AuthoritativeMetadataStoreError("published control epoch is invalid");
    }

    const result = await this.db.prepare(`
      SELECT logical_database_id, logical_shard_id, physical_shard_id,
             shard_map_version, shard_status,
             keyspace_lower_inclusive, keyspace_upper_exclusive,
             control_epoch, capacity_state, created_at, updated_at
      FROM d1f_w06_shard_metadata_v11
      WHERE logical_database_id = ? AND shard_map_version = ?
      ORDER BY logical_shard_id ASC
    `).bind(logicalDatabaseId, shardMapVersion).all<ShardRow>();

    const shards: AuthoritativeShardMetadata[] = result.results.map((row) => ({
      logicalDatabaseId: row.logical_database_id,
      logicalShardId: row.logical_shard_id,
      physicalShardId: row.physical_shard_id,
      shardMapVersion: row.shard_map_version,
      shardStatus: row.shard_status,
      keySpace: {
        lowerInclusive: row.keyspace_lower_inclusive,
        upperExclusive: row.keyspace_upper_exclusive,
      },
      controlEpoch: row.control_epoch,
      capacityState: row.capacity_state,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    const snapshot: MetadataSnapshot = {
      logicalDatabaseId,
      shardMapVersion,
      controlEpoch,
      shards,
    };
    validateSnapshot(snapshot);
    return snapshot;
  }

  async publish({ snapshot, expectedCurrent }: ShardMapPublication): Promise<void> {
    validateSnapshot(snapshot);

    if (expectedCurrent !== null) {
      if (
        !validVersion(expectedCurrent.shardMapVersion) ||
        !validVersion(expectedCurrent.controlEpoch) ||
        expectedCurrent.shardMapVersion >= snapshot.shardMapVersion ||
        expectedCurrent.controlEpoch > snapshot.controlEpoch
      ) {
        throw new ShardMapPublicationConflictError("expected current shard map version or control epoch is invalid");
      }
    }

    const statements = [
      this.db.prepare(`
        INSERT INTO d1f_w06_shard_map_versions (
          logical_database_id, shard_map_version, control_epoch, publication_state
        ) VALUES (?, ?, ?, 'PUBLISHED')
      `).bind(snapshot.logicalDatabaseId, snapshot.shardMapVersion, snapshot.controlEpoch),
      ...snapshot.shards.map((shard) => this.db.prepare(`
        INSERT INTO d1f_w06_shard_metadata_v11 (
          logical_database_id, logical_shard_id, physical_shard_id,
          shard_map_version, shard_status,
          keyspace_lower_inclusive, keyspace_upper_exclusive,
          control_epoch, capacity_state, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        shard.logicalDatabaseId,
        shard.logicalShardId,
        shard.physicalShardId,
        shard.shardMapVersion,
        shard.shardStatus,
        shard.keySpace.lowerInclusive,
        shard.keySpace.upperExclusive,
        shard.controlEpoch,
        shard.capacityState,
        shard.createdAt,
        shard.updatedAt,
      )),
      expectedCurrent === null
        ? this.db.prepare(`
            INSERT INTO d1f_w06_shard_map_head (
              logical_database_id, shard_map_version, control_epoch
            )
            SELECT ?, ?, ?
            WHERE NOT EXISTS (
              SELECT 1 FROM d1f_w06_shard_map_head WHERE logical_database_id = ?
            )
          `).bind(
            snapshot.logicalDatabaseId,
            snapshot.shardMapVersion,
            snapshot.controlEpoch,
            snapshot.logicalDatabaseId,
          )
        : this.db.prepare(`
            UPDATE d1f_w06_shard_map_head
            SET shard_map_version = ?, control_epoch = ?
            WHERE logical_database_id = ?
              AND shard_map_version = ?
              AND control_epoch = ?
          `).bind(
            snapshot.shardMapVersion,
            snapshot.controlEpoch,
            snapshot.logicalDatabaseId,
            expectedCurrent.shardMapVersion,
            expectedCurrent.controlEpoch,
          ),
    ];

    const results = await this.db.batch(statements);
    const headResult = results[results.length - 1];
    if (!headResult || headResult.success !== true || (headResult.meta?.changes ?? 0) !== 1) {
      throw new ShardMapPublicationConflictError("shard map publication lost the compare-and-set race");
    }
  }

  async resolve(request: PlacementRequest): Promise<PlacementResult> {
    const snapshot = await this.readSnapshot(request.logicalDatabaseId, request.shardMapVersion);
    return resolvePlacement(request, snapshot.shards);
  }
}
